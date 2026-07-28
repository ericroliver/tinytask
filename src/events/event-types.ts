/**
 * Event types and hub-conformant message schema for SignalR broadcasting
 */

import type { ParsedTask, CommentData, LinkData, TaskStatus } from '../types/index.js';

// ─── Hub Message Schema (must conform to agent-hub JSON Message Hub spec) ───

/**
 * Metadata for a hub message.
 * All fields optional per hub spec.
 */
export interface HubMessageMetadata {
  priority?: 'low' | 'normal' | 'high';
  ttl?: number; // Seconds, 1–86400
  source?: string; // e.g. 'tinytask', max 100 chars
  correlationId?: string; // Optional, max 100 chars
}

/**
 * Message envelope conforming to the SignalR JSON Message Hub schema.
 * - type: matches ^[a-zA-Z0-9_-]+$, max 50 chars
 * - timestamp: ISO 8601
 * - payload: arbitrary object carrying taskId + entity data
 * - metadata: optional priority/ttl/source/correlationId
 */
export interface HubMessage {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
  metadata?: HubMessageMetadata;
}

// ─── Event Type Enum (hub-compliant hyphen notation) ───

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

// ─── Payload Interfaces (one per event type, all include taskId) ───

export interface TaskCreatedPayload {
  taskId: number;
  task: ParsedTask;
}

export interface TaskUpdatedPayload {
  taskId: number;
  before: Partial<ParsedTask>;
  after: ParsedTask;
  changedFields: string[];
}

export interface TaskDeletedPayload {
  taskId: number;
}

export interface TaskArchivedPayload {
  taskId: number;
  task: ParsedTask;
}

export interface TaskStatusChangedPayload {
  taskId: number;
  before: TaskStatus;
  after: TaskStatus;
}

export interface TaskAssignedPayload {
  taskId: number;
  before: string | null;
  after: string | null;
}

export interface TaskTransferredPayload {
  taskId: number;
  from: string;
  to: string;
  comment: string;
}

export interface TaskSignedUpPayload {
  taskId: number;
  agent: string;
}

export interface TaskQueueChangedPayload {
  taskId: number;
  before: string | null;
  after: string | null;
}

export interface TaskAddedToQueuePayload {
  taskId: number;
  queueName: string;
}

export interface TaskRemovedFromQueuePayload {
  taskId: number;
  queueName: string | null;
}

export interface QueueClearedPayload {
  queueName: string;
  count: number;
}

export interface SubtaskCreatedPayload {
  taskId: number;
  parentId: number;
  task: ParsedTask;
}

export interface SubtaskMovedPayload {
  taskId: number;
  oldParentId: number | null;
  newParentId: number | null;
}

export interface CommentAddedPayload {
  taskId: number;
  comment: CommentData;
}

export interface CommentUpdatedPayload {
  taskId: number;
  commentId: number;
  before: string;
  after: string;
}

export interface CommentDeletedPayload {
  taskId: number;
  commentId: number;
}

export interface LinkAddedPayload {
  taskId: number;
  link: LinkData;
}

export interface LinkUpdatedPayload {
  taskId: number;
  linkId: number;
  before: Partial<LinkData>;
  after: LinkData;
}

export interface LinkDeletedPayload {
  taskId: number;
  linkId: number;
}

// ─── Factory Function ───

/**
 * Create a hub-conformant message with timestamp and default metadata.
 * @param type - Event type (from TaskEventType enum)
 * @param payload - Event-specific payload object
 * @param metadata - Optional metadata overrides
 */
export function createEvent(
  type: TaskEventType,
  payload: Record<string, unknown>,
  metadata?: Partial<HubMessageMetadata>
): HubMessage {
  return {
    type,
    timestamp: new Date().toISOString(),
    payload,
    metadata: {
      source: 'tinytask',
      priority: 'normal',
      ...metadata,
    },
  };
}
