/**
 * Event Broadcasting Integration Tests
 *
 * Tests that all service mutations emit the correct events to the EventBus.
 * No SignalR hub needed — testing the EventBus contract and service emission.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../src/events/event-bus.js';
import { TaskEventType, createEvent } from '../../src/events/event-types.js';
import type { HubMessage } from '../../src/events/event-types.js';
import { TaskService } from '../../src/services/task-service.js';
import { CommentService } from '../../src/services/comment-service.js';
import { LinkService } from '../../src/services/link-service.js';
import { QueueService } from '../../src/services/queue-service.js';
import { DatabaseClient } from '../../src/db/client.js';
import fs from 'fs';
import path from 'path';

/**
 * Helper to create a test database + services wired to an EventBus
 */
function createTestSetup() {
  const testDbPath = path.join(
    process.cwd(),
    'data',
    `test-events-${Date.now()}-${Math.random()}.db`
  );
  const dataDir = path.dirname(testDbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new DatabaseClient(testDbPath);
  db.initialize();

  const eventBus = new EventBus();
  const taskService = new TaskService(db, eventBus);
  const commentService = new CommentService(db, eventBus);
  const linkService = new LinkService(db, eventBus);
  const queueService = new QueueService(db, eventBus);

  const events: HubMessage[] = [];
  const unsub = eventBus.on('*', (event) => events.push(event));

  const cleanup = () => {
    unsub();
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  };

  return { db, eventBus, taskService, commentService, linkService, queueService, events, cleanup };
}

describe('Event Broadcasting', () => {
  let setup: ReturnType<typeof createTestSetup>;

  beforeEach(() => {
    setup = createTestSetup();
  });

  afterEach(() => {
    setup.cleanup();
  });

  // ─── Task lifecycle events ───

  describe('Task lifecycle events', () => {
    it('should emit task-created when a task is created', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Test Task',
        description: 'Test description',
        assigned_to: 'agent-1',
        created_by: 'creator',
        priority: 5,
        tags: ['tag1', 'tag2'],
      });

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.TaskCreated);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.task).toMatchObject({ title: 'Test Task' });
    });

    it('should emit task-updated + task-status-changed when status changes', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task', assigned_to: 'agent-1' });
      setup.events.length = 0; // Clear create event

      setup.taskService.update(task.id, { status: 'working' });

      expect(setup.events).toHaveLength(2);
      expect(setup.events[0].type).toBe(TaskEventType.TaskUpdated);
      expect(setup.events[1].type).toBe(TaskEventType.TaskStatusChanged);
      expect(setup.events[1].payload.before).toBe('idle');
      expect(setup.events[1].payload.after).toBe('working');
    });

    it('should emit task-updated + task-assigned when assignee changes', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task', assigned_to: 'agent-1' });
      setup.events.length = 0;

      setup.taskService.update(task.id, { assigned_to: 'agent-2' });

      expect(setup.events).toHaveLength(2);
      expect(setup.events[0].type).toBe(TaskEventType.TaskUpdated);
      expect(setup.events[1].type).toBe(TaskEventType.TaskAssigned);
      expect(setup.events[1].payload.before).toBe('agent-1');
      expect(setup.events[1].payload.after).toBe('agent-2');
    });

    it('should emit task-updated + task-queue-changed when queue changes', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        queue_name: 'queue-1',
      });
      setup.events.length = 0;

      setup.taskService.update(task.id, { queue_name: 'queue-2' });

      expect(setup.events).toHaveLength(2);
      expect(setup.events[0].type).toBe(TaskEventType.TaskUpdated);
      expect(setup.events[1].type).toBe(TaskEventType.TaskQueueChanged);
      expect(setup.events[1].payload.before).toBe('queue-1');
      expect(setup.events[1].payload.after).toBe('queue-2');
    });

    it('should emit only task-updated when title changes (no conditional events)', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task', assigned_to: 'agent-1' });
      setup.events.length = 0;

      setup.taskService.update(task.id, { title: 'Updated Title' });

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.TaskUpdated);
      expect(setup.events[0].payload.changedFields).toContain('title');
    });

    it('should emit task-deleted when a task is deleted', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      setup.events.length = 0;

      setup.taskService.delete(task.id);

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.TaskDeleted);
      expect(setup.events[0].payload.taskId).toBe(task.id);
    });

    it('should emit task-archived when a task is archived', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      setup.events.length = 0;

      setup.taskService.archive(task.id);

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.TaskArchived);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.task).toMatchObject({ title: 'Task' });
    });
  });

  // ─── Assignment & status events ───

  describe('Assignment & status events', () => {
    it('should emit task-signed-up + task-status-changed on signup', () => {
      setup.taskService.create({ created_by: 'test-creator', title: 'Task', assigned_to: 'agent-1', status: 'idle' });
      setup.events.length = 0;

      const result = setup.taskService.signupForTask('agent-1');

      expect(result).not.toBeNull();
      expect(setup.events).toHaveLength(2);
      expect(setup.events[0].type).toBe(TaskEventType.TaskSignedUp);
      expect(setup.events[0].payload.agent).toBe('agent-1');
      expect(setup.events[1].type).toBe(TaskEventType.TaskStatusChanged);
      expect(setup.events[1].payload.before).toBe('idle');
      expect(setup.events[1].payload.after).toBe('working');
    });

    it('should emit task-transferred + comment-added on moveTask', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        status: 'idle',
      });
      setup.events.length = 0;

      setup.taskService.moveTask(task.id, 'agent-1', 'agent-2', 'Handoff comment');

      expect(setup.events).toHaveLength(2);
      expect(setup.events[0].type).toBe(TaskEventType.TaskTransferred);
      expect(setup.events[0].payload.from).toBe('agent-1');
      expect(setup.events[0].payload.to).toBe('agent-2');
      expect(setup.events[1].type).toBe(TaskEventType.CommentAdded);
      expect(setup.events[1].payload.taskId).toBe(task.id);
    });
  });

  // ─── Subtask events ───

  describe('Subtask events', () => {
    it('should emit subtask-created (and task-created) when a subtask is created', () => {
      const parent = setup.taskService.create({ created_by: 'test-creator', title: 'Parent' });
      setup.events.length = 0;

      const subtask = setup.taskService.createSubtask(parent.id, { created_by: 'test-creator', title: 'Subtask' });

      // create() emits task-created, createSubtask() additionally emits subtask-created
      expect(setup.events).toHaveLength(2);
      expect(setup.events[0].type).toBe(TaskEventType.TaskCreated);
      expect(setup.events[1].type).toBe(TaskEventType.SubtaskCreated);
      expect(setup.events[1].payload.parentId).toBe(parent.id);
      expect(setup.events[1].payload.taskId).toBe(subtask.id);
    });

    it('should emit subtask-moved when a subtask is moved', () => {
      const parent = setup.taskService.create({ created_by: 'test-creator', title: 'Parent' });
      const subtask = setup.taskService.createSubtask(parent.id, { created_by: 'test-creator', title: 'Subtask' });
      const newParent = setup.taskService.create({ created_by: 'test-creator', title: 'New Parent' });
      setup.events.length = 0;

      setup.taskService.moveSubtask(subtask.id, newParent.id);

      // update() emits task-updated, moveSubtask() additionally emits subtask-moved
      expect(setup.events).toHaveLength(2);
      expect(setup.events[0].type).toBe(TaskEventType.TaskUpdated);
      expect(setup.events[1].type).toBe(TaskEventType.SubtaskMoved);
      expect(setup.events[1].payload.oldParentId).toBe(parent.id);
      expect(setup.events[1].payload.newParentId).toBe(newParent.id);
    });
  });

  // ─── Comment events ───

  describe('Comment events', () => {
    it('should emit comment-added when a comment is created', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      setup.events.length = 0;

      const comment = setup.commentService.create({
        task_id: task.id,
        content: 'Test comment',
        created_by: 'agent-1',
      });

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.CommentAdded);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.comment.id).toBe(comment.id);
    });

    it('should emit comment-updated when a comment is updated', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      const comment = setup.commentService.create({
        task_id: task.id,
        content: 'Original',
      });
      setup.events.length = 0;

      setup.commentService.update(comment.id, 'Updated content');

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.CommentUpdated);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.commentId).toBe(comment.id);
      expect(setup.events[0].payload.before).toBe('Original');
      expect(setup.events[0].payload.after).toBe('Updated content');
    });

    it('should emit comment-deleted when a comment is deleted', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      const comment = setup.commentService.create({
        task_id: task.id,
        content: 'To be deleted',
      });
      setup.events.length = 0;

      setup.commentService.delete(comment.id);

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.CommentDeleted);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.commentId).toBe(comment.id);
    });
  });

  // ─── Link events ───

  describe('Link events', () => {
    it('should emit link-added when a link is created', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      setup.events.length = 0;

      const link = setup.linkService.create({
        task_id: task.id,
        url: 'https://example.com',
        description: 'Example',
      });

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.LinkAdded);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.link.id).toBe(link.id);
    });

    it('should emit link-updated when a link is updated', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      const link = setup.linkService.create({
        task_id: task.id,
        url: 'https://old.com',
      });
      setup.events.length = 0;

      setup.linkService.update(link.id, { url: 'https://new.com' });

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.LinkUpdated);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.linkId).toBe(link.id);
    });

    it('should emit link-deleted when a link is deleted', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      const link = setup.linkService.create({
        task_id: task.id,
        url: 'https://example.com',
      });
      setup.events.length = 0;

      setup.linkService.delete(link.id);

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.LinkDeleted);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.linkId).toBe(link.id);
    });
  });

  // ─── Queue events ───

  describe('Queue events', () => {
    it('should emit task-added-to-queue when a task is added to a queue', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task' });
      setup.events.length = 0;

      setup.queueService.addTaskToQueue(task.id, 'test-queue');

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.TaskAddedToQueue);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.queueName).toBe('test-queue');
    });

    it('should emit task-removed-from-queue with old queue name when removed', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task', queue_name: 'test-queue' });
      setup.events.length = 0;

      setup.queueService.removeTaskFromQueue(task.id);

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.TaskRemovedFromQueue);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.queueName).toBe('test-queue');
    });

    it('should emit task-queue-changed when a task is moved between queues', () => {
      const task = setup.taskService.create({ created_by: 'test-creator', title: 'Task', queue_name: 'queue-1' });
      setup.events.length = 0;

      setup.queueService.moveTaskToQueue(task.id, 'queue-2');

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.TaskQueueChanged);
      expect(setup.events[0].payload.taskId).toBe(task.id);
      expect(setup.events[0].payload.before).toBe('queue-1');
      expect(setup.events[0].payload.after).toBe('queue-2');
    });

    it('should emit queue-cleared when a queue is cleared', () => {
      setup.taskService.create({ created_by: 'test-creator', title: 'Task 1', queue_name: 'clear-queue' });
      setup.taskService.create({ created_by: 'test-creator', title: 'Task 2', queue_name: 'clear-queue' });
      setup.events.length = 0;

      const count = setup.queueService.clearQueue('clear-queue');

      expect(setup.events).toHaveLength(1);
      expect(setup.events[0].type).toBe(TaskEventType.QueueCleared);
      expect(setup.events[0].payload.queueName).toBe('clear-queue');
      expect(setup.events[0].payload.count).toBe(count);
      expect(count).toBe(2);
    });
  });

  // ─── EventBus behavior ───

  describe('EventBus behavior', () => {
    it('should not break service calls when a handler throws', () => {
      const errorBus = new EventBus();
      const taskService = new TaskService(setup.db, errorBus);

      // Register a handler that throws
      errorBus.on(TaskEventType.TaskCreated, () => {
        throw new Error('Handler error');
      });

      // Service call should succeed despite handler error
      expect(() => {
        taskService.create({ created_by: 'test-creator', title: 'Task' });
      }).not.toThrow();
    });

    it('should deliver all events to wildcard subscribers', () => {
      const bus = new EventBus();
      const received: HubMessage[] = [];
      bus.on('*', (event) => received.push(event));

      bus.emit(createEvent(TaskEventType.TaskCreated, { taskId: 1 }));
      bus.emit(createEvent(TaskEventType.CommentAdded, { taskId: 1 }));
      bus.emit(createEvent(TaskEventType.LinkDeleted, { taskId: 1, linkId: 5 }));

      expect(received).toHaveLength(3);
      expect(received[0].type).toBe(TaskEventType.TaskCreated);
      expect(received[1].type).toBe(TaskEventType.CommentAdded);
      expect(received[2].type).toBe(TaskEventType.LinkDeleted);
    });

    it('should stop receiving events after unsubscribing', () => {
      const bus = new EventBus();
      const received: HubMessage[] = [];
      const unsub = bus.on(TaskEventType.TaskCreated, (event) => received.push(event));

      bus.emit(createEvent(TaskEventType.TaskCreated, { taskId: 1 }));
      expect(received).toHaveLength(1);

      unsub();
      bus.emit(createEvent(TaskEventType.TaskCreated, { taskId: 2 }));
      expect(received).toHaveLength(1); // Still only 1
    });

    it('should work without EventBus (backward compatibility)', () => {
      const taskService = new TaskService(setup.db); // No EventBus
      expect(() => {
        const task = taskService.create({ created_by: 'test-creator', title: 'Task' });
        taskService.update(task.id, { status: 'working' });
        taskService.delete(task.id);
      }).not.toThrow();
    });
  });

  // ─── Task context fields in payloads ───

  describe('Task context fields in payloads', () => {
    /**
     * Helper: assert that a payload contains all 4 TaskContext fields.
     */
    function expectTaskContext(
      payload: Record<string, unknown>,
      expected: { assignee?: string | null; owner?: string | null; status?: string; cue?: string | null }
    ) {
      expect(payload).toHaveProperty('assignee');
      expect(payload).toHaveProperty('owner');
      expect(payload).toHaveProperty('status');
      expect(payload).toHaveProperty('cue');
      if (expected.assignee !== undefined) expect(payload.assignee).toBe(expected.assignee);
      if (expected.owner !== undefined) expect(payload.owner).toBe(expected.owner);
      if (expected.status !== undefined) expect(payload.status).toBe(expected.status);
      if (expected.cue !== undefined) expect(payload.cue).toBe(expected.cue);
    }

    it('task-created: should include assignee, owner, status, cue', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Context Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        priority: 5,
        queue_name: 'dev-queue',
      });

      const event = setup.events.find((e) => e.type === TaskEventType.TaskCreated)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
        cue: 'dev-queue',
      });
    });

    it('task-updated: should include context from the updated task', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'q1',
      });
      setup.events.length = 0;

      setup.taskService.update(task.id, { status: 'working' });

      const event = setup.events.find((e) => e.type === TaskEventType.TaskUpdated)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'working',
        cue: 'q1',
      });
    });

    it('task-status-changed: should include context', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
      });
      setup.events.length = 0;

      setup.taskService.update(task.id, { status: 'complete' });

      const event = setup.events.find((e) => e.type === TaskEventType.TaskStatusChanged)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'complete',
      });
    });

    it('task-assigned: should include context', () => {
      const task = setup.taskService.create({ title: 'Task', created_by: 'creator' });
      setup.events.length = 0;

      setup.taskService.update(task.id, { assigned_to: 'agent-2' });

      const event = setup.events.find((e) => e.type === TaskEventType.TaskAssigned)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-2',
        owner: 'creator',
        status: 'idle',
      });
    });

    it('task-queue-changed (task-service): should include context', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'q1',
      });
      setup.events.length = 0;

      setup.taskService.update(task.id, { queue_name: 'q2' });

      const event = setup.events.find((e) => e.type === TaskEventType.TaskQueueChanged)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        cue: 'q2',
      });
    });

    it('task-deleted: should include context captured before deletion', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'del-queue',
      });
      setup.events.length = 0;

      setup.taskService.delete(task.id);

      const event = setup.events.find((e) => e.type === TaskEventType.TaskDeleted)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
        cue: 'del-queue',
      });
    });

    it('task-archived: should include context', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'arch-queue',
      });
      setup.events.length = 0;

      setup.taskService.archive(task.id);

      const event = setup.events.find((e) => e.type === TaskEventType.TaskArchived)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
        cue: 'arch-queue',
      });
    });

    it('task-signed-up: should include context', () => {
      setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'signup-q',
        status: 'idle',
      });
      setup.events.length = 0;

      setup.taskService.signupForTask('agent-1');

      const event = setup.events.find((e) => e.type === TaskEventType.TaskSignedUp)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'working',
        cue: 'signup-q',
      });
    });

    it('task-transferred: should include context', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'transfer-q',
        status: 'idle',
      });
      setup.events.length = 0;

      setup.taskService.moveTask(task.id, 'agent-1', 'agent-2', 'Handoff');

      const event = setup.events.find((e) => e.type === TaskEventType.TaskTransferred)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-2',
        owner: 'creator',
        cue: 'transfer-q',
      });
    });

    it('subtask-created: should include context', () => {
      const parent = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Parent',
        assigned_to: 'agent-1',
        created_by: 'creator',
      });
      setup.events.length = 0;

      setup.taskService.createSubtask(parent.id, {
        created_by: 'test-creator',
        title: 'Subtask',
        assigned_to: 'agent-1',
        created_by: 'creator',
      });

      const event = setup.events.find((e) => e.type === TaskEventType.SubtaskCreated)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
      });
    });

    it('subtask-moved: should include context', () => {
      const parent = setup.taskService.create({ created_by: 'test-creator', title: 'Parent' });
      const subtask = setup.taskService.createSubtask(parent.id, {
        created_by: 'test-creator',
        title: 'Subtask',
        assigned_to: 'agent-1',
        created_by: 'creator',
      });
      const newParent = setup.taskService.create({ created_by: 'test-creator', title: 'New Parent' });
      setup.events.length = 0;

      setup.taskService.moveSubtask(subtask.id, newParent.id);

      const event = setup.events.find((e) => e.type === TaskEventType.SubtaskMoved)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
      });
    });

    it('comment-added: should include context fetched from DB', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'comment-q',
      });
      setup.events.length = 0;

      setup.commentService.create({
        task_id: task.id,
        content: 'Comment',
        created_by: 'commenter',
      });

      const event = setup.events.find((e) => e.type === TaskEventType.CommentAdded)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
        cue: 'comment-q',
      });
    });

    it('comment-updated: should include context fetched from DB', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
      });
      const comment = setup.commentService.create({
        task_id: task.id,
        content: 'Original',
      });
      setup.events.length = 0;

      setup.commentService.update(comment.id, 'Updated');

      const event = setup.events.find((e) => e.type === TaskEventType.CommentUpdated)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
      });
    });

    it('comment-deleted: should include context fetched from DB', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'cdel-q',
      });
      const comment = setup.commentService.create({
        task_id: task.id,
        content: 'To delete',
      });
      setup.events.length = 0;

      setup.commentService.delete(comment.id);

      const event = setup.events.find((e) => e.type === TaskEventType.CommentDeleted)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        cue: 'cdel-q',
      });
    });

    it('link-added: should include context fetched from DB', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'link-q',
      });
      setup.events.length = 0;

      setup.linkService.create({
        task_id: task.id,
        url: 'https://example.com',
      });

      const event = setup.events.find((e) => e.type === TaskEventType.LinkAdded)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
        cue: 'link-q',
      });
    });

    it('link-updated: should include context fetched from DB', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
      });
      const link = setup.linkService.create({
        task_id: task.id,
        url: 'https://old.com',
      });
      setup.events.length = 0;

      setup.linkService.update(link.id, { url: 'https://new.com' });

      const event = setup.events.find((e) => e.type === TaskEventType.LinkUpdated)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
      });
    });

    it('link-deleted: should include context fetched from DB', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'ldel-q',
      });
      const link = setup.linkService.create({
        task_id: task.id,
        url: 'https://example.com',
      });
      setup.events.length = 0;

      setup.linkService.delete(link.id);

      const event = setup.events.find((e) => e.type === TaskEventType.LinkDeleted)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        cue: 'ldel-q',
      });
    });

    it('task-added-to-queue: should include context', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
      });
      setup.events.length = 0;

      setup.queueService.addTaskToQueue(task.id, 'new-queue');

      const event = setup.events.find((e) => e.type === TaskEventType.TaskAddedToQueue)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        status: 'idle',
        cue: 'new-queue',
      });
    });

    it('task-removed-from-queue: should include context', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'rem-q',
      });
      setup.events.length = 0;

      setup.queueService.removeTaskFromQueue(task.id);

      const event = setup.events.find((e) => e.type === TaskEventType.TaskRemovedFromQueue)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        cue: null,
      });
    });

    it('task-queue-changed (queue-service): should include context', () => {
      const task = setup.taskService.create({
        created_by: 'test-creator',
        title: 'Task',
        assigned_to: 'agent-1',
        created_by: 'creator',
        queue_name: 'q1',
      });
      setup.events.length = 0;

      setup.queueService.moveTaskToQueue(task.id, 'q2');

      const event = setup.events.find((e) => e.type === TaskEventType.TaskQueueChanged)!;
      expectTaskContext(event.payload, {
        assignee: 'agent-1',
        owner: 'creator',
        cue: 'q2',
      });
    });

    it('queue-cleared: should NOT include task context (no single task)', () => {
      setup.taskService.create({ created_by: 'test-creator', title: 'T1', queue_name: 'clear-q' });
      setup.taskService.create({ created_by: 'test-creator', title: 'T2', queue_name: 'clear-q' });
      setup.events.length = 0;

      setup.queueService.clearQueue('clear-q');

      const event = setup.events.find((e) => e.type === TaskEventType.QueueCleared)!;
      expect(event.payload).not.toHaveProperty('assignee');
      expect(event.payload).not.toHaveProperty('owner');
      expect(event.payload).not.toHaveProperty('status');
      expect(event.payload).not.toHaveProperty('cue');
    });
  });

  // ─── Hub message schema conformance ───

  describe('Hub message schema conformance', () => {
    it('should produce events conforming to the hub message schema', () => {
      setup.taskService.create({
        created_by: 'test-creator',
        title: 'Schema Test',
        assigned_to: 'agent-1',
        tags: ['test'],
      });

      for (const event of setup.events) {
        // type: non-empty string, matches ^[a-zA-Z0-9_-]+$, max 50 chars
        expect(event.type).toMatch(/^[a-zA-Z0-9_-]+$/);
        expect(event.type.length).toBeLessThanOrEqual(50);

        // timestamp: valid ISO 8601
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(new Date(event.timestamp).toString()).not.toBe('Invalid Date');

        // payload: is an object
        expect(typeof event.payload).toBe('object');
        expect(event.payload).not.toBeNull();

        // metadata: source = 'tinytask', priority = 'normal'
        expect(event.metadata).toBeDefined();
        expect(event.metadata!.source).toBe('tinytask');
        expect(event.metadata!.priority).toBe('normal');
      }
    });
  });
});
