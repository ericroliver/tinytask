/**
 * REST API Defect Tests — covers 8 defects (#433-#440) filed by the testing team
 *
 * #433: POST /api/v1/tasks accepts string for tags field instead of array
 * #434: POST /api/v1/tasks accepts non-numeric priority values (bool, null)
 * #435: POST /api/v1/tasks returns 500 for invalid JSON body
 * #436: PATCH /api/v1/tasks/{id} accepts non-numeric priority and non-array tags
 * #437: GET /api/v1/tasks does not validate query parameters
 * #438: GET /api/v1/queues/{name}/tasks does not validate query parameters
 * #439: Endpoints return "trim is not a function" for non-string body fields
 * #440: POST /api/v1/tasks/{id}/transfer returns misleading error for missing fields
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
  const testDbPath = path.join(process.cwd(), 'data', `rest-defects2-${Date.now()}-${Math.random()}.db`);
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
  // Add JSON parse error handler (mirrors streamable-http.ts)
  app.use(express.json());
  app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    next(err);
  });
  app.use('/api/v1', createRestRouter(taskService, commentService, linkService, queueService));

  const cleanup = () => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  };

  return { app, taskService, commentService, linkService, queueService, db, cleanup };
}

describe('REST API Defect Fixes — Batch 2 (#433-#440)', () => {
  let ctx: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    ctx = createTestApp();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  // ─── #433: POST /tasks rejects string tags ───────────────

  describe('#433: POST /api/v1/tasks tags must be array', () => {
    test('rejects string tags with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', tags: 'foo' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tags');
      expect(res.body.error).toContain('array');
    });

    test('rejects number tags with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', tags: 42 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tags');
    });

    test('rejects object tags with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', tags: { key: 'val' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tags');
    });

    test('accepts array of strings tags', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', tags: ['foo', 'bar'] });

      expect(res.status).toBe(201);
      expect(res.body.tags).toEqual(['foo', 'bar']);
    });

    test('accepts empty array tags', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', tags: [] });

      expect(res.status).toBe(201);
      expect(res.body.tags).toEqual([]);
    });

    test('accepts undefined tags (defaults to empty)', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test' });

      expect(res.status).toBe(201);
      expect(res.body.tags).toEqual([]);
    });
  });

  // ─── #434: POST /tasks rejects non-numeric priority ──────

  describe('#434: POST /api/v1/tasks priority must be integer', () => {
    test('rejects boolean priority with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', priority: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects null priority with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', priority: null });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects string priority with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects float priority with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', priority: 3.5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects NaN with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', priority: NaN });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects Infinity with 400', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', priority: Infinity });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('accepts integer priority', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test', priority: 7 });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(7);
    });

    test('accepts undefined priority (defaults to 0)', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'test' });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(0);
    });
  });

  // ─── #435: POST /tasks returns 400 for invalid JSON ──────

  describe('#435: POST /api/v1/tasks invalid JSON body', () => {
    test('returns 400 for malformed JSON', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .set('Content-Type', 'application/json')
        .send('{invalid json');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid JSON');
    });

    test('returns 400 for truncated JSON', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title":"test"');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid JSON');
    });
  });

  // ─── #436: PATCH /tasks/:id validates priority and tags ──

  describe('#436: PATCH /api/v1/tasks/:id validates priority and tags', () => {
    let taskId: number;

    beforeEach(async () => {
      const res = await request(ctx.app).post('/api/v1/tasks').send({ created_by: 'test-creator', title: 'test' });
      taskId = res.body.id;
    });

    test('rejects string priority with 400', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}`)
        .send({ priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects boolean priority with 400', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}`)
        .send({ priority: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority');
    });

    test('rejects string tags with 400', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}`)
        .send({ tags: 'foo' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tags');
    });

    test('rejects number tags with 400', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}`)
        .send({ tags: 42 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tags');
    });

    test('accepts valid integer priority', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}`)
        .send({ priority: 9 });

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe(9);
    });

    test('accepts valid array tags', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/tasks/${taskId}`)
        .send({ tags: ['urgent', 'bug'] });

      expect(res.status).toBe(200);
      expect(res.body.tags).toEqual(['urgent', 'bug']);
    });
  });

  // ─── #437: GET /tasks validates query parameters ─────────

  describe('#437: GET /api/v1/tasks validates query parameters', () => {
    test('rejects invalid status with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?status=invalid-status');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status');
    });

    test('rejects non-numeric limit with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?limit=abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('limit');
    });

    test('rejects non-numeric offset with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?offset=xyz');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('offset');
    });

    test('rejects invalid include_archived with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?include_archived=maybe');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('include_archived');
    });

    test('rejects invalid exclude_subtasks with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?exclude_subtasks=notbool');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('exclude_subtasks');
    });

    test('rejects non-numeric parent_task_id with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?parent_task_id=abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('parent_task_id');
    });

    test('accepts valid status filter', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?status=idle');

      expect(res.status).toBe(200);
    });

    test('accepts valid limit and offset', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?limit=10&offset=5');

      expect(res.status).toBe(200);
    });

    test('accepts valid boolean filters', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?include_archived=false&exclude_subtasks=true');

      expect(res.status).toBe(200);
    });

    test('accepts valid numeric parent_task_id', async () => {
      const res = await request(ctx.app).get('/api/v1/tasks?parent_task_id=5');

      expect(res.status).toBe(200);
    });
  });

  // ─── #438: GET /queues/:name/tasks validates query params ─

  describe('#438: GET /api/v1/queues/:name/tasks validates query parameters', () => {
    test('rejects invalid status with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?status=invalid');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status');
    });

    test('rejects non-numeric limit with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?limit=abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('limit');
    });

    test('rejects non-numeric offset with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?offset=xyz');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('offset');
    });

    test('rejects invalid include_archived with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?include_archived=maybe');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('include_archived');
    });

    test('rejects invalid exclude_subtasks with 400', async () => {
      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?exclude_subtasks=notbool');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('exclude_subtasks');
    });

    test('accepts valid parameters', async () => {
      const res = await request(ctx.app).get('/api/v1/queues/dev/tasks?status=idle&limit=10&offset=0&include_archived=false&exclude_subtasks=true');

      expect(res.status).toBe(200);
    });
  });

  // ─── #439: No more "trim is not a function" ─────────────

  describe('#439: Non-string body fields return descriptive errors', () => {
    test('POST /tasks/:id/comments with number content → 400 with descriptive message', async () => {
      const taskRes = await request(ctx.app).post('/api/v1/tasks').send({ created_by: 'test-creator', title: 'test' });

      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskRes.body.id}/comments`)
        .send({ content: 42 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('content');
      expect(res.body.error).not.toContain('trim is not a function');
    });

    test('POST /tasks/:id/links with number url → 400 with descriptive message', async () => {
      const taskRes = await request(ctx.app).post('/api/v1/tasks').send({ created_by: 'test-creator', title: 'test' });

      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskRes.body.id}/links`)
        .send({ url: 42 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('url');
      expect(res.body.error).not.toContain('trim is not a function');
    });

    test('PATCH /comments/:id with number content → 400 with descriptive message', async () => {
      const taskRes = await request(ctx.app).post('/api/v1/tasks').send({ created_by: 'test-creator', title: 'test' });
      const commentRes = await request(ctx.app)
        .post(`/api/v1/tasks/${taskRes.body.id}/comments`)
        .send({ content: 'original', created_by: 'agent' });

      const res = await request(ctx.app)
        .patch(`/api/v1/comments/${commentRes.body.id}`)
        .send({ content: 42 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('content');
      expect(res.body.error).not.toContain('trim is not a function');
    });

    test('PATCH /links/:id with number url → 400 with descriptive message', async () => {
      const taskRes = await request(ctx.app).post('/api/v1/tasks').send({ created_by: 'test-creator', title: 'test' });
      const linkRes = await request(ctx.app)
        .post(`/api/v1/tasks/${taskRes.body.id}/links`)
        .send({ url: 'https://example.com', created_by: 'agent' });

      const res = await request(ctx.app)
        .patch(`/api/v1/links/${linkRes.body.id}`)
        .send({ url: 42 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('url');
      expect(res.body.error).not.toContain('trim is not a function');
    });

    test('POST /tasks/:parentId/subtasks with number title → 400 with descriptive message', async () => {
      const parentRes = await request(ctx.app).post('/api/v1/tasks').send({ created_by: 'test-creator', title: 'parent' });

      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${parentRes.body.id}/subtasks`)
        .send({ created_by: 'test-creator', title: 42 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title');
      expect(res.body.error).not.toContain('trim is not a function');
    });
  });

  // ─── #440: Transfer returns descriptive error for missing fields ─

  describe('#440: POST /api/v1/tasks/:id/transfer validates required fields', () => {
    let taskId: number;

    beforeEach(async () => {
      const res = await request(ctx.app)
        .post('/api/v1/tasks')
        .send({ created_by: 'test-creator', title: 'transfer test', assigned_to: 'agent-a' });
      taskId = res.body.id;
    });

    test('missing comment → 400 with descriptive message mentioning comment', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/transfer`)
        .send({ current_agent: 'agent-a', new_agent: 'agent-b' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('comment');
      expect(res.body.error).not.toContain('undefined');
    });

    test('missing new_agent → 400 with descriptive message mentioning new_agent', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/transfer`)
        .send({ current_agent: 'agent-a', comment: 'reason' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('new_agent');
      expect(res.body.error).not.toContain('undefined');
    });

    test('missing current_agent → 400 with descriptive message mentioning current_agent', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/transfer`)
        .send({ new_agent: 'agent-b', comment: 'reason' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('current_agent');
      expect(res.body.error).not.toContain('undefined');
    });

    test('missing all fields → 400 with descriptive message', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/transfer`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).not.toContain('undefined');
    });

    test('valid transfer still works', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/tasks/${taskId}/transfer`)
        .send({
          current_agent: 'agent-a',
          new_agent: 'agent-b',
          comment: 'handoff',
        });

      expect(res.status).toBe(200);
      expect(res.body.task.assigned_to).toBe('agent-b');
    });
  });
});
