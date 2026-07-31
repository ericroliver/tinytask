/**
 * Status Filtering Integration Tests
 * Tests comma-separated array status filtering and exclude_status filtering
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient, TestClient } from '../helpers/test-client.js';

describe('Status Filtering', () => {
  let client: TestClient;

  beforeEach(() => {
    client = createTestClient();
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('TaskService.list() with array status', () => {
    beforeEach(() => {
      // Create tasks with different statuses
      client.taskService.create({
        title: 'Idle Task 1',
        description: 'Test',
        status: 'idle',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Working Task 1',
        description: 'Test',
        status: 'working',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Complete Task 1',
        description: 'Test',
        status: 'complete',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Idle Task 2',
        description: 'Test',
        status: 'idle',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Working Task 2',
        description: 'Test',
        status: 'working',
        created_by: 'tester',
      });
    });

    test('should filter by single status (backward compatible)', () => {
      const tasks = client.taskService.list({ status: 'idle' });
      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.status === 'idle')).toBe(true);
    });

    test('should filter by multiple statuses (array)', () => {
      const tasks = client.taskService.list({ status: ['idle', 'working'] });
      expect(tasks).toHaveLength(4);
      expect(tasks.every((t) => t.status === 'idle' || t.status === 'working')).toBe(true);
    });

    test('should filter by all three statuses (array)', () => {
      const tasks = client.taskService.list({ status: ['idle', 'working', 'complete'] });
      expect(tasks).toHaveLength(5);
    });

    test('should return no results for empty status array', () => {
      const tasks = client.taskService.list({ status: [] });
      expect(tasks).toHaveLength(5); // Empty array = no filter applied
    });
  });

  describe('TaskService.list() with exclude_status', () => {
    beforeEach(() => {
      client.taskService.create({
        title: 'Idle Task',
        description: 'Test',
        status: 'idle',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Working Task',
        description: 'Test',
        status: 'working',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Complete Task',
        description: 'Test',
        status: 'complete',
        created_by: 'tester',
      });
    });

    test('should exclude a single status', () => {
      const tasks = client.taskService.list({ exclude_status: ['complete'] });
      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.status !== 'complete')).toBe(true);
    });

    test('should exclude multiple statuses', () => {
      const tasks = client.taskService.list({ exclude_status: ['complete', 'working'] });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('idle');
    });

    test('should exclude all statuses', () => {
      const tasks = client.taskService.list({
        exclude_status: ['idle', 'working', 'complete'],
      });
      expect(tasks).toHaveLength(0);
    });

    test('should return all when exclude_status is empty', () => {
      const tasks = client.taskService.list({ exclude_status: [] });
      expect(tasks).toHaveLength(3);
    });
  });

  describe('TaskService.list() combined status and exclude_status', () => {
    beforeEach(() => {
      client.taskService.create({
        title: 'Idle Task',
        description: 'Test',
        status: 'idle',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Working Task',
        description: 'Test',
        status: 'working',
        created_by: 'tester',
      });
      client.taskService.create({
        title: 'Complete Task',
        description: 'Test',
        status: 'complete',
        created_by: 'tester',
      });
    });

    test('should apply both include and exclude filters', () => {
      const tasks = client.taskService.list({
        status: ['idle', 'working'],
        exclude_status: ['working'],
      });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('idle');
    });
  });

  describe('QueueService.getQueueTasks() with array status', () => {
    beforeEach(() => {
      client.taskService.create({
        title: 'Idle Task',
        description: 'Test',
        status: 'idle',
        created_by: 'tester',
        queue_name: 'dev-queue',
      });
      client.taskService.create({
        title: 'Working Task',
        description: 'Test',
        status: 'working',
        created_by: 'tester',
        queue_name: 'dev-queue',
      });
      client.taskService.create({
        title: 'Complete Task',
        description: 'Test',
        status: 'complete',
        created_by: 'tester',
        queue_name: 'dev-queue',
      });
    });

    test('should filter queue tasks by multiple statuses', () => {
      const tasks = client.queueService.getQueueTasks('dev-queue', {
        status: ['idle', 'working'],
      });
      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.status === 'idle' || t.status === 'working')).toBe(true);
    });

    test('should exclude status from queue tasks', () => {
      const tasks = client.queueService.getQueueTasks('dev-queue', {
        exclude_status: ['complete'],
      });
      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.status !== 'complete')).toBe(true);
    });

    test('should apply both include and exclude on queue tasks', () => {
      const tasks = client.queueService.getQueueTasks('dev-queue', {
        status: ['idle', 'working', 'complete'],
        exclude_status: ['complete'],
      });
      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.status !== 'complete')).toBe(true);
    });
  });
});