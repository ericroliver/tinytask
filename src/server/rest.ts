/**
 * REST API adapter for TinyTask
 *
 * Thin Express router that maps all MCP tools/resources to RESTful endpoints.
 * Delegates directly to existing services — no business logic here.
 * Primarily designed for Shogun test coverage: each MCP tool → one REST endpoint.
 *
 * Base path: /api/v1
 */

import { Router, Request, Response } from 'express';
import { TaskService } from '../services/task-service.js';
import { CommentService } from '../services/comment-service.js';
import { LinkService } from '../services/link-service.js';
import { QueueService } from '../services/queue-service.js';
import { logger } from '../utils/index.js';

/**
 * Create the REST API router with all endpoints.
 */
export function createRestRouter(
  taskService: TaskService,
  commentService: CommentService,
  linkService: LinkService,
  queueService: QueueService
): Router {
  const router = Router();

  // ─── Middleware ──────────────────────────────────────────

  router.use((req, _res, next) => {
    logger.info(`REST ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
    });
    next();
  });

  // ─── Tasks ───────────────────────────────────────────────

  // POST /api/v1/tasks — create_task
  router.post('/tasks', (req: Request, res: Response) => {
    try {
      // Validate priority type if provided
      if (req.body.priority !== undefined && typeof req.body.priority !== 'number') {
        res.status(400).json({ error: 'priority must be a number' });
        return;
      }

      const task = taskService.create({
        title: req.body.title,
        description: req.body.description,
        assigned_to: req.body.assigned_to,
        created_by: req.body.created_by,
        priority: req.body.priority,
        tags: req.body.tags,
        parent_task_id: req.body.parent_task_id,
        queue_name: req.body.queue_name,
        blocked_by_task_id: req.body.blocked_by_task_id,
      });
      res.status(201).json(task);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // GET /api/v1/tasks — list_tasks
  router.get('/tasks', (req: Request, res: Response) => {
    try {
      const tasks = taskService.list({
        assigned_to: req.query.assigned_to as string | undefined,
        status: req.query.status as 'idle' | 'working' | 'complete' | undefined,
        include_archived: req.query.include_archived === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        queue_name: req.query.queue_name as string | undefined,
        parent_task_id: req.query.parent_task_id ? parseInt(req.query.parent_task_id as string, 10) : undefined,
        exclude_subtasks: req.query.exclude_subtasks === 'true',
      });
      res.json(tasks);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // GET /api/v1/tasks/:id — get_task
  router.get('/tasks/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: `Invalid task ID: ${req.params.id}` });
        return;
      }
      const task = taskService.get(id, true);
      if (!task) {
        res.status(404).json({ error: `Task ${id} not found` });
        return;
      }
      res.json(task);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // PATCH /api/v1/tasks/:id — update_task
  router.patch('/tasks/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const task = taskService.update(id, {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        assigned_to: req.body.assigned_to,
        priority: req.body.priority,
        tags: req.body.tags,
        parent_task_id: req.body.parent_task_id,
        queue_name: req.body.queue_name,
        blocked_by_task_id: req.body.blocked_by_task_id,
      });
      res.json(task);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // DELETE /api/v1/tasks/:id — delete_task
  router.delete('/tasks/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      taskService.delete(id);
      res.json({ success: true, id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // POST /api/v1/tasks/:id/archive — archive_task
  router.post('/tasks/:id/archive', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const task = taskService.archive(id);
      res.json(task);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // ─── Subtasks ───────────────────────────────────────────

  // POST /api/v1/tasks/:parentId/subtasks — create_subtask
  router.post('/tasks/:parentId/subtasks', (req: Request, res: Response) => {
    try {
      const parentTaskId = parseInt(req.params.parentId, 10);
      const task = taskService.createSubtask(parentTaskId, {
        title: req.body.title,
        description: req.body.description,
        assigned_to: req.body.assigned_to,
        created_by: req.body.created_by,
        priority: req.body.priority,
        tags: req.body.tags,
        queue_name: req.body.queue_name,
      });
      res.status(201).json(task);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found') || msg.includes('Parent')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // GET /api/v1/tasks/:parentId/subtasks — get_subtasks
  router.get('/tasks/:parentId/subtasks', (req: Request, res: Response) => {
    try {
      const parentId = parseInt(req.params.parentId, 10);
      const recursive = req.query.recursive === 'true';
      const include_archived = req.query.include_archived === 'true';
      const subtasks = taskService.getSubtasks(parentId, recursive);
      const filtered = include_archived ? subtasks : subtasks.filter(t => !t.archived_at);
      res.json(filtered);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // GET /api/v1/tasks/:id/hierarchy — get_task_with_subtasks
  router.get('/tasks/:id/hierarchy', (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      const recursive = req.query.recursive !== 'false'; // default true
      const result = taskService.getTaskWithSubtasks(taskId, recursive);
      if (!result) {
        res.status(404).json({ error: `Task ${taskId} not found` });
        return;
      }
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // PATCH /api/v1/tasks/:id/parent — move_subtask
  router.patch('/tasks/:id/parent', (req: Request, res: Response) => {
    try {
      const subtaskId = parseInt(req.params.id, 10);
      if (isNaN(subtaskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }

      // If new_parent_id is omitted, return 400 — it's a required field
      if (req.body.new_parent_id === undefined) {
        res.status(400).json({ error: 'new_parent_id is required (use null to make top-level)' });
        return;
      }

      const newParentId = req.body.new_parent_id === null
        ? null
        : parseInt(req.body.new_parent_id, 10);
      if (newParentId !== null && isNaN(newParentId)) {
        res.status(400).json({ error: 'Invalid new_parent_id' });
        return;
      }

      const result = taskService.moveSubtask(subtaskId, newParentId);
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // ─── Agent workflow ───────────────────────────────────────

  // GET /api/v1/agents/:name/queue — get_my_queue
  router.get('/agents/:name/queue', (req: Request, res: Response) => {
    try {
      const tasks = taskService.getQueue(req.params.name);
      res.json(tasks);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // POST /api/v1/agents/:name/signup — signup_for_task
  router.post('/agents/:name/signup', (req: Request, res: Response) => {
    try {
      const task = taskService.signupForTask(req.params.name);
      if (!task) {
        res.status(404).json({ error: 'No idle tasks available for signup' });
        return;
      }
      res.json(task);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // POST /api/v1/tasks/:id/transfer — move_task (transfer between agents)
  router.post('/tasks/:id/transfer', (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      const result = taskService.moveTask(
        taskId,
        req.body.current_agent,
        req.body.new_agent,
        req.body.comment
      );
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // ─── Queues ──────────────────────────────────────────────

  // GET /api/v1/queues — list_queues
  router.get('/queues', (_req: Request, res: Response) => {
    try {
      const queues = queueService.listQueues();
      res.json(queues);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // GET /api/v1/queues/:name/stats — get_queue_stats
  router.get('/queues/:name/stats', (req: Request, res: Response) => {
    try {
      const stats = queueService.getQueueStats(req.params.name);
      res.json(stats);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // POST /api/v1/queues/:name/tasks — add_task_to_queue
  router.post('/queues/:name/tasks', (req: Request, res: Response) => {
    try {
      const task = queueService.addTaskToQueue(
        parseInt(req.body.task_id, 10),
        req.params.name
      );
      res.json(task);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // GET /api/v1/queues/:name/tasks — get_queue_tasks
  router.get('/queues/:name/tasks', (req: Request, res: Response) => {
    try {
      const tasks = queueService.getQueueTasks(req.params.name, {
        assigned_to: req.query.assigned_to as string | undefined,
        status: req.query.status as 'idle' | 'working' | 'complete' | undefined,
        parent_task_id: req.query.parent_task_id ? parseInt(req.query.parent_task_id as string, 10) : undefined,
        exclude_subtasks: req.query.exclude_subtasks === 'true',
        include_archived: req.query.include_archived === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      });
      res.json(tasks);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // DELETE /api/v1/queues/:name/tasks — clear_queue
  router.delete('/queues/:name/tasks', (req: Request, res: Response) => {
    try {
      const count = queueService.clearQueue(req.params.name);
      res.json({ success: true, queue_name: req.params.name, tasks_removed: count });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // DELETE /api/v1/tasks/:id/queue — remove_task_from_queue
  router.delete('/tasks/:id/queue', (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      const task = queueService.removeTaskFromQueue(taskId);
      res.json(task);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // PATCH /api/v1/tasks/:id/queue — move_task_to_queue
  router.patch('/tasks/:id/queue', (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }

      const newQueueName = req.body?.new_queue_name;
      if (typeof newQueueName !== 'string' || newQueueName.trim().length === 0) {
        res.status(400).json({ error: 'new_queue_name is required and must be a non-empty string' });
        return;
      }

      const task = queueService.moveTaskToQueue(taskId, newQueueName);
      res.json(task);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // ─── Comments ────────────────────────────────────────────

  // POST /api/v1/tasks/:id/comments — add_comment
  router.post('/tasks/:id/comments', (req: Request, res: Response) => {
    try {
      const comment = commentService.create({
        task_id: parseInt(req.params.id, 10),
        content: req.body.content,
        created_by: req.body.created_by,
      });
      res.status(201).json(comment);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // GET /api/v1/tasks/:id/comments — list_comments
  router.get('/tasks/:id/comments', (req: Request, res: Response) => {
    try {
      const comments = commentService.listByTask(parseInt(req.params.id, 10));
      res.json(comments);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // PATCH /api/v1/comments/:id — update_comment
  router.patch('/comments/:id', (req: Request, res: Response) => {
    try {
      const comment = commentService.update(parseInt(req.params.id, 10), req.body.content);
      res.json(comment);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // DELETE /api/v1/comments/:id — delete_comment
  router.delete('/comments/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      commentService.delete(id);
      res.json({ success: true, id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // ─── Links ───────────────────────────────────────────────

  // POST /api/v1/tasks/:id/links — add_link
  router.post('/tasks/:id/links', (req: Request, res: Response) => {
    try {
      const link = linkService.create({
        task_id: parseInt(req.params.id, 10),
        url: req.body.url,
        description: req.body.description,
        created_by: req.body.created_by,
      });
      res.status(201).json(link);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // GET /api/v1/tasks/:id/links — list_links
  router.get('/tasks/:id/links', (req: Request, res: Response) => {
    try {
      const links = linkService.listByTask(parseInt(req.params.id, 10));
      res.json(links);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // PATCH /api/v1/links/:id — update_link
  router.patch('/links/:id', (req: Request, res: Response) => {
    try {
      const link = linkService.update(parseInt(req.params.id, 10), {
        url: req.body.url,
        description: req.body.description,
      });
      res.json(link);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  // DELETE /api/v1/links/:id — delete_link
  router.delete('/links/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      linkService.delete(id);
      res.json({ success: true, id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
      } else {
        res.status(400).json({ error: msg });
      }
    }
  });

  return router;
}
