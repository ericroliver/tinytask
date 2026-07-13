/**
 * REST API Defect Tests — covers 6 defects filed by the testing team
 *
 * DEFECT-1 (#373): POST /api/v1/tasks accepts non-numeric priority value
 * DEFECT-2 (#374): Timestamps not ISO 8601 format
 * DEFECT-3 (#375): Non-numeric task ID returns 'Task NaN not found'
 * DEFECT-4 (#376): POST /api/v1/tasks/{id}/transfer response shape doesn't match spec
 * DEFECT-5 (#377): PATCH /api/v1/tasks/{id}/queue with wrong field name returns internal error
 * DEFECT-6 (#378): queue_name query parameter filter on GET /api/v1/tasks is ignored
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { DatabaseClient } from '../../src/db/client.js';
import { TaskService } from '../../src/services/task-service.js';
import { CommentService } from '../../src/services/comment-service.js';
import { LinkService } from '../../src/services/link-service.js';
import { QueueService } from '../../src/services/queue-service.js';
import { createRestRouter } from '../../src/server/rest.js';
import fs from 'fs';
import path from 'path';

function createTestApp() {
  const testDbPath = path.join(process.cwd(), 'data', `rest-test-${Date.now()}-${Math.random()}.db`);
  const dataDir = path.dirname(testDbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new DatabaseClient(testDbPath);
  db.initialize();

  const taskService = new TaskService(db);
  const commentService = new CommentService(db);
  const linkService = new LinkService(db);
  const queueService = new QueueService(db);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createRestRouter(taskService, commentService, linkService, queueService));

  const cleanup = () => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  };

  return { app, taskService, commentService, linkService, queueService, db, cleanup };
}

// ISO 8601 regex: YYYY-MM-DDTHH:MM:SSZ or with milliseconds
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

describe('REST API Defect Fixes', () => {
  let ctx: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    ctx = createTestApp();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  // ─── DEFECT-1 (#373): Non-numeric priority rejected ──────

  describe('DEFECT-1: POST /api/v1/tasks priority validation', () => {
    test('rejects string priority with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'test', priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('accepts numeric priority', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'test', priority: 7 });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(7);
      expect(typeof res.body.priority).toBe('number');
    });

    test('accepts undefined priority (defaults to 0)', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'test' });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(0);
    });
  });

  // ─── DEFECT-2 (#374): Timestamps in ISO 8601 format ───────

  describe('DEFECT-2: ISO 8601 timestamps', () => {
    test('task timestamps are ISO 8601 format', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'test' });

      expect(res.status).toBe(201);
      expect(res.body.created_at).toMatch(ISO_8601_REGEX);
      expect(res.body.updated_at).toMatch(ISO_8601_REGEX);
      expect(res.body.archived_at).toBeNull();
    });

    test('task list timestamps are ISO 8601 format', async () => {
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'test1' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'test2' });

      const res = await request(ctx.app).get('/api/v1/tasks');

      expect(res.status).toBe(200);
      for (const task of res.body) {
        expect(task.created_at).toMatch(ISO_8601_REGEX);
        expect(task.updated_at).toMatch(ISO_8601_REGEX);
      }
    });

    test('comment timestamps are ISO 8601 format', async () => {
      const taskRes = await request(ctx.app).post('/api/v1/tasks').send({ title: 'test' });
      const taskId = taskRes.body.id;

      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .send({ content: 'test comment', created_by: 'agent' });

      expect(res.status).toBe(201);
      expect(res.body.created_at).toMatch(ISO_8601_REGEX);
      expect(res.body.updated_at).toMatch(ISO_8601_REGEX);
    });

    test('archived task has ISO 8601 archived_at', async () => {
      const taskRes = await request(ctx.app).post('/api/v1/tasks').send({ title: 'test' });
      const taskId = taskRes.body.id;

      const res = await request(ctx.app).post(`/api/v1/tasks/${taskId}/archive`);

      expect(res.status).toBe(200);
      expect(res.body.archived_at).toMatch(ISO_8601_REGEX);
    });
  });

  // ─── DEFECT-3 (#375): Non-numeric task ID error message ───

  describe('DEFECT-3: Non-numeric task ID error', () => {
    test('returns 400 with input value, not NaN', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('abc');
      expect(res.body.error).not.toContain('NaN');
    });

    test('returns 400 for other non-numeric IDs', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks/xyz123');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('xyz123');
      expect(res.body.error).not.toContain('NaN');
    });
  });

  // ─── DEFECT-4 (#376): Transfer response shape ────────────

  describe('DEFECT-4: Transfer response shape {task, comment}', () => {
    test('transfer returns {task, comment} shape', async () => {
      // Create a task assigned to an agent
      const createRes = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'transfer test', assigned_to: 'agent-a' });

      const taskId = createRes.body.id;

      // Transfer the task
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/transfer`)
        .send({
          current_agent: 'agent-a',
          new_agent: 'agent-b',
          comment: 'handoff message',
        });

      expect(res.status).toBe(200);
      // Response should have task and comment keys
      expect(res.body).toHaveProperty('task');
      expect(res.body).toHaveProperty('comment');
      // Task should be a parsed task (not flat with comments/links)
      expect(res.body.task).toHaveProperty('id');
      expect(res.body.task).toHaveProperty('title');
      expect(res.body.task).toHaveProperty('assigned_to');
      expect(res.body.task.assigned_to).toBe('agent-b');
      expect(res.body.task).not.toHaveProperty('comments');
      expect(res.body.task).not.toHaveProperty('links');
      // Comment should be the handoff comment
      expect(res.body.comment).toHaveProperty('id');
      expect(res.body.comment).toHaveProperty('content');
      expect(res.body.comment.content).toBe('handoff message');
      expect(res.body.comment.created_by).toBe('agent-a');
    });

    test('transfer works with task that has tags', async () => {
      // Create a task with tags assigned to an agent
      const createRes = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'transfer with tags', assigned_to: 'agent-a', tags: ['urgent', 'backend'] });

      const taskId = createRes.body.id;

      // Transfer the task
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/transfer`)
        .send({
          current_agent: 'agent-a',
          new_agent: 'agent-b',
          comment: 'handoff with tags',
        });

      expect(res.status).toBe(200);
      expect(res.body.task).toHaveProperty('tags');
      expect(res.body.task.tags).toEqual(['urgent', 'backend']);
      expect(res.body.comment.content).toBe('handoff with tags');
    });
  });

  // ─── DEFECT-5 (#377): Queue patch wrong field name ────────

  describe('DEFECT-5: PATCH /tasks/:id/queue with wrong field name', () => {
    test('returns 400 (not 500) when wrong field name used', async () => {
      const createRes = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'queue test' });

      const taskId = createRes.body.id;

      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}/queue`)
        .send({ queue_name: 'test-queue' }); // wrong field name

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('new_queue_name');
      expect(res.body.error).not.toContain('Cannot read properties');
      expect(res.body.error).not.toContain('undefined');
    });

    test('returns 400 when no body sent', async () => {
      const createRes = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'queue test' });

      const taskId = createRes.body.id;

      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}/queue`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('new_queue_name');
    });

    test('works correctly with correct field name', async () => {
      const createRes = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ title: 'queue test' });

      const taskId = createRes.body.id;

      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}/queue`)
        .send({ new_queue_name: 'my-queue' });

      expect(res.status).toBe(200);
      expect(res.body.queue_name).toBe('my-queue');
    });
  });

  // ─── DEFECT-6 (#378): queue_name filter on list ──────────

  describe('DEFECT-6: queue_name query parameter filter', () => {
    test('filters tasks by queue_name', async () => {
      // Create tasks in different queues
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1', queue_name: 'dev' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task2', queue_name: 'qa' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task3', queue_name: 'dev' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task4', queue_name: 'prod' });

      // Filter by queue_name=dev
      const res = await request(ctx.app).get('/api/v1/tasks?queue_name=dev');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      for (const task of res.body) {
        expect(task.queue_name).toBe('dev');
      }
    });

    test('returns empty for non-existent queue', async () => {
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1', queue_name: 'dev' });

      const res = await request(ctx.app).get('/api/v1/tasks?queue_name=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });

    test('parent_task_id filter works', async () => {
      // Create a parent task
      const parentRes = await request(ctx.app).post('/api/v1/tasks').send({ title: 'parent' });
      const parentId = parentRes.body.id;

      // Create subtask
      await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask' });

      // Filter by parent_task_id
      const res = await request(ctx.app).get(`/api/v1/tasks?parent_task_id=${parentId}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].parent_task_id).toBe(parentId);
    });

    test('exclude_subtasks filter works', async () => {
      // Create a parent task
      const parentRes = await request(ctx.app).post('/api/v1/tasks').send({ title: 'parent' });
      const parentId = parentRes.body.id;

      // Create subtask
      await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask' });

      // With exclude_subtasks=true, only top-level tasks
      const res = await request(ctx.app).get('/api/v1/tasks?exclude_subtasks=true');

      expect(res.status).toBe(200);
      for (const task of res.body) {
        expect(task.parent_task_id).toBeNull();
      }
    });
  });
});
