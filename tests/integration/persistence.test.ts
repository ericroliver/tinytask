/**
 * Data Persistence Tests
 */
import { describe, test, expect } from 'vitest';
import { DatabaseClient } from '../../src/db/client.js';
import { TaskService } from '../../src/services/task-service.js';
import { CommentService } from '../../src/services/comment-service.js';
import { LinkService } from '../../src/services/link-service.js';
import fs from 'fs';
import path from 'path';

describe('Data Persistence', () => {
  test('Data survives database close and reopen', () => {
    const testDbPath = path.join(process.cwd(), 'data', `persistence-test-${Date.now()}.db`);

    try {
      // Create and populate database
      let db = new DatabaseClient(testDbPath);
      db.initialize();
      let taskService = new TaskService(db);
      let commentService = new CommentService(db);
      let linkService = new LinkService(db);

      const task = taskService.create({
        title: 'Test persistence',
        description: 'This should survive restart',
        status: 'idle',
        priority: 5,
        assigned_to: 'test-agent',
        created_by: 'test-creator',
      });

      const comment = commentService.create({
        task_id: task.id,
        content: 'Test comment',
        created_by: 'test-agent',
      });

      const link = linkService.create({
        task_id: task.id,
        url: '/test/link',
        description: 'Test link',
        created_by: 'test-agent',
      });

      const taskId = task.id;
      const commentId = comment.id;
      const linkId = link.id;

      // Close database
      db.close();

      // Reopen database
      db = new DatabaseClient(testDbPath);
      db.initialize();
      taskService = new TaskService(db);
      commentService = new CommentService(db);
      linkService = new LinkService(db);

      // Retrieve and verify data
      const retrievedTask = taskService.get(taskId);
      expect(retrievedTask?.id).toBe(taskId);
      expect(retrievedTask?.title).toBe('Test persistence');
      expect(retrievedTask?.description).toBe('This should survive restart');
      expect(retrievedTask?.assigned_to).toBe('test-agent');

      // Verify comments persisted
      const comments = db.query('SELECT * FROM comments WHERE task_id = ?', [taskId]);
      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe(commentId);
      expect(comments[0].content).toBe('Test comment');

      // Verify links persisted
      const links = db.query('SELECT * FROM links WHERE task_id = ?', [taskId]);
      expect(links).toHaveLength(1);
      expect(links[0].id).toBe(linkId);
      expect(links[0].url).toBe('/test/link');

      // Cleanup
      db.close();
    } finally {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    }
  });

  test('Multiple tasks persist correctly', () => {
    const testDbPath = path.join(process.cwd(), 'data', `multi-persist-test-${Date.now()}.db`);

    try {
      // Create database and add multiple tasks
      let db = new DatabaseClient(testDbPath);
      db.initialize();
      let taskService = new TaskService(db);

      const tasks = [];
      for (let i = 0; i < 10; i++) {
        const task = taskService.create({
          title: `Task ${i}`,
          description: `Description ${i}`,
          status: i % 2 === 0 ? 'idle' : 'working',
          priority: i,
          assigned_to: `agent-${i % 3}`,
          created_by: 'test-creator',
        });
        tasks.push(task);
      }

      db.close();

      // Reopen and verify
      db = new DatabaseClient(testDbPath);
      db.initialize();
      taskService = new TaskService(db);

      for (let i = 0; i < 10; i++) {
        const retrieved = taskService.get(tasks[i].id);
        expect(retrieved?.title).toBe(`Task ${i}`);
        expect(retrieved?.description).toBe(`Description ${i}`);
        expect(retrieved?.status).toBe(i % 2 === 0 ? 'idle' : 'working');
        expect(retrieved?.priority).toBe(i);
        expect(retrieved?.assigned_to).toBe(`agent-${i % 3}`);
      }

      db.close();
    } finally {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    }
  });

  test('Task relationships persist after restart', () => {
    const testDbPath = path.join(process.cwd(), 'data', `relationships-test-${Date.now()}.db`);

    try {
      // Create task with comments and links
      let db = new DatabaseClient(testDbPath);
      db.initialize();
      let taskService = new TaskService(db);
      let commentService = new CommentService(db);
      let linkService = new LinkService(db);

      const task = taskService.create({
        title: 'Task with relationships',
        description: 'Test',
        status: 'idle',
        priority: 5,
        assigned_to: 'test-agent',
        created_by: 'test-creator',
      });

      // Add multiple comments
      for (let i = 0; i < 3; i++) {
        commentService.create({
          task_id: task.id,
          content: `Comment ${i}`,
          created_by: 'test-agent',
        });
      }

      // Add multiple links
      for (let i = 0; i < 2; i++) {
        linkService.create({
          task_id: task.id,
          url: `/link/${i}`,
          description: `Link ${i}`,
          created_by: 'test-agent',
        });
      }

      db.close();

      // Reopen and verify relationships
      db = new DatabaseClient(testDbPath);
      db.initialize();
      taskService = new TaskService(db);

      const retrieved = taskService.get(task.id, true);
      expect(retrieved?.comments).toHaveLength(3);
      expect(retrieved?.links).toHaveLength(2);

      for (let i = 0; i < 3; i++) {
        expect(retrieved?.comments?.[i].content).toBe(`Comment ${i}`);
      }

      for (let i = 0; i < 2; i++) {
        expect(retrieved?.links?.[i].url).toBe(`/link/${i}`);
      }

      db.close();
    } finally {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    }
  });

  test('Archived tasks persist correctly', () => {
    const testDbPath = path.join(process.cwd(), 'data', `archive-persist-test-${Date.now()}.db`);

    try {
      let db = new DatabaseClient(testDbPath);
      db.initialize();
      let taskService = new TaskService(db);

      const task = taskService.create({
        title: 'Task to archive',
        description: 'Test archival',
        status: 'complete',
        priority: 5,
        assigned_to: 'test-agent',
        created_by: 'test-creator',
      });

      taskService.archive(task.id);

      db.close();

      // Reopen and verify archived state persists
      db = new DatabaseClient(testDbPath);
      db.initialize();
      taskService = new TaskService(db);

      const retrieved = taskService.get(task.id);
      expect(retrieved?.archived_at).not.toBeNull();
      expect(retrieved?.archived_at).toBeDefined();

      db.close();
    } finally {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    }
  });
});
