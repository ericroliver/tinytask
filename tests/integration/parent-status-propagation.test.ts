/**
 * Integration tests for parent task status propagation
 * 
 * Business rules:
 * - When all child tasks are 'idle' → parent is 'idle'
 * - When any child task is 'working' → parent is 'working'
 * - When all child tasks are 'complete' → parent is 'complete'
 * - Status propagates recursively through multiple levels
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseClient } from '../../src/db/client.js';
import { TaskService } from '../../src/services/task-service.js';
import { TaskStatus } from '../../src/types/index.js';

describe('Parent Status Propagation', () => {
  let db: DatabaseClient;
  let taskService: TaskService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new DatabaseClient(':memory:');
    db.initialize();
    taskService = new TaskService(db);
  });

  describe('Single-level hierarchy', () => {
    it('should set parent to idle when all children are idle', () => {
      // Create parent
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'working', // Start with different status
      });

      // Create children - all idle
      taskService.create({
        title: 'Child 1',
        status: 'idle',
        parent_task_id: parent.id,
      });

      taskService.create({
        title: 'Child 2',
        status: 'idle',
        parent_task_id: parent.id,
      });

      // Check parent status
      const updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('idle');
    });

    it('should set parent to working when any child is working', () => {
      // Create parent
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'idle',
      });

      // Create children - one working
      taskService.create({
        title: 'Child 1',
        status: 'idle',
        parent_task_id: parent.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'idle',
        parent_task_id: parent.id,
      });

      // Update one child to working
      taskService.update(child2.id, { status: 'working' });

      // Check parent status
      const updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('working');
    });

    it('should set parent to complete when all children are complete', () => {
      // Create parent
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'working',
      });

      // Create children - all complete
      const child1 = taskService.create({
        title: 'Child 1',
        status: 'working',
        parent_task_id: parent.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'working',
        parent_task_id: parent.id,
      });

      // Complete both children
      taskService.update(child1.id, { status: 'complete' });
      taskService.update(child2.id, { status: 'complete' });

      // Check parent status
      const updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('complete');
    });

    it('should revert parent from complete to working when a child goes back to working', () => {
      // Create parent and children
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'working',
      });

      const child1 = taskService.create({
        title: 'Child 1',
        status: 'complete',
        parent_task_id: parent.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'complete',
        parent_task_id: parent.id,
      });

      // Parent should be complete
      let updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('complete');

      // Reopen one child
      taskService.update(child1.id, { status: 'working' });

      // Parent should now be working
      updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('working');
    });

    it('should revert parent from complete to idle when a child goes back to idle', () => {
      // Create parent and children
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'working',
      });

      const child1 = taskService.create({
        title: 'Child 1',
        status: 'complete',
        parent_task_id: parent.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'complete',
        parent_task_id: parent.id,
      });

      // Parent should be complete
      let updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('complete');

      // Reopen both children to idle
      taskService.update(child1.id, { status: 'idle' });
      taskService.update(child2.id, { status: 'idle' });

      // Parent should now be idle
      updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('idle');
    });

    it('should update parent status when a child is deleted', () => {
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'idle',
      });

      const child1 = taskService.create({
        title: 'Child 1',
        status: 'working',
        parent_task_id: parent.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'complete',
        parent_task_id: parent.id,
      });

      // Parent should be working (because child1 is working)
      let updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('working');

      // Delete the working child
      taskService.delete(child1.id);

      // Parent should now be complete (only child2 remains, which is complete)
      updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('complete');
    });

    it('should update parent status when a child is archived', () => {
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'idle',
      });

      const child1 = taskService.create({
        title: 'Child 1',
        status: 'working',
        parent_task_id: parent.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'idle',
        parent_task_id: parent.id,
      });

      // Parent should be working (because child1 is working)
      let updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('working');

      // Archive the working child
      taskService.archive(child1.id);

      // Parent should now be idle (only child2 remains, which is idle)
      updatedParent = taskService.get(parent.id);
      expect(updatedParent?.status).toBe('idle');
    });
  });

  describe('Multi-level hierarchy', () => {
    it('should propagate status changes through multiple levels', () => {
      // Create 3-level hierarchy
      const grandparent = taskService.create({
        title: 'Grandparent',
        status: 'idle',
      });

      const parent1 = taskService.create({
        title: 'Parent 1',
        status: 'idle',
        parent_task_id: grandparent.id,
      });

      const parent2 = taskService.create({
        title: 'Parent 2',
        status: 'idle',
        parent_task_id: grandparent.id,
      });

      const child1 = taskService.create({
        title: 'Child 1',
        status: 'idle',
        parent_task_id: parent1.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'idle',
        parent_task_id: parent1.id,
      });

      const child3 = taskService.create({
        title: 'Child 3',
        status: 'idle',
        parent_task_id: parent2.id,
      });

      // All should be idle
      expect(taskService.get(grandparent.id)?.status).toBe('idle');
      expect(taskService.get(parent1.id)?.status).toBe('idle');
      expect(taskService.get(parent2.id)?.status).toBe('idle');

      // Set one leaf to working
      taskService.update(child1.id, { status: 'working' });

      // Parent1 and grandparent should be working
      expect(taskService.get(child1.id)?.status).toBe('working');
      expect(taskService.get(parent1.id)?.status).toBe('working');
      expect(taskService.get(grandparent.id)?.status).toBe('working');
      // Parent2 remains idle (its children are idle)
      expect(taskService.get(parent2.id)?.status).toBe('idle');

      // Complete all children
      taskService.update(child1.id, { status: 'complete' });
      taskService.update(child2.id, { status: 'complete' });
      taskService.update(child3.id, { status: 'complete' });

      // Everything should be complete
      expect(taskService.get(parent1.id)?.status).toBe('complete');
      expect(taskService.get(parent2.id)?.status).toBe('complete');
      expect(taskService.get(grandparent.id)?.status).toBe('complete');
    });

    it('should handle mixed status across parent siblings', () => {
      const grandparent = taskService.create({
        title: 'Grandparent',
        status: 'idle',
      });

      const parent1 = taskService.create({
        title: 'Parent 1',
        status: 'idle',
        parent_task_id: grandparent.id,
      });

      const parent2 = taskService.create({
        title: 'Parent 2',
        status: 'idle',
        parent_task_id: grandparent.id,
      });

      // Parent 1 children - all complete
      taskService.create({
        title: 'Child 1-1',
        status: 'complete',
        parent_task_id: parent1.id,
      });

      taskService.create({
        title: 'Child 1-2',
        status: 'complete',
        parent_task_id: parent1.id,
      });

      // Parent 2 children - one working
      taskService.create({
        title: 'Child 2-1',
        status: 'working',
        parent_task_id: parent2.id,
      });

      taskService.create({
        title: 'Child 2-2',
        status: 'idle',
        parent_task_id: parent2.id,
      });

      // Parent1 should be complete, Parent2 should be working
      expect(taskService.get(parent1.id)?.status).toBe('complete');
      expect(taskService.get(parent2.id)?.status).toBe('working');

      // Grandparent should be working (any child working)
      expect(taskService.get(grandparent.id)?.status).toBe('working');
    });
  });

  describe('Edge cases', () => {
    it('should not change parent status when parent has no children', () => {
      const parent = taskService.create({
        title: 'Parent with no children',
        status: 'working',
      });

      // Manually call updateParentStatus (this shouldn't happen in practice)
      // Just to verify it doesn't crash
      expect(taskService.get(parent.id)?.status).toBe('working');
    });

    it('should handle parent status when only some children are archived', () => {
      const parent = taskService.create({
        title: 'Parent Task',
        status: 'idle',
      });

      const child1 = taskService.create({
        title: 'Child 1',
        status: 'complete',
        parent_task_id: parent.id,
      });

      const child2 = taskService.create({
        title: 'Child 2',
        status: 'working',
        parent_task_id: parent.id,
      });

      const child3 = taskService.create({
        title: 'Child 3',
        status: 'idle',
        parent_task_id: parent.id,
      });

      // Parent should be working
      expect(taskService.get(parent.id)?.status).toBe('working');

      // Archive the working child
      taskService.archive(child2.id);

      // Parent should still reflect non-archived children (complete + idle = working? No, idle)
      // Actually: child1 is complete, child3 is idle -> neither all complete nor any working -> idle
      expect(taskService.get(parent.id)?.status).toBe('idle');

      // Complete child3
      taskService.update(child3.id, { status: 'complete' });

      // Now parent should be complete (both remaining children are complete)
      expect(taskService.get(parent.id)?.status).toBe('complete');
    });
  });
});
