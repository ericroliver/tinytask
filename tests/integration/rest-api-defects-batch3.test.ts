/**
 * REST API Defect Tests — covers 9 defects (#509-#510, #548-#554) filed by the testing team
 *
 * #509: DEFECT-13: Non-numeric ID returns 404 NaN on non-GET endpoints (umbrella)
 * #510: DEFECT-14: Offset query param causes SQL syntax error on list endpoints (umbrella)
 * #548: DELETE /tasks/{id} non-numeric ID → 404 NaN
 * #549: POST /tasks/{id}/archive non-numeric ID → 404 NaN
 * #550: GET /tasks?offset=1 → 400 SQL syntax error
 * #551: GET /queues/{name}/tasks?offset=1 → 400 SQL syntax error
 * #552: DELETE /comments/{id} non-numeric ID → 404 NaN
 * #553: DELETE /links/{id} non-numeric ID → 404 NaN
 * #554: POST /tasks/{id}/subtasks accepts string priority
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
  const testDbPath = path.join(process.cwd(), 'data', `rest-defects3-${Date.now()}-${Math.random()}.db`);
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

describe('REST API Defect Fixes — Batch 3 (#509-#510, #548-#554)', () => {
  let ctx: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    ctx = createTestApp();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  // ─── #509/#548: DELETE /tasks/:id non-numeric ID ───────

  describe('#509/#548: DELETE /api/v1/tasks/:id non-numeric ID', () => {
    test('returns 400 for non-numeric ID', async () => {
      const res = await request(ctx.app).delete('/api/v1/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('abc');
      expect(res.body.error).not.toContain('NaN');
    });

    test('returns 400 for another non-numeric ID', async () => {
      const res = await request(ctx.app).delete('/api/v1/tasks/xyz123');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('xyz123');
    });
  });

  // ─── #509/#549: POST /tasks/:id/archive non-numeric ID ──

  describe('#509/#549: POST /api/v1/tasks/:id/archive non-numeric ID', () => {
    test('returns 400 for non-numeric ID', async () => {
      const res = await request(ctx.app).post('/api/v1/tasks/abc/archive');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('abc');
      expect(res.body.error).not.toContain('NaN');
    });
  });

  // ─── #509/#552: DELETE /comments/:id non-numeric ID ────

  describe('#509/#552: DELETE /api/v1/comments/:id non-numeric ID', () => {
    test('returns 400 for non-numeric ID', async () => {
      const res = await request(ctx.app).delete('/api/v1/comments/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('abc');
      expect(res.body.error).not.toContain('NaN');
    });
  });

  // ─── #509/#553: DELETE /links/:id non-numeric ID ───────

  describe('#509/#553: DELETE /api/v1/links/:id non-numeric ID', () => {
    test('returns 400 for non-numeric ID', async () => {
      const res = await request(ctx.app).delete('/api/v1/links/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('abc');
      expect(res.body.error).not.toContain('NaN');
    });
  });

  // ─── #510/#550: GET /tasks?offset=1 SQL error ───────────

  describe('#510/#550: GET /api/v1/tasks?offset=N SQL syntax error', () => {
    test('offset=1 returns 200 (not SQL error)', async () => {
      // Create some tasks first
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task2' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task3' });

      const res = await request(ctx.app).get('/api/v1/tasks?offset=1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should skip the first task
      expect(res.body.length).toBe(2);
    });

    test('offset=0 returns 200 with all tasks', async () => {
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task2' });

      const res = await request(ctx.app).get('/api/v1/tasks?offset=0');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test('offset without limit returns 200', async () => {
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task2' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task3' });

      const res = await request(ctx.app).get('/api/v1/tasks?offset=2');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    test('offset with limit returns 200', async () => {
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task2' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task3' });

      const res = await request(ctx.app).get('/api/v1/tasks?limit=1&offset=1');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  // ─── #510/#551: GET /queues/:name/tasks?offset=1 ───────

  describe('#510/#551: GET /api/v1/queues/:name/tasks?offset=N SQL syntax error', () => {
    test('offset=1 returns 200 (not SQL error)', async () => {
      // Create tasks in a queue
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1', queue_name: 'dev' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task2', queue_name: 'dev' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task3', queue_name: 'dev' });

      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?offset=1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    test('offset without limit returns 200', async () => {
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task1', queue_name: 'dev' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task2', queue_name: 'dev' });
      await request(ctx.app).post('/api/v1/tasks').send({ title: 'task3', queue_name: 'dev' });

      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?offset=2');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  // ─── #554: POST /tasks/:id/subtasks string priority ────

  describe('#554: POST /api/v1/tasks/:id/subtasks priority validation', () => {
    let parentId: number;

    beforeEach(async () => {
      const res = await request(ctx.app).post('/api/v1/tasks').send({ title: 'parent' });
      parentId = res.body.id;
    });

    test('rejects string priority with 400', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask', priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects boolean priority with 400', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask', priority: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects null priority with 400', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask', priority: null });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects string tags with 400', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask', tags: 'foo' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tags');
    });

    test('accepts valid integer priority', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask', priority: 7 });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(7);
    });

    test('accepts valid array tags', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${parentId}/subtasks`)
        .send({ title: 'subtask', tags: ['bug', 'urgent'] });

      expect(res.status).toBe(201);
      expect(res.body.tags).toEqual(['bug', 'urgent']);
    });
  });
});
