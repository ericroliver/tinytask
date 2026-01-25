/**
 * Integration tests for task blocking feature
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/db/client.js';
import { TaskService } from '../../src/services/task-service.js';
import { unlinkSync } from 'fs';

describe('Task Blocking Feature', () => {
  let db: DatabaseClient;
  let taskService: TaskService;
  const testDbPath = './test-blocking.db';

  beforeEach(() => {
    // Create fresh database for each test
    try {
      unlinkSync(testDbPath);
    } catch {
      // File doesn't exist, that's fine
    }
    db = new DatabaseClient(testDbPath);
    db.initialize();
    taskService = new TaskService(db);
  });

  afterEach(() => {
    db.close();
    try {
      unlinkSync(testDbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Creating tasks with blocking', () => {
    it('should create a task with blocked_by_task_id', () => {
      const blockingTask = taskService.create({
        title: 'Blocking Task',
        description: 'This task blocks another',
      });

      const blockedTask = taskService.create({
        title: 'Blocked Task',
        description: 'This task is blocked',
        blocked_by_task_id: blockingTask.id,
      });

      expect(blockedTask.blocked_by_task_id).toBe(blockingTask.id);
      expect(blockedTask.is_currently_blocked).toBe(true);
    });

    it('should throw error if blocking task does not exist', () => {
      expect(() => {
        taskService.create({
          title: 'Blocked Task',
          blocked_by_task_id: 999,
        });
      }).toThrow('Blocking task not found: 999');
    });

    it('should allow creating task without blocked_by_task_id', () => {
      const task = taskService.create({
        title: 'Normal Task',
      });

      expect(task.blocked_by_task_id).toBeNull();
      expect(task.is_currently_blocked).toBe(false);
    });
  });

  describe('Updating tasks with blocking', () => {
    it('should allow setting blocked_by_task_id on existing task', () => {
      const blockingTask = taskService.create({ title: 'Blocker' });
      const task = taskService.create({ title: 'Task' });

      const updated = taskService.update(task.id, {
        blocked_by_task_id: blockingTask.id,
      });

      expect(updated.blocked_by_task_id).toBe(blockingTask.id);
      expect(updated.is_currently_blocked).toBe(true);
    });

    it('should allow clearing blocked_by_task_id', () => {
      const blockingTask = taskService.create({ title: 'Blocker' });
      const task = taskService.create({
        title: 'Task',
        blocked_by_task_id: blockingTask.id,
      });

      const updated = taskService.update(task.id, {
        blocked_by_task_id: null,
      });

      expect(updated.blocked_by_task_id).toBeNull();
      expect(updated.is_currently_blocked).toBe(false);
    });

    it('should prevent task from blocking itself', () => {
      const task = taskService.create({ title: 'Task' });

      expect(() => {
        taskService.update(task.id, {
          blocked_by_task_id: task.id,
        });
      }).toThrow('Task cannot be blocked by itself');
    });

    it('should prevent circular blocking (A blocks B, B blocks A)', () => {
      const taskA = taskService.create({ title: 'Task A' });
      const taskB = taskService.create({
        title: 'Task B',
        blocked_by_task_id: taskA.id,
      });

      expect(() => {
        taskService.update(taskA.id, {
          blocked_by_task_id: taskB.id,
        });
      }).toThrow('Cannot create circular blocking relationship');
    });

    it('should throw error if blocking task does not exist', () => {
      const task = taskService.create({ title: 'Task' });

      expect(() => {
        taskService.update(task.id, {
          blocked_by_task_id: 999,
        });
      }).toThrow('Blocking task not found: 999');
    });
  });

  describe('Blocking state computation', () => {
    it('should mark task as blocked when blocking task is idle', () => {
      const blockingTask = taskService.create({
        title: 'Blocker',
        status: 'idle',
      });
      const blockedTask = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blockingTask.id,
      });

      expect(blockedTask.is_currently_blocked).toBe(true);
    });

    it('should mark task as blocked when blocking task is working', () => {
      const blockingTask = taskService.create({
        title: 'Blocker',
        status: 'working',
      });
      const blockedTask = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blockingTask.id,
      });

      expect(blockedTask.is_currently_blocked).toBe(true);
    });

    it('should mark task as unblocked when blocking task is complete', () => {
      const blockingTask = taskService.create({
        title: 'Blocker',
        status: 'complete',
      });
      const blockedTask = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blockingTask.id,
      });

      expect(blockedTask.is_currently_blocked).toBe(false);
    });

    it('should update blocking state when blocking task status changes', () => {
      const blockingTask = taskService.create({
        title: 'Blocker',
        status: 'idle',
      });
      const blockedTask = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blockingTask.id,
      });

      // Initially blocked
      expect(blockedTask.is_currently_blocked).toBe(true);

      // Complete the blocking task
      taskService.update(blockingTask.id, { status: 'complete' });

      // Check blocked task again - should be unblocked
      const refreshed = taskService.get(blockedTask.id);
      expect(refreshed?.is_currently_blocked).toBe(false);
      expect(refreshed?.blocked_by_task_id).toBe(blockingTask.id); // Relationship preserved
    });

    it('should re-block task when blocking task reopens', () => {
      const blockingTask = taskService.create({
        title: 'Blocker',
        status: 'complete',
      });
      const blockedTask = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blockingTask.id,
      });

      // Initially unblocked (blocker is complete)
      expect(blockedTask.is_currently_blocked).toBe(false);

      // Reopen the blocking task
      taskService.update(blockingTask.id, { status: 'idle' });

      // Check blocked task again - should be blocked again
      const refreshed = taskService.get(blockedTask.id);
      expect(refreshed?.is_currently_blocked).toBe(true);
    });
  });

  describe('Foreign key behavior', () => {
    it('should set blocked_by_task_id to null when blocking task is deleted', () => {
      const blockingTask = taskService.create({ title: 'Blocker' });
      const blockedTask = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blockingTask.id,
      });

      // Delete the blocking task
      taskService.delete(blockingTask.id);

      // Check blocked task - should have null blocked_by_task_id
      const refreshed = taskService.get(blockedTask.id);
      expect(refreshed?.blocked_by_task_id).toBeNull();
      expect(refreshed?.is_currently_blocked).toBe(false);
    });

    it('should preserve blocked_by_task_id when blocking task is archived', () => {
      const blockingTask = taskService.create({ title: 'Blocker' });
      const blockedTask = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blockingTask.id,
      });

      // Archive the blocking task
      taskService.archive(blockingTask.id);

      // Check blocked task - should still have blocked_by_task_id
      const refreshed = taskService.get(blockedTask.id);
      expect(refreshed?.blocked_by_task_id).toBe(blockingTask.id);
    });
  });

  describe('Edge cases', () => {
    it('should allow blocking task to be a subtask', () => {
      const parent = taskService.create({ title: 'Parent' });
      const blockingSubtask = taskService.create({
        title: 'Blocking Subtask',
        parent_task_id: parent.id,
      });
      const blockedTask = taskService.create({
        title: 'Blocked Task',
        blocked_by_task_id: blockingSubtask.id,
      });

      expect(blockedTask.blocked_by_task_id).toBe(blockingSubtask.id);
      expect(blockedTask.is_currently_blocked).toBe(true);
    });

    it('should allow blocked task to be a parent', () => {
      const blockingTask = taskService.create({ title: 'Blocker' });
      const parentTask = taskService.create({
        title: 'Parent Task',
        blocked_by_task_id: blockingTask.id,
      });
      const subtask = taskService.create({
        title: 'Subtask',
        parent_task_id: parentTask.id,
      });

      expect(parentTask.blocked_by_task_id).toBe(blockingTask.id);
      expect(parentTask.is_currently_blocked).toBe(true);
      expect(subtask.parent_task_id).toBe(parentTask.id);
    });

    it('should allow chain blocking (A→B→C)', () => {
      const taskA = taskService.create({ title: 'Task A' });
      const taskB = taskService.create({
        title: 'Task B',
        blocked_by_task_id: taskA.id,
      });
      const taskC = taskService.create({
        title: 'Task C',
        blocked_by_task_id: taskB.id,
      });

      expect(taskB.blocked_by_task_id).toBe(taskA.id);
      expect(taskC.blocked_by_task_id).toBe(taskB.id);
      expect(taskB.is_currently_blocked).toBe(true);
      expect(taskC.is_currently_blocked).toBe(true);
    });
  });

  describe('getBlockedTasks helper', () => {
    it('should return all tasks blocked by a specific task', () => {
      const blocker = taskService.create({ title: 'Blocker' });
      const blocked1 = taskService.create({
        title: 'Blocked 1',
        blocked_by_task_id: blocker.id,
      });
      const blocked2 = taskService.create({
        title: 'Blocked 2',
        blocked_by_task_id: blocker.id,
      });
      const _unrelated = taskService.create({ title: 'Unrelated' });

      const blockedTasks = taskService.getBlockedTasks(blocker.id);

      expect(blockedTasks).toHaveLength(2);
      expect(blockedTasks.map(t => t.id).sort()).toEqual([blocked1.id, blocked2.id].sort());
    });

    it('should return empty array if no tasks are blocked', () => {
      const task = taskService.create({ title: 'Task' });
      const blockedTasks = taskService.getBlockedTasks(task.id);

      expect(blockedTasks).toHaveLength(0);
    });

    it('should not include archived tasks', () => {
      const blocker = taskService.create({ title: 'Blocker' });
      const blocked1 = taskService.create({
        title: 'Blocked 1',
        blocked_by_task_id: blocker.id,
      });
      const blocked2 = taskService.create({
        title: 'Blocked 2',
        blocked_by_task_id: blocker.id,
      });

      // Archive one blocked task
      taskService.archive(blocked2.id);

      const blockedTasks = taskService.getBlockedTasks(blocker.id);

      expect(blockedTasks).toHaveLength(1);
      expect(blockedTasks[0].id).toBe(blocked1.id);
    });
  });

  describe('Workflow scenarios', () => {
    it('should support typical blocking workflow', () => {
      // Create a task that needs to be done first
      const prerequisite = taskService.create({
        title: 'Setup Database',
        status: 'idle',
      });

      // Create a task that depends on it
      const dependent = taskService.create({
        title: 'Run Migrations',
        blocked_by_task_id: prerequisite.id,
      });

      // Dependent is blocked
      expect(dependent.is_currently_blocked).toBe(true);

      // Start working on prerequisite
      taskService.update(prerequisite.id, { status: 'working' });
      let refreshed = taskService.get(dependent.id);
      expect(refreshed?.is_currently_blocked).toBe(true); // Still blocked

      // Complete prerequisite
      taskService.update(prerequisite.id, { status: 'complete' });
      refreshed = taskService.get(dependent.id);
      expect(refreshed?.is_currently_blocked).toBe(false); // Now unblocked

      // Can now work on dependent task
      taskService.update(dependent.id, { status: 'working' });
      refreshed = taskService.get(dependent.id);
      expect(refreshed?.status).toBe('working');
    });

    it('should support manual unblocking (workaround found)', () => {
      const blocker = taskService.create({ title: 'Blocker' });
      const blocked = taskService.create({
        title: 'Blocked',
        blocked_by_task_id: blocker.id,
      });

      expect(blocked.is_currently_blocked).toBe(true);

      // Found a workaround, manually unblock
      const unblocked = taskService.update(blocked.id, {
        blocked_by_task_id: null,
      });

      expect(unblocked.blocked_by_task_id).toBeNull();
      expect(unblocked.is_currently_blocked).toBe(false);
    });
  });
});
