# Execution Plan: SignalR Event Broadcasting

> **Branch:** `feature/signalr-event-broadcasting`
> **Author:** tko-sword
> **Date:** 2026-07-28
> **Status:** Draft — Awaiting Review
> **Prerequisite docs:** `docs/plans/signalr-event-broadcasting.md` (original architecture plan), `agent-hub-client-manual.md` (hub API reference)

---

## 0. Changes from Original Plan (Driven by Hub Manual)

The agent-hub client manual revealed several constraints that modify the original architecture plan:

| Original Plan | Revised (Per Hub Manual) |
|---|---|
| Custom `TaskEvent` envelope: `{ type, timestamp, taskId, data, source }` | Hub schema: `{ type, timestamp, payload, metadata }` — `payload` carries taskId + entity data, `metadata` carries source/priority |
| Event types with dot notation: `task.created` | Hub regex `^[a-zA-Z0-9_-]+$` — use hyphen: `task-created` |
| Single method: `BroadcastTaskEvent(event)` | Hub has 3 delivery methods: `BroadcastMessage(msg)`, `SendToGroup(group, msg)`, `SendToClient(clientId, msg)`. Default to `BroadcastMessage`; optionally join a group and use `SendToGroup` for targeted delivery |
| No rate limiting awareness | Hub enforces 60 msg/min, burst 10. Broadcaster must queue + drain to avoid violations |
| `TINYTASK_SIGNALR_METHOD` env var | Method is always `BroadcastMessage` (or `SendToGroup` if group configured). No custom method name needed |
| Broadcaster connects, invokes, done | Broadcaster must: build `HubConnection`, `start()`, optionally `JoinGroup`, handle `ValidationError`/`Error` server events, handle reconnection via `onreconnected` (rejoin groups) |

---

## Phase 1: Event Infrastructure

### Story 1: Event Types & Schema (`src/events/event-types.ts`)

**File:** `src/events/event-types.ts` (new)

**What:**
Define all event types, the hub-conformant message envelope, and payload type mappings.

**Hub message schema (must conform):**
```typescript
interface HubMessage {
  type: string;              // Pattern: ^[a-zA-Z0-9_-]+$, max 50 chars
  timestamp: string;         // ISO 8601
  payload: Record<string, unknown>;  // Task ID + entity snapshot + change details
  metadata?: {
    priority?: 'low' | 'normal' | 'high';
    ttl?: number;            // Seconds, 1–86400
    source?: string;         // e.g. 'tinytask', max 100 chars
    correlationId?: string;  // Optional, max 100 chars
  };
}
```

**Event type enum (hyphen notation, hub-compliant):**

```typescript
export enum TaskEventType {
  // Task lifecycle
  TaskCreated = 'task-created',
  TaskUpdated = 'task-updated',
  TaskDeleted = 'task-deleted',
  TaskArchived = 'task-archived',
  // Assignment & status
  TaskStatusChanged = 'task-status-changed',
  TaskAssigned = 'task-assigned',
  TaskTransferred = 'task-transferred',
  TaskSignedUp = 'task-signed-up',
  // Queue operations
  TaskQueueChanged = 'task-queue-changed',
  TaskAddedToQueue = 'task-added-to-queue',
  TaskRemovedFromQueue = 'task-removed-from-queue',
  QueueCleared = 'queue-cleared',
  // Subtask operations
  SubtaskCreated = 'subtask-created',
  SubtaskMoved = 'subtask-moved',
  // Comment operations
  CommentAdded = 'comment-added',
  CommentUpdated = 'comment-updated',
  CommentDeleted = 'comment-deleted',
  // Link operations
  LinkAdded = 'link-added',
  LinkUpdated = 'link-updated',
  LinkDeleted = 'link-deleted',
}
```

**Payload interfaces** — one per event type, all including `taskId`:

| Event | Payload Fields |
|---|---|
| `task-created` | `taskId`, `task: ParsedTask` |
| `task-updated` | `taskId`, `before: Partial<ParsedTask>`, `after: ParsedTask`, `changedFields: string[]` |
| `task-deleted` | `taskId` |
| `task-archived` | `taskId`, `task: ParsedTask` |
| `task-status-changed` | `taskId`, `before: TaskStatus`, `after: TaskStatus` |
| `task-assigned` | `taskId`, `before: string \| null`, `after: string \| null` |
| `task-transferred` | `taskId`, `from: string`, `to: string`, `comment: string` |
| `task-signed-up` | `taskId`, `agent: string` |
| `task-queue-changed` | `taskId`, `before: string \| null`, `after: string \| null` |
| `task-added-to-queue` | `taskId`, `queueName: string` |
| `task-removed-from-queue` | `taskId`, `queueName: string \| null` |
| `queue-cleared` | `queueName`, `count: number` |
| `subtask-created` | `taskId`, `parentId`, `task: ParsedTask` |
| `subtask-moved` | `taskId`, `oldParentId: number \| null`, `newParentId: number \| null` |
| `comment-added` | `taskId`, `comment: CommentData` |
| `comment-updated` | `taskId`, `commentId`, `before: string`, `after: string` |
| `comment-deleted` | `taskId`, `commentId` |
| `link-added` | `taskId`, `link: LinkData` |
| `link-updated` | `taskId`, `linkId`, `before: Partial<LinkData>`, `after: LinkData` |
| `link-deleted` | `taskId`, `linkId` |

**Factory function:** `createEvent(type, payload, metadata?)` → `HubMessage` — stamps `timestamp`, sets `metadata.source = 'tinytask'`, `metadata.priority = 'normal'` by default.

**Dependencies:** Imports `ParsedTask`, `CommentData`, `LinkData`, `TaskStatus` from `src/types/index.js`.

**Done when:**
- File compiles with `tsc`
- All 21 event types defined
- `createEvent` factory produces hub-schema-compliant messages
- No `any` types

---

### Story 2: EventBus (`src/events/event-bus.ts`)

**File:** `src/events/event-bus.ts` (new)

**What:**
Lightweight typed in-process event emitter. No external dependencies.

**API:**
```typescript
class EventBus {
  // Subscribe to a specific event type or '*' for all
  on(type: TaskEventType | '*', handler: (event: HubMessage) => void): () => void;
  // Emit an event to all matching subscribers
  emit(event: HubMessage): void;
  // Remove all subscribers (for tests)
  clear(): void;
}
```

**Behavior:**
- Synchronous emit — handlers called immediately in subscription order
- Handler errors are caught, logged via `logger`, and do not block subsequent handlers or the caller
- `on()` returns an unsubscribe function
- Instance-based (not singleton) — for testability
- `'*'` subscribers receive all events

**Dependencies:** `logger` from `src/utils/index.js`, `TaskEventType` and `HubMessage` from `event-types.ts`

**Done when:**
- File compiles
- Handler throw doesn't break emit or service call
- Wildcard subscription works
- Unsubscribe function works

---

### Story 3: SignalR Broadcaster (`src/events/signalr-broadcaster.ts`)

**File:** `src/events/signalr-broadcaster.ts` (new)

**What:**
SignalR client that connects to the external hub and forwards events. Uses `@microsoft/signalr`.

**Key design points (per hub manual):**

1. **Connection:** `HubConnectionBuilder().withUrl(hubUrl).withAutomaticReconnect([0, 2000, 10000, 30000]).configureLogging(LogLevel).build()`

2. **Delivery method:** Configurable via env:
   - Default: `BroadcastMessage(message)` — broadcast to all connected clients
   - If `TINYTASK_SIGNALR_GROUP` is set: join the group on connect, use `SendToGroup(groupName, message)`
   - On reconnect (`onreconnected`): rejoin the group

3. **Rate limiting:** Hub enforces 60 msg/min, burst 10. The broadcaster maintains an internal queue:
   - If `connection.state === Connected`: invoke immediately, tracking a sliding-window counter
   - If sending would exceed 10 burst / 60 per minute: queue the message, drain via `setInterval`
   - If `connection.state !== Connected`: queue the message, drain on reconnect
   - Queue has a max size (default 500, configurable). If exceeded, log warning and drop oldest

4. **Server event handlers:**
   - `ValidationError` → log error with details
   - `Error` → log error message, check for rate-limit messages
   - `onreconnecting` → log warning, switch to queue mode
   - `onreconnected` → log info, rejoin group if configured, drain queue
   - `onclose` → log error, switch to queue mode

5. **Graceful degradation:** If `start()` fails, log error and set state to disconnected. Events are queued. A retry timer attempts reconnection every `reconnectDelay` ms (default 5000).

6. **Dynamic import:** `@microsoft/signalr` is dynamically imported in `index.ts` only when `TINYTASK_SIGNALR_HUB_URL` is set. The broadcaster file itself uses static imports (it's only loaded when needed).

**API:**
```typescript
interface SignalRBroadcasterOptions {
  hubUrl: string;
  group?: string;              // If set, join group + use SendToGroup
  logLevel?: 'Information' | 'Warning' | 'Error';
  maxQueueSize?: number;       // Default 500
  rateLimitPerMinute?: number; // Default 60
  rateLimitBurst?: number;     // Default 10
}

class SignalRBroadcaster {
  constructor(options: SignalRBroadcasterOptions);
  async start(): Promise<void>;
  async stop(): Promise<void>;
  broadcast(event: HubMessage): void;  // Non-blocking, queues if needed
  get isConnected(): boolean;
  get queueLength(): number;
}
```

**Dependencies:** `@microsoft/signalr`, `HubMessage` from `event-types.ts`, `logger` from `src/utils/index.js`

**Done when:**
- Connects to hub, handles reconnection
- Joins group if configured, rejoins on reconnect
- Rate-limited queue works (doesn't exceed burst/per-minute limits)
- Server error events are logged
- `broadcast()` is non-blocking — never throws, never blocks caller
- Graceful degradation when hub unreachable

---

### Story 4: Module Exports (`src/events/index.ts`)

**File:** `src/events/index.ts` (new)

**What:** Re-export `EventBus`, `SignalRBroadcaster`, `SignalRBroadcasterOptions`, all types from `event-types.ts`.

**Done when:** File compiles, all public symbols exported.

---

## Phase 2: Wire into Services

### Story 5: TaskService Event Emission

**File:** `src/services/task-service.ts` (modify)

**What:**
Add optional `eventBus` parameter to constructor. After each successful mutation, emit the corresponding event(s).

**Constructor change:**
```typescript
constructor(private db: DatabaseClient, private eventBus?: EventBus) {}
```

**Emission points (after transaction returns, not inside):**

| Method | Events Emitted | Payload Source |
|---|---|---|
| `create()` | `task-created` | returned `ParsedTask` |
| `update()` | `task-updated` (always) | `before` = existing task pre-update, `after` = returned task, `changedFields` = Object.keys of changed fields |
| | `task-status-changed` (if `status` changed) | `before`/`after` status values |
| | `task-assigned` (if `assigned_to` changed) | `before`/`after` assignee values |
| | `task-queue-changed` (if `queue_name` changed) | `before`/`after` queue values |
| `delete()` | `task-deleted` | `taskId` |
| `archive()` | `task-archived` | returned `ParsedTask` |
| `signupForTask()` | `task-signed-up` + `task-status-changed` | agent name, before=`idle`, after=`working` |
| `moveTask()` | `task-transferred` + `comment-added` | from/to agents, comment content |
| `createSubtask()` | `subtask-created` | subtaskId, parentId, task |
| `moveSubtask()` | `subtask-moved` | subtaskId, old/new parentId |

**Key implementation detail for `update()`:** Capture `existing` (the task before update) inside the method, before the DB write. After the transaction returns `updated`, diff the fields to determine which conditional events to emit.

**Guard:** `if (!this.eventBus) return;` at the top of each emit block. No-op when EventBus not provided.

**Done when:**
- All 11 emission points implemented
- Events emit only on success (after transaction)
- Existing tests pass unchanged (eventBus is undefined → no-op)
- No `any` types

---

### Story 6: CommentService Event Emission

**File:** `src/services/comment-service.ts` (modify)

**What:** Add optional `eventBus` param. Emit after mutations.

| Method | Event | Payload |
|---|---|---|
| `create()` | `comment-added` | `taskId`, `comment: CommentData` |
| `update()` | `comment-updated` | `taskId`, `commentId`, `before` (old content), `after` (new content) |
| `delete()` | `comment-deleted` | `taskId`, `commentId` |

**Note:** `delete()` currently takes only `id` — needs to query the comment's `task_id` before deleting (it already throws if not found, so we can capture the task_id from the existing lookup).

**Done when:** 3 emission points, existing tests pass, no `any`.

---

### Story 7: LinkService Event Emission

**File:** `src/services/link-service.ts` (modify)

**What:** Add optional `eventBus` param. Emit after mutations.

| Method | Event | Payload |
|---|---|---|
| `create()` | `link-added` | `taskId`, `link: LinkData` |
| `update()` | `link-updated` | `taskId`, `linkId`, `before: Partial<LinkData>`, `after: LinkData` |
| `delete()` | `link-deleted` | `taskId`, `linkId` |

**Note:** `delete()` currently takes only `id` — needs to query `task_id` before deleting.

**Done when:** 3 emission points, existing tests pass, no `any`.

---

### Story 8: QueueService Event Emission

**File:** `src/services/queue-service.ts` (modify)

**What:** Add optional `eventBus` param. Emit after mutations.

| Method | Event | Payload |
|---|---|---|
| `addTaskToQueue()` | `task-added-to-queue` | `taskId`, `queueName` |
| `removeTaskFromQueue()` | `task-removed-from-queue` | `taskId`, `queueName` (the old queue, captured before nulling) |
| `moveTaskToQueue()` | `task-queue-changed` | `taskId`, `before` (old queue), `after` (new queue) |
| `clearQueue()` | `queue-cleared` | `queueName`, `count` (returned from method) |

**Note:** `removeTaskFromQueue()` and `moveTaskToQueue()` need to capture the old `queue_name` before the DB update.

**Done when:** 4 emission points, existing tests pass, no `any`.

---

## Phase 3: Bootstrap & Config

### Story 9: Wire EventBus + SignalR into `index.ts`

**File:** `src/index.ts` (modify)

**What:**
1. Import `EventBus` (static) and `SignalRBroadcaster` (dynamic, only if hub URL configured)
2. Create `EventBus` instance after DB init
3. If `TINYTASK_SIGNALR_HUB_URL` is set:
   - Dynamic `import('@microsoft/signalr')` is handled inside `SignalRBroadcaster` (or the broadcaster is dynamically imported)
   - Create `SignalRBroadcaster` with options from env vars
   - `await broadcaster.start()`
   - Subscribe to EventBus: `eventBus.on('*', (event) => broadcaster.broadcast(event))`
4. Pass `eventBus` to all 4 service constructors
5. Update startup banner to show SignalR config

**New env vars:**

| Variable | Default | Description |
|---|---|---|
| `TINYTASK_SIGNALR_HUB_URL` | (unset) | Hub URL, e.g. `http://localhost:8080/messagehub`. If unset, no SignalR — events still emit to local EventBus only |
| `TINYTASK_SIGNALR_GROUP` | (unset) | Group name to join. If set, uses `SendToGroup` instead of `BroadcastMessage` |
| `TINYTASK_SIGNALR_LOG_LEVEL` | `Information` | SignalR client log level |
| `TINYTASK_SIGNALR_MAX_QUEUE` | `500` | Max buffered events when disconnected/rate-limited |
| `TINYTASK_SIGNALR_RECONNECT_DELAY` | `5000` | Retry delay (ms) if initial connection fails |

**Done when:**
- Server starts with and without SignalR configured
- EventBus created and passed to all services
- Broadcaster started, subscribed to all events
- Startup banner shows SignalR status
- Graceful shutdown stops the broadcaster

---

### Story 10: Update AGENTS.md

**File:** `AGENTS.md` (modify)

**What:** Add new env vars to the Environment Variables section:

```
- `TINYTASK_SIGNALR_HUB_URL`: SignalR hub URL for event broadcasting (e.g., http://localhost:8080/messagehub). If unset, broadcasting is disabled.
- `TINYTASK_SIGNALR_GROUP`: Optional group name. If set, events are sent via SendToGroup instead of BroadcastMessage.
- `TINYTASK_SIGNALR_LOG_LEVEL`: SignalR client log level (default: Information)
- `TINYTASK_SIGNALR_MAX_QUEUE`: Max buffered events when disconnected or rate-limited (default: 500)
- `TINYTASK_SIGNALR_RECONNECT_DELAY`: Retry delay in ms for initial connection failure (default: 5000)
```

**Done when:** AGENTS.md updated, no other changes to the file.

---

## Phase 4: Tests

### Story 11: Event Broadcasting Integration Tests

**File:** `tests/integration/event-broadcasting.test.ts` (new)

**What:** Comprehensive tests for event emission from all services.

**Test approach:**
- Instantiate `EventBus`, subscribe with a collector array
- Instantiate services with `new TaskService(db, eventBus)` etc.
- Call mutation methods, assert correct events emitted
- No SignalR hub needed — testing the EventBus contract and service emission

**Test cases:**

| # | Test | Validates |
|---|---|---|
| 1 | Task created → `task-created` with full task payload | Type, payload shape, taskId |
| 2 | Task updated (status) → `task-updated` + `task-status-changed` | Multiple events from one mutation |
| 3 | Task updated (assignee) → `task-updated` + `task-assigned` | Conditional event |
| 4 | Task updated (queue) → `task-updated` + `task-queue-changed` | Conditional event |
| 5 | Task updated (title only) → `task-updated` only, no conditional events | No false conditional events |
| 6 | Task deleted → `task-deleted` | Correct type, taskId in payload |
| 7 | Task archived → `task-archived` | Correct type, full task in payload |
| 8 | Signup → `task-signed-up` + `task-status-changed` | Compound event from one call |
| 9 | Move task → `task-transferred` + `comment-added` | Cross-entity event (task + comment) |
| 10 | Comment created → `comment-added` | CommentService, full comment in payload |
| 11 | Comment updated → `comment-updated` | Before/after content |
| 12 | Comment deleted → `comment-deleted` | taskId + commentId in payload |
| 13 | Link created → `link-added` | LinkService, full link in payload |
| 14 | Link updated → `link-updated` | Before/after in payload |
| 15 | Link deleted → `link-deleted` | taskId + linkId in payload |
| 16 | Queue add → `task-added-to-queue` | QueueService, queueName in payload |
| 17 | Queue remove → `task-removed-from-queue` | Old queueName captured before nulling |
| 18 | Queue move → `task-queue-changed` | Before/after queue names |
| 19 | Queue clear → `queue-cleared` | queueName + count in payload |
| 20 | Subtask created → `subtask-created` | parentId + task in payload |
| 21 | Subtask moved → `subtask-moved` | old/new parentId in payload |
| 22 | EventBus handler throws → service call succeeds | Error isolation |
| 23 | Wildcard `'*'` → receives all events | Wildcard subscription |
| 24 | Unsubscribe → stops receiving | Unsubscribe function |
| 25 | Services without EventBus → no crash, no events | Backward compatibility |
| 26 | All events conform to hub message schema | type matches regex, timestamp is ISO 8601, payload is object, metadata.source = 'tinytask' |

**Done when:**
- All 26 tests pass
- `npm test` passes (existing + new)
- No flaky tests

---

## Phase 5: Quality Gate

### Story 12: Lint, Format, Full Test Suite, PR

**What:**
1. `npm run lint` — zero warnings
2. `npm run format` — all files formatted
3. `npm run build` — compiles clean
4. `npm test` — all existing + new tests pass
5. Commit with conventional commit message
6. Push to `origin/feature/signalr-event-broadcasting`
7. Create PR with summary of changes

**Done when:** PR is open, CI is green (or local equivalent passes).

---

## Execution Order & Dependencies

```
Story 1 (event-types) ──┬──► Story 2 (event-bus) ──► Story 3 (signalr-broadcaster) ──► Story 4 (index)
                        │                                                                    │
                        └──► Story 5 (task-service) ──┐                                       │
                        ├──► Story 6 (comment-service) ─┤                                      │
                        ├──► Story 7 (link-service) ────┤──► Story 9 (bootstrap) ──► Story 10 (agents.md)
                        └──► Story 8 (queue-service) ───┘                    │
                                                                       └──► Story 11 (tests) ──► Story 12 (quality gate)
```

**Parallelizable:** Stories 5–8 can be done in parallel (different files, no conflicts). Stories 1–4 are sequential.

---

## File Summary

| File | Action | Stories |
|---|---|---|
| `src/events/event-types.ts` | New | 1 |
| `src/events/event-bus.ts` | New | 2 |
| `src/events/signalr-broadcaster.ts` | New | 3 |
| `src/events/index.ts` | New | 4 |
| `src/services/task-service.ts` | Modify | 5 |
| `src/services/comment-service.ts` | Modify | 6 |
| `src/services/link-service.ts` | Modify | 7 |
| `src/services/queue-service.ts` | Modify | 8 |
| `src/index.ts` | Modify | 9 |
| `AGENTS.md` | Modify | 10 |
| `tests/integration/event-broadcasting.test.ts` | New | 11 |
| `package.json` | Modify | 3 (add `@microsoft/signalr`) |

**Total:** 5 new files, 7 modified files, 1 new dependency.
