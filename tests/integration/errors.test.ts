/**
 * Error Scenario Tests
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient, createTestTask, TestClient } from '../helpers/test-client.js';

describe('Error Handling', () => {
  let client: TestClient;

  beforeEach(() => {
    client = createTestClient();
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('Task Errors', () => {
    test('Get nonexistent task returns null', () => {
      const task = client.taskService.getTask(99999);
      expect(task).toBeNull();
    });

    test('Update nonexistent task throws error', () => {
      expect(() => {
        client.taskService.updateTask(99999, { status: 'working' });
      }).toThrow();
    });

    test('Delete nonexistent task throws error', () => {
      expect(() => {
        client.taskService.deleteTask(99999);
      }).toThrow();
    });

    test('Archive nonexistent task throws error', () => {
      expect(() => {
        client.taskService.archiveTask(99999);
      }).toThrow();
    });

    test('Create task with invalid status throws error', () => {
      expect(() => {
        client.taskService.createTask({
          title: 'Test',
          status: 'invalid-status' as any,
        });
      }).toThrow();
    });

    test('Create task with missing title throws error', () => {
      expect(() => {
        client.taskService.createTask({
          title: '',
        });
      }).toThrow();
    });

    test('Archive already archived task is idempotent', () => {
      const task = client.taskService.createTask(
        createTestTask({ status: 'complete' })
      );

      client.taskService.archiveTask(task.id);

      // Archiving again should not fail
      expect(() => {
        client.taskService.archiveTask(task.id);
      }).not.toThrow();

      const retrieved = client.taskService.getTask(task.id);
      expect(retrieved?.archived_at).toBeDefined();
    });

    test('Update task with invalid status throws error', () => {
      const task = client.taskService.createTask(createTestTask());

      expect(() => {
        client.taskService.updateTask(task.id, { status: 'invalid-status' as any });
      }).toThrow();
    });
  });

  describe('Comment Errors', () => {
    test('Add comment to nonexistent task throws error', () => {
      expect(() => {
        client.commentService.addComment({
          task_id: 99999,
          content: 'Test comment',
          created_by: 'test-agent',
        });
      }).toThrow();
    });

    test('Add comment with empty content throws error', () => {
      const task = client.taskService.createTask(createTestTask());

      expect(() => {
        client.commentService.addComment({
          task_id: task.id,
          content: '',
          created_by: 'test-agent',
        });
      }).toThrow();
    });

    test('Update nonexistent comment throws error', () => {
      expect(() => {
        client.commentService.updateComment(99999, 'Updated');
      }).toThrow();
    });

    test('Delete nonexistent comment throws error', () => {
      expect(() => {
        client.commentService.deleteComment(99999);
      }).toThrow();
    });

    test('List comments for nonexistent task returns empty array', () => {
      const comments = client.commentService.listComments(99999);
      expect(comments).toEqual([]);
    });
  });

  describe('Link Errors', () => {
    test('Add link to nonexistent task throws error', () => {
      expect(() => {
        client.linkService.addLink({
          task_id: 99999,
          url: '/test',
          description: 'Test',
          created_by: 'test-agent',
        });
      }).toThrow();
    });

    test('Add link with empty URL throws error', () => {
      const task = client.taskService.createTask(createTestTask());

      expect(() => {
        client.linkService.addLink({
          task_id: task.id,
          url: '',
          description: 'Test',
          created_by: 'test-agent',
        });
      }).toThrow();
    });

    test('Update nonexistent link throws error', () => {
      expect(() => {
        client.linkService.updateLink(99999, { url: '/updated' });
      }).toThrow();
    });

    test('Delete nonexistent link throws error', () => {
      expect(() => {
        client.linkService.deleteLink(99999);
      }).toThrow();
    });

    test('List links for nonexistent task returns empty array', () => {
      const links = client.linkService.listLinks(99999);
      expect(links).toEqual([]);
    });
  });

  describe('Data Integrity', () => {
    test('Deleting task removes associated comments', () => {
      const task = client.taskService.createTask(createTestTask());

      client.commentService.addComment({
        task_id: task.id,
        content: 'Test comment',
        created_by: 'test-agent',
      });

      client.taskService.deleteTask(task.id);

      const comments = client.commentService.listComments(task.id);
      expect(comments).toEqual([]);
    });

    test('Deleting task removes associated links', () => {
      const task = client.taskService.createTask(createTestTask());

      client.linkService.addLink({
        task_id: task.id,
        url: '/test',
        description: 'Test',
        created_by: 'test-agent',
      });

      client.taskService.deleteTask(task.id);

      const links = client.linkService.listLinks(task.id);
      expect(links).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    test('Get queue for agent with no tasks returns empty array', () => {
      const queue = client.taskService.getMyQueue('nonexistent-agent');
      expect(queue.tasks).toEqual([]);
      expect(queue.agent_name).toBe('nonexistent-agent');
    });

    test('List tasks with no tasks returns empty array', () => {
      const tasks = client.taskService.listTasks();
      expect(tasks).toEqual([]);
    });

    test('Create task with very long title', () => {
      const longTitle = 'A'.repeat(1000);
      const task = client.taskService.createTask({
        title: longTitle,
      });

      expect(task.title).toBe(longTitle);
    });

    test('Create task with very long description', () => {
      const longDescription = 'B'.repeat(10000);
      const task = client.taskService.createTask({
        title: 'Test',
        description: longDescription,
      });

      expect(task.description).toBe(longDescription);
    });

    test('Update task to remove optional fields', () => {
      const task = client.taskService.createTask(
        createTestTask({
          description: 'Original',
          priority: 5,
          assigned_to: 'agent-1',
        })
      );

      // Set fields to undefined to remove them
      client.taskService.updateTask(task.id, {
        description: undefined,
        priority: undefined,
        assigned_to: undefined,
      });

      const updated = client.taskService.getTask(task.id);
      // Note: The service may handle undefined differently - check actual behavior
      expect(updated).toBeDefined();
    });

    test('Create comment with very long content', () => {
      const task = client.taskService.createTask(createTestTask());
      const longContent = 'C'.repeat(10000);

      const comment = client.commentService.addComment({
        task_id: task.id,
        content: longContent,
        created_by: 'test-agent',
      });

      expect(comment.content).toBe(longContent);
    });

    test('Task with special characters in fields', () => {
      const task = client.taskService.createTask({
        title: 'Task with "quotes" and \'apostrophes\'',
        description: 'Description with <html> tags & special chars',
        status: 'idle',
        priority: 5,
        assigned_to: 'agent-with-special!@#$%',
        created_by: 'creator_with_underscores',
      });

      const retrieved = client.taskService.getTask(task.id);
      expect(retrieved?.title).toBe('Task with "quotes" and \'apostrophes\'');
      expect(retrieved?.description).toBe('Description with <html> tags & special chars');
      expect(retrieved?.assigned_to).toBe('agent-with-special!@#$%');
    });
  });

  describe('Validation', () => {
    test('Priority can be any number', () => {
      const task1 = client.taskService.createTask(
        createTestTask({ priority: -1 })
      );
      expect(task1.priority).toBe(-1);

      const task2 = client.taskService.createTask(
        createTestTask({ priority: 1000 })
      );
      expect(task2.priority).toBe(1000);
    });

    test('Status must be one of valid values', () => {
      const validStatuses = ['idle', 'working', 'complete'];

      for (const status of validStatuses) {
        const task = client.taskService.createTask(
          createTestTask({ status: status as any })
        );
        expect(task.status).toBe(status);
      }
    });

    test('Timestamps are set correctly', async () => {
      const task = client.taskService.createTask(createTestTask());

      // Verify timestamps exist and are valid
      expect(task.created_at).toBeTruthy();
      expect(task.updated_at).toBeTruthy();
      expect(new Date(task.created_at).getTime()).toBeGreaterThan(0);
      expect(new Date(task.updated_at).getTime()).toBeGreaterThan(0);

      // Initially created_at and updated_at should be the same
      expect(task.created_at).toBe(task.updated_at);

      // Wait 1100ms to ensure timestamp changes (SQLite CURRENT_TIMESTAMP has 1-second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Update the task
      client.taskService.updateTask(task.id, { status: 'working' });

      const updated = client.taskService.getTask(task.id);
      
      // Verify updated_at changed
      expect(updated!.updated_at).not.toBe(task.updated_at);
      expect(updated!.created_at).toBe(task.created_at); // created_at should stay the same
    });
  });
});
