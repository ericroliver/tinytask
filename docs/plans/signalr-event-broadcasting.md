# Plan: SignalR Event Broadcasting for TinyTask

> **Branch:** `feature/signalr-event-broadcasting`
> **Author:** tko-sword
> **Date:** 2026-07-28
> **Status:** Draft — Awaiting Review

---

## 1. Goal

Add the ability to broadcast task events to a SignalR hub so that external clients (dashboards, monitors, other agents) can receive real-time notifications when tasks are created, updated, deleted, archived, moved between queues, commented on, etc.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     TinyTask Server                          │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  MCP    │  │  REST   │  │  SSE    │  │Streamable│       │
│  │ Tools   │  │  Router  │  │ Server  │  │   HTTP   │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │            │            │            │              │
│       v            v            v            v              │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Service Layer                       │       │
│  │  TaskService  CommentService  LinkService        │       │
│  │  QueueService                                    │       │
│  └──────────────────────┬──────────────────────────┘       │
│                         │                                   │
│                    ┌────v────┐                               │
│                    │EventBus │  (new — in-process emitter)  │
│                    └────┬────┘                               │
│                         │                                   │
│                    ┌────v────┐                               │
│                    │SignalR  │  (new — @microsoft/signalr)  │
│                    │Hub Conn │                               │
│                    └────┬────┘                               │
│                         │                                   │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          v
              ┌───────────────────┐
              │  External SignalR │
              │  Hub (ASP.NET)     │
              │  e.g. Shogun       │
              └───────────────────┘
```

### Key Design Decision: Client Mode

TinyTask acts as a **SignalR client**, not a hub host. The external ASP.NET hub (e.g., Shogun) hosts the hub endpoint. TinyTask connects to it and invokes methods to broadcast events. This fits the existing architecture where TinyTask is a service that other systems consume from.

If `TINYTASK_SIGNALR_HUB_URL` is not set, the EventBus still emits events locally (no-op for SignalR). This allows future local subscribers (e.g., SSE event streaming) without requiring a SignalR hub.

---

## 3. Event Types

All events follow a common envelope:

```typescript
interface TaskEvent {
  type: TaskEventType;
  timestamp: string;       // ISO 8601
  taskId: number;
  data: unknown;           // Type-specific payload (see below)
  source?: string;         // 'mcp' | 'rest' | 'internal'
}

enum TaskEventType {
  // Task lifecycle
  TaskCreated = 'task.created',
  TaskUpdated = 'task.updated',
  TaskDeleted = 'task.deleted',
  TaskArchived = 'task.archived',

  // Assignment & status
  TaskStatusChanged = 'task.status-changed',
  TaskAssigned = 'task.assigned',
  TaskTransferred = 'task.transferred',
  TaskSignedUp = 'task.signed-up',

  // Queue operations
  TaskQueueChanged = 'task.queue-changed',
  TaskAddedToQueue = 'task.added-to-queue',
  TaskRemovedFromQueue = 'task.removed-from-queue',
  QueueCleared = 'queue.cleared',

  // Subtask operations
  SubtaskCreated = 'subtask.created',
  SubtaskMoved = 'subtask.moved',

  // Comment operations
  CommentAdded = 'comment.added',
  CommentUpdated = 'comment.updated',
  CommentDeleted = 'comment.deleted',

  // Link operations
  LinkAdded = 'link.added',
  LinkUpdated = 'link.updated',
  LinkDeleted = 'link.deleted',
}
```

### Event Payloads

Each event's `data` field carries the relevant entity snapshot:

| Event Type | Data Payload |
|---|---|
| `task.created` | `ParsedTask` — full task object |
| `task.updated` | `{ before: Partial<ParsedTask>, after: ParsedTask, changedFields: string[] }` |
| `task.deleted` | `{ taskId: number }` |
| `task.archived` | `ParsedTask` — archived task |
| `task.status-changed` | `{ taskId: number, before: TaskStatus, after: TaskStatus }` |
| `task.assigned` | `{ taskId: number, before: string \| null, after: string \| null }` |
| `task.transferred` | `{ taskId: number, from: string, to: string, comment: string }` |
| `task.signed-up` | `{ taskId: number, agent: string }` |
| `task.queue-changed` | `{ taskId: number, before: string \| null, after: string \| null }` |
| `task.added-to-queue` | `{ taskId: number, queueName: string }` |
| `task.removed-from-queue` | `{ taskId: number, queueName: string \| null }` |
| `queue.cleared` | `{ queueName: string, count: number }` |
| `subtask.created` | `{ subtaskId: number, parentId: number, task: ParsedTask }` |
| `subtask.moved` | `{ subtaskId: number, oldParentId: number \| null, newParentId: number \| null }` |
| `comment.added` | `CommentData` — full comment object |
| `comment.updated` | `{ commentId: number, taskId: number, before: string, after: string }` |
| `comment.deleted` | `{ commentId: number, taskId: number }` |
| `link.added` | `LinkData` — full link object |
| `link.updated` | `{ linkId: number, taskId: number, before: Partial<LinkData>, after: LinkData }` |
| `link.deleted` | `{ linkId: number, taskId: number }` |

---

## 4. Implementation Plan

### Phase 1: Event Infrastructure (new files)

#### 4.1 `src/events/event-bus.ts` — In-process event emitter

A lightweight typed EventEmitter wrapper. No external dependencies.

```typescript
// Key responsibilities:
// - emit(event: TaskEvent): void
// - on(type: TaskEventType | '*', handler: (event: TaskEvent) => void): () => void  // returns unsubscribe
// - Singleton or instance-based (instance-based for testability)
```

Design:
- Instance-based (not singleton) — injected into services via constructor
- Synchronous emit (services call emit after successful DB writes within the same transaction block)
- Handlers are called synchronously — if a handler throws, log the error and continue (don't break the service call)
- Supports wildcard `'*'` subscription for logging/debugging

#### 4.2 `src/events/event-types.ts` — Type definitions

All event types, the `TaskEvent` interface, `TaskEventType` enum, and payload type mappings.

#### 4.3 `src/events/signalr-broadcaster.ts` — SignalR client

Connects to an external SignalR hub and forwards events.

```typescript
// Key responsibilities:
// - Connect to hub URL (configurable via env)
// - Reconnect with backoff on disconnect
// - Forward events via hub invocation: hubConnection.invoke('BroadcastTaskEvent', event)
// - Graceful degradation: if not connected, log warning and drop event (don't block service calls)
// - Optional: buffer events during reconnect (configurable, default off)
```

Dependency: `@microsoft/signalr` npm package.

#### 4.4 `src/events/index.ts` — Module exports

---

### Phase 2: Wire EventBus into Services

#### 4.5 Modify `TaskService`

- Add `eventBus` parameter to constructor: `constructor(private db: DatabaseClient, private eventBus?: EventBus)`
- After each mutation method's successful return, emit the corresponding event:
  - `create()` → emit `task.created`
  - `update()` → emit `task.updated` + conditionally `task.status-changed`, `task.assigned`, `task.queue-changed` (based on changed fields)
  - `delete()` → emit `task.deleted`
  - `archive()` → emit `task.archived`
  - `signupForTask()` → emit `task.signed-up` + `task.status-changed`
  - `moveTask()` → emit `task.transferred` + `comment.added`
  - `createSubtask()` → emit `subtask.created`
  - `moveSubtask()` → emit `subtask.moved`

Key principle: emit **after** the transaction commits, not inside it. The service methods return from `db.transaction()` — emit immediately after, using the returned data. This ensures we only broadcast events for successful operations.

#### 4.6 Modify `CommentService`

- Add `eventBus` constructor parameter
- `create()` → emit `comment.added`
- `update()` → emit `comment.updated`
- `delete()` → emit `comment.deleted`

#### 4.7 Modify `LinkService`

- Add `eventBus` constructor parameter
- `create()` → emit `link.added`
- `update()` → emit `link.updated`
- `delete()` → emit `link.deleted`

#### 4.8 Modify `QueueService`

- Add `eventBus` constructor parameter
- `addTaskToQueue()` → emit `task.added-to-queue`
- `removeTaskFromQueue()` → emit `task.removed-from-queue`
- `moveTaskToQueue()` → emit `task.queue-changed`
- `clearQueue()` → emit `queue.cleared`

---

### Phase 3: Wire into Server Bootstrap

#### 4.9 Modify `src/index.ts`

```typescript
// After services are created:
import { EventBus } from './events/index.js';
import { SignalRBroadcaster } from './events/index.js';

const eventBus = new EventBus();

// Optionally connect to SignalR hub
const signalrHubUrl = process.env.TINYTASK_SIGNALR_HUB_URL;
if (signalrHubUrl) {
  const broadcaster = new SignalRBroadcaster(signalrHubUrl, {
    methodName: process.env.TINYTASK_SIGNALR_METHOD || 'BroadcastTaskEvent',
    reconnectDelay: parseInt(process.env.TINYTASK_SIGNALR_RECONNECT_DELAY || '5000', 10),
  });
  eventBus.on('*', (event) => broadcaster.broadcast(event));
  await broadcaster.start();
}

// Pass eventBus to all services:
const taskService = new TaskService(db, eventBus);
const commentService = new CommentService(db, eventBus);
const linkService = new LinkService(db, eventBus);
const queueService = new QueueService(db, eventBus);
```

---

### Phase 4: Environment Configuration

New environment variables:

| Variable | Default | Description |
|---|---|---|
| `TINYTASK_SIGNALR_HUB_URL` | (none) | SignalR hub URL. If unset, broadcasting is disabled (events still emit locally) |
| `TINYTASK_SIGNALR_METHOD` | `BroadcastTaskEvent` | Hub method name to invoke |
| `TINYTASK_SIGNALR_RECONNECT_DELAY` | `5000` | Reconnect delay in ms |
| `TINYTASK_SIGNALR_LOG_LEVEL` | `info` | Broadcaster log level |

Add these to the startup banner in `index.ts` and document in `AGENTS.md`.

---

### Phase 5: Tests

#### 4.10 `tests/integration/event-broadcasting.test.ts`

Test cases:

| # | Test | Validates |
|---|---|---|
| 1 | Task created → `task.created` event emitted with full task payload | Event type, data shape |
| 2 | Task updated (status change) → `task.updated` + `task.status-changed` | Multiple events from one mutation |
| 3 | Task updated (assignee change) → `task.updated` + `task.assigned` | Conditional events |
| 4 | Task updated (queue change) → `task.updated` + `task.queue-changed` | Conditional events |
| 5 | Task deleted → `task.deleted` | Correct event |
| 6 | Task archived → `task.archived` | Correct event |
| 7 | Signup → `task.signed-up` + `task.status-changed` | Compound event |
| 8 | Move task → `task.transferred` + `comment.added` | Cross-service event |
| 9 | Comment added/updated/deleted → respective events | CommentService events |
| 10 | Link added/updated/deleted → respective events | LinkService events |
| 11 | Queue add/remove/move → respective events | QueueService events |
| 12 | Queue cleared → `queue.cleared` with count | Bulk event |
| 13 | EventBus without SignalR → no crash, events still emit locally | Graceful degradation |
| 14 | EventBus handler throws → doesn't break service call | Error isolation |
| 15 | Wildcard `'*'` subscription → receives all events | Wildcard support |

Testing approach: instantiate `EventBus` directly, subscribe, call service methods, assert events received via `vitest`'s `expect()`. No need to mock SignalR — test the EventBus contract. SignalR broadcaster is tested separately (or just with a mock hub connection).

---

## 5. Files Changed Summary

| File | Action | Description |
|---|---|---|
| `src/events/event-types.ts` | **New** | Event types, enum, interfaces |
| `src/events/event-bus.ts` | **New** | In-process typed event emitter |
| `src/events/signalr-broadcaster.ts` | **New** | SignalR client — connects to external hub, forwards events |
| `src/events/index.ts` | **New** | Module exports |
| `src/services/task-service.ts` | **Modify** | Add `eventBus` param, emit events after mutations |
| `src/services/comment-service.ts` | **Modify** | Add `eventBus` param, emit events after mutations |
| `src/services/link-service.ts` | **Modify** | Add `eventBus` param, emit events after mutations |
| `src/services/queue-service.ts` | **Modify** | Add `eventBus` param, emit events after mutations |
| `src/index.ts` | **Modify** | Create EventBus, optionally start SignalR, pass to services |
| `tests/integration/event-broadcasting.test.ts` | **New** | Event emission tests |
| `package.json` | **Modify** | Add `@microsoft/signalr` dependency |
| `AGENTS.md` | **Modify** | Document new environment variables |

---

## 6. Design Decisions

### 6.1 Why emit after transaction, not inside?

SQLite transactions with better-sqlite3 are synchronous. If we emit inside the transaction callback and a handler throws, it could abort the transaction. By emitting after `db.transaction()` returns, we guarantee the DB write is committed before any event handler runs.

### 6.2 Why instance-based EventBus, not singleton?

Testability. Tests can create a fresh `EventBus` for each test case, subscribe, and assert events without global state leaking between tests.

### 6.3 Why SignalR client, not hub host?

TinyTask is a Node.js service. Hosting a SignalR hub requires ASP.NET. TinyTask should connect to an existing hub (like Shogun's) and invoke methods. This is the standard pattern for cross-platform SignalR integration.

If we later need a Node.js-native push mechanism (e.g., for a web dashboard), we can add a local SSE event stream endpoint that subscribes to the EventBus — no SignalR hub required.

### 6.4 Why optional `eventBus` on services?

Backward compatibility. Existing tests instantiate services with `new TaskService(db)` — no EventBus. If `eventBus` is undefined, the service simply skips event emission. This allows gradual adoption without breaking existing tests.

### 6.5 Why `@microsoft/signalr` and not `ws`?

The `@microsoft/signalr` client handles the SignalR protocol negotiation, reconnection, and hub method invocation. Using raw WebSockets would require reimplementing the protocol.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SignalR hub unreachable → service blocked | Broadcaster is fully async and non-blocking. If connection fails, events are logged and dropped. Service calls never wait on SignalR. |
| Event handler throws → service call fails | EventBus catches handler errors, logs them, and continues. Service call is unaffected. |
| Existing tests break | `eventBus` is optional. Existing tests that don't pass it continue to work unchanged. |
| `@microsoft/signalr` adds bundle size | Only loaded when `TINYTASK_SIGNALR_HUB_URL` is set. Dynamic import in `index.ts` — doesn't affect startup if unused. |
| Event ordering across services | Events are emitted synchronously in call order. If ordering matters for downstream consumers, they can use `timestamp` + `taskId` to reorder. |

---

## 8. Out of Scope (Future Work)

- **Local SSE event stream endpoint**: A `/events` SSE endpoint that streams events to browser-based dashboards. Would subscribe to EventBus. Separate PR.
- **Event persistence**: Storing events in a `task_events` table for replay. Separate PR.
- **Event filtering**: Allowing clients to subscribe to specific event types or task IDs. Would need a pub/sub layer. Separate PR.
- **SignalR authentication**: Currently assumes the hub URL is trusted. If auth is needed, add `TINYTASK_SIGNALR_AUTH_TOKEN` env var. Future PR.
- **Batching events**: If volume gets high, batch events before sending. Not needed now — event volume is low (agent-scale, not user-scale).

---

## 9. Implementation Order

1. `npm install @microsoft/signalr` + verify build
2. Create `src/events/event-types.ts`
3. Create `src/events/event-bus.ts`
4. Create `src/events/signalr-broadcaster.ts`
5. Create `src/events/index.ts`
6. Modify services (task, comment, link, queue) — add `eventBus` param + emit calls
7. Modify `src/index.ts` — bootstrap EventBus + SignalR
8. Write `tests/integration/event-broadcasting.test.ts`
9. Run `npm test` — verify all existing + new tests pass
10. Run `npm run lint` + `npm run format`
11. Update `AGENTS.md` with new env vars
12. Commit + push + PR
