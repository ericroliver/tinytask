/**
 * Subtasks and Queues Integration Tests
 * Tests the complete subtask and queue management functionality
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient, TestClient } from '../helpers/test-client.js';

describe('Subtasks and Queues Integration', () => {
  let client: TestClient;

  beforeEach(() => {
    client = createTestClient();
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('Subtask Management', () => {
    test('should create subtask with parent_task_id', () => {
      // Create parent task
      const parent = client.taskService.createTask({
        title: 'Parent Task',
        status: 'idle',
        priority: 5,
      });

      // Create subtask using createSubtask method
      const subtask = client.taskService.createSubtask(parent.id, {
        title: 'Subtask 1',
        status: 'idle',
      });

      expect(subtask.id).toBeDefined();
      expect(subtask.parent_task_id).toBe(parent.id);
      expect(subtask.title).toBe('Subtask 1');
    });

    test('should create 3-level task hierarchy', () => {
      // Create parent
      const parent = client.taskService.createTask({
        title: 'Parent Task',
        status: 'idle',
      });

      // Create child
      const child = client.taskService.createSubtask(parent.id, {
        title: 'Child Task',
        status: 'idle',
      });

      // Create grandchild
      const grandchild = client.taskService.createSubtask(child.id, {
        title: 'Grandchild Task',
        status: 'idle',
      });

      // Get subtasks (non-recursive - should only return direct children)
      const directChildren = client.taskService.getSubtasks(parent.id, false);
      expect(directChildren).toHaveLength(1);
      expect(directChildren[0].id).toBe(child.id);

      // Get all descendants (recursive)
      const allDescendants = client.taskService.getSubtasks(parent.id, true);
      expect(allDescendants).toHaveLength(2);
      const descendantIds = allDescendants.map(t => t.id);
      expect(descendantIds).toContain(child.id);
      expect(descendantIds).toContain(grandchild.id);
    });

    test('should enforce max depth of 3 levels', () => {
      // Create 4-level hierarchy (implementation allows up to depth 3, which is 4 levels)
      const level1 = client.taskService.createTask({
        title: 'Level 1',
        status: 'idle',
      });

      const level2 = client.taskService.createSubtask(level1.id, {
        title: 'Level 2',
        status: 'idle',
      });

      const level3 = client.taskService.createSubtask(level2.id, {
        title: 'Level 3',
        status: 'idle',
      });

      const level4 = client.taskService.createSubtask(level3.id, {
        title: 'Level 4',
        status: 'idle',
      });

      // Attempting to create level 5 should throw error (depth would be 4)
      expect(() => {
        client.taskService.createSubtask(level4.id, {
          title: 'Level 5 - Should Fail',
          status: 'idle',
        });
      }).toThrow(/maximum.*depth|depth.*exceeded|nesting/i);
    });

    test('should prevent circular dependencies', () => {
      const task1 = client.taskService.createTask({
        title: 'Task 1',
        status: 'idle',
      });

      const task2 = client.taskService.createSubtask(task1.id, {
        title: 'Task 2',
        status: 'idle',
      });

      // Attempting to make task1 a subtask of task2 should fail
      expect(() => {
        client.taskService.moveSubtask(task1.id, task2.id);
      }).toThrow(/circular|cycle/i);
    });

    test('should prevent task from being its own parent', () => {
      const task = client.taskService.createTask({
        title: 'Task',
        status: 'idle',
      });

      expect(() => {
        client.taskService.moveSubtask(task.id, task.id);
      }).toThrow(/own parent|circular|cycle/i);
    });

    test('should cascade delete when parent is deleted', () => {
      const parent = client.taskService.createTask({
        title: 'Parent',
        status: 'idle',
      });

      const child1 = client.taskService.createSubtask(parent.id, {
        title: 'Child 1',
        status: 'idle',
      });

      const child2 = client.taskService.createSubtask(parent.id, {
        title: 'Child 2',
        status: 'idle',
      });

      const grandchild = client.taskService.createSubtask(child1.id, {
        title: 'Grandchild',
        status: 'idle',
      });

      // Delete parent
      client.taskService.deleteTask(parent.id);

      // All descendants should be deleted
      expect(client.taskService.getTask(parent.id)).toBeNull();
      expect(client.taskService.getTask(child1.id)).toBeNull();
      expect(client.taskService.getTask(child2.id)).toBeNull();
      expect(client.taskService.getTask(grandchild.id)).toBeNull();
    });

    test('should move subtask to different parent', () => {
      const parent1 = client.taskService.createTask({
        title: 'Parent 1',
        status: 'idle',
      });

      const parent2 = client.taskService.createTask({
        title: 'Parent 2',
        status: 'idle',
      });

      const subtask = client.taskService.createSubtask(parent1.id, {
        title: 'Movable Subtask',
        status: 'idle',
      });

      // Move subtask to parent2
      client.taskService.moveSubtask(subtask.id, parent2.id);

      // Verify parent1 has no subtasks
      const parent1Subtasks = client.taskService.getSubtasks(parent1.id);
      expect(parent1Subtasks).toHaveLength(0);

      // Verify parent2 has the subtask
      const parent2Subtasks = client.taskService.getSubtasks(parent2.id);
      expect(parent2Subtasks).toHaveLength(1);
      expect(parent2Subtasks[0].id).toBe(subtask.id);
    });

    test('should inherit queue from parent when not specified', () => {
      const parent = client.taskService.createTask({
        title: 'Parent',
        status: 'idle',
        queue_name: 'dev',
      });

      const subtask = client.taskService.createSubtask(parent.id, {
        title: 'Subtask',
        status: 'idle',
        // queue_name not specified - should inherit from parent
      });

      const retrieved = client.taskService.getTask(subtask.id);
      expect(retrieved?.queue_name).toBe('dev');
    });
  });

  describe('Queue Management', () => {
    test('should add task to queue', () => {
      const task = client.taskService.createTask({
        title: 'Task in Queue',
        status: 'idle',
        queue_name: 'dev',
      });

      expect(task.queue_name).toBe('dev');

      const queueTasks = client.queueService.getQueueTasks('dev');
      expect(queueTasks).toHaveLength(1);
      expect(queueTasks[0].id).toBe(task.id);
    });

    test('should move task between queues', () => {
      const task = client.taskService.createTask({
        title: 'Task',
        status: 'idle',
        queue_name: 'dev',
      });

      // Move to qa queue
      client.queueService.moveTaskToQueue(task.id, 'qa');

      // Verify task is in qa queue
      const qaTasks = client.queueService.getQueueTasks('qa');
      expect(qaTasks).toHaveLength(1);
      expect(qaTasks[0].id).toBe(task.id);

      // Verify task is not in dev queue
      const devTasks = client.queueService.getQueueTasks('dev');
      expect(devTasks).toHaveLength(0);
    });

    test('should remove task from queue', () => {
      const task = client.taskService.createTask({
        title: 'Task',
        status: 'idle',
        queue_name: 'dev',
      });

      // Remove from queue
      client.queueService.removeTaskFromQueue(task.id);

      // Verify task is not in any queue
      const retrieved = client.taskService.getTask(task.id);
      expect(retrieved?.queue_name).toBeNull();

      const devTasks = client.queueService.getQueueTasks('dev');
      expect(devTasks).toHaveLength(0);
    });

    test('should list all queues', () => {
      // Create tasks in different queues
      client.taskService.createTask({
        title: 'Dev Task',
        status: 'idle',
        queue_name: 'dev',
      });

      client.taskService.createTask({
        title: 'QA Task',
        status: 'idle',
        queue_name: 'qa',
      });

      client.taskService.createTask({
        title: 'Product Task',
        status: 'idle',
        queue_name: 'product',
      });

      const queues = client.queueService.listQueues();
      expect(queues).toHaveLength(3);
      expect(queues).toContain('dev');
      expect(queues).toContain('qa');
      expect(queues).toContain('product');
    });

    test('should get queue statistics', () => {
      // Create tasks with different statuses
      client.taskService.createTask({
        title: 'Idle Task',
        status: 'idle',
        queue_name: 'dev',
      });

      client.taskService.createTask({
        title: 'Working Task',
        status: 'working',
        queue_name: 'dev',
        assigned_to: 'agent1',
      });

      client.taskService.createTask({
        title: 'Complete Task',
        status: 'complete',
        queue_name: 'dev',
      });

      client.taskService.createTask({
        title: 'Unassigned Task',
        status: 'idle',
        queue_name: 'dev',
      });

      const stats = client.queueService.getQueueStats('dev');
      expect(stats.queue_name).toBe('dev');
      expect(stats.total_tasks).toBe(4);
      expect(stats.by_status.idle).toBe(2);
      expect(stats.by_status.working).toBe(1);
      expect(stats.by_status.complete).toBe(1);
      expect(stats.assigned).toBe(1);
      expect(stats.unassigned).toBe(3);
    });

    test('should get tasks in queue with filters', () => {
      // Create tasks
      client.taskService.createTask({
        title: 'Idle Task',
        status: 'idle',
        queue_name: 'dev',
      });

      client.taskService.createTask({
        title: 'Working Task',
        status: 'working',
        queue_name: 'dev',
      });

      // Get only idle tasks
      const idleTasks = client.queueService.getQueueTasks('dev', { status: 'idle' });
      expect(idleTasks).toHaveLength(1);
      expect(idleTasks[0].status).toBe('idle');

      // Get only working tasks
      const workingTasks = client.queueService.getQueueTasks('dev', { status: 'working' });
      expect(workingTasks).toHaveLength(1);
      expect(workingTasks[0].status).toBe('working');
    });

    test('should get unassigned tasks in queue', () => {
      client.taskService.createTask({
        title: 'Assigned Task',
        status: 'idle',
        queue_name: 'dev',
        assigned_to: 'agent1',
      });

      client.taskService.createTask({
        title: 'Unassigned Task 1',
        status: 'idle',
        queue_name: 'dev',
      });

      client.taskService.createTask({
        title: 'Unassigned Task 2',
        status: 'idle',
        queue_name: 'dev',
      });

      // Get all tasks in queue and filter for unassigned manually
      const allTasks = client.queueService.getQueueTasks('dev');
      const unassigned = allTasks.filter(task => task.assigned_to === null);
      expect(unassigned).toHaveLength(2);
      unassigned.forEach(task => {
        expect(task.assigned_to).toBeNull();
      });
    });

    test('should clear queue', () => {
      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        client.taskService.createTask({
          title: `Task ${i}`,
          status: 'idle',
          queue_name: 'dev',
        });
      }

      // Clear queue
      const clearedCount = client.queueService.clearQueue('dev');
      expect(clearedCount).toBe(5);

      // Verify queue is empty
      const tasks = client.queueService.getQueueTasks('dev');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('Combined Subtasks and Queues', () => {
    test('should handle subtasks across different queues', () => {
      // Create parent in product queue
      const parent = client.taskService.createTask({
        title: 'Product Feature',
        status: 'idle',
        queue_name: 'product',
        assigned_to: 'product-manager',
      });

      // Create dev subtask
      const devSubtask = client.taskService.createSubtask(parent.id, {
        title: 'Implement Feature',
        status: 'idle',
        queue_name: 'dev',
        assigned_to: 'developer',
      });

      // Create QA subtask
      const qaSubtask = client.taskService.createSubtask(parent.id, {
        title: 'Test Feature',
        status: 'idle',
        queue_name: 'qa',
        assigned_to: 'tester',
      });

      // Product queue includes parent only
      const productTasks = client.queueService.getQueueTasks('product');
      expect(productTasks).toHaveLength(1);
      expect(productTasks[0].id).toBe(parent.id);

      // Dev queue includes dev subtask
      const devTasks = client.queueService.getQueueTasks('dev');
      expect(devTasks).toHaveLength(1);
      expect(devTasks[0].id).toBe(devSubtask.id);

      // QA queue includes qa subtask
      const qaTasks = client.queueService.getQueueTasks('qa');
      expect(qaTasks).toHaveLength(1);
      expect(qaTasks[0].id).toBe(qaSubtask.id);

      // Parent should have both subtasks
      const subtasks = client.taskService.getSubtasks(parent.id);
      expect(subtasks).toHaveLength(2);
    });

    test('should track agent workload across queues', () => {
      const agent = 'multi-queue-agent';

      // Create tasks in different queues for same agent
      client.taskService.createTask({
        title: 'Dev Task',
        status: 'idle',
        queue_name: 'dev',
        assigned_to: agent,
      });

      client.taskService.createTask({
        title: 'QA Task',
        status: 'idle',
        queue_name: 'qa',
        assigned_to: agent,
      });

      client.taskService.createTask({
        title: 'Product Task',
        status: 'idle',
        queue_name: 'product',
        assigned_to: agent,
      });

      // Get agent's queue (should include all tasks regardless of queue)
      const agentQueue = client.taskService.getMyQueue(agent);
      expect(agentQueue.tasks).toHaveLength(3);
    });

    test('should maintain hierarchy when moving tasks between queues', () => {
      const parent = client.taskService.createTask({
        title: 'Parent',
        status: 'idle',
        queue_name: 'dev',
      });

      const child = client.taskService.createSubtask(parent.id, {
        title: 'Child',
        status: 'idle',
        queue_name: 'dev',
      });

      // Move child to different queue
      client.queueService.moveTaskToQueue(child.id, 'qa');

      // Verify hierarchy is maintained
      const subtasks = client.taskService.getSubtasks(parent.id);
      expect(subtasks).toHaveLength(1);
      expect(subtasks[0].id).toBe(child.id);

      // Verify child is in qa queue
      const childTask = client.taskService.getTask(child.id);
      expect(childTask?.queue_name).toBe('qa');
    });
  });

  describe('Backwards Compatibility', () => {
    test('should work with tasks without parent_task_id', () => {
      const task = client.taskService.createTask({
        title: 'Legacy Task',
        status: 'idle',
      });

      expect(task.parent_task_id).toBeNull();
      
      const subtasks = client.taskService.getSubtasks(task.id);
      expect(subtasks).toHaveLength(0);
    });

    test('should work with tasks without queue_name', () => {
      const task = client.taskService.createTask({
        title: 'Task Without Queue',
        status: 'idle',
      });

      expect(task.queue_name).toBeNull();

      // Should not appear in any queue
      const queues = client.queueService.listQueues();
      expect(queues).toHaveLength(0);
    });

    test('should maintain existing task operations', () => {
      // Standard CRUD operations should still work
      const task = client.taskService.createTask({
        title: 'Standard Task',
        description: 'Description',
        status: 'idle',
        priority: 5,
        assigned_to: 'agent',
      });

      expect(task.id).toBeDefined();

      // Update
      client.taskService.updateTask(task.id, { status: 'working' });
      const updated = client.taskService.getTask(task.id);
      expect(updated?.status).toBe('working');

      // Delete
      client.taskService.deleteTask(task.id);
      expect(client.taskService.getTask(task.id)).toBeNull();
    });
  });
});
