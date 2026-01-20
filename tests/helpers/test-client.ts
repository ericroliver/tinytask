/**
 * Test client helper for interacting with TinyTask services
 */
import { TaskService } from '../../src/services/task-service.js';
import { CommentService } from '../../src/services/comment-service.js';
import { LinkService } from '../../src/services/link-service.js';
import { QueueService } from '../../src/services/queue-service.js';
import { DatabaseClient } from '../../src/db/client.js';
import fs from 'fs';
import path from 'path';

export interface TestClient {
  taskService: TaskService & {
    createTask: TaskService['create'];
    getTask: TaskService['get'];
    updateTask: TaskService['update'];
    deleteTask: TaskService['delete'];
    archiveTask: TaskService['archive'];
    listTasks: TaskService['list'];
    getMyQueue: (agentName: string) => { agent_name: string; tasks: any[] };
  };
  commentService: CommentService & {
    addComment: CommentService['create'];
    updateComment: CommentService['update'];
    deleteComment: CommentService['delete'];
    listComments(taskId: number): any[];
  };
  linkService: LinkService & {
    addLink: LinkService['create'];
    updateLink: LinkService['update'];
    deleteLink: LinkService['delete'];
    listLinks(taskId: number): any[];
  };
  queueService: QueueService;
  db: DatabaseClient;
  cleanup: () => void;
}

/**
 * Create a test client with an in-memory database
 */
export function createTestClient(): TestClient {
  // Create a temporary test database file
  const testDbPath = path.join(process.cwd(), 'data', `test-${Date.now()}-${Math.random()}.db`);
  
  // Ensure data directory exists
  const dataDir = path.dirname(testDbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database
  const db = new DatabaseClient(testDbPath);
  db.initialize();

  // Create services
  const taskService = new TaskService(db);
  const commentService = new CommentService(db);
  const linkService = new LinkService(db);
  const queueService = new QueueService(db);

  // Add wrapper methods for test-friendly API
  const taskServiceWithWrappers = Object.assign(taskService, {
    createTask: taskService.create.bind(taskService),
    getTask: taskService.get.bind(taskService),
    updateTask: taskService.update.bind(taskService),
    deleteTask: taskService.delete.bind(taskService),
    archiveTask: taskService.archive.bind(taskService),
    listTasks: taskService.list.bind(taskService),
    getMyQueue: (agentName: string) => {
      const tasks = taskService.getQueue(agentName);
      return { agent_name: agentName, tasks };
    },
  });

  const commentServiceWithWrappers = Object.assign(commentService, {
    addComment: commentService.create.bind(commentService),
    updateComment: (id: number, content: string) => commentService.update(id, content),
    deleteComment: commentService.delete.bind(commentService),
    listComments: (taskId: number) => {
      const comments = db.query('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at', [taskId]);
      return comments;
    },
  });

  const linkServiceWithWrappers = Object.assign(linkService, {
    addLink: linkService.create.bind(linkService),
    updateLink: linkService.update.bind(linkService),
    deleteLink: linkService.delete.bind(linkService),
    listLinks: (taskId: number) => {
      const links = db.query('SELECT * FROM links WHERE task_id = ? ORDER BY created_at', [taskId]);
      return links;
    },
  });

  // Cleanup function
  const cleanup = () => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  };

  return {
    taskService: taskServiceWithWrappers,
    commentService: commentServiceWithWrappers,
    linkService: linkServiceWithWrappers,
    queueService,
    db,
    cleanup,
  };
}

/**
 * Create a task with default values for testing
 */
export function createTestTask(overrides: Partial<{
  title: string;
  description?: string;
  status?: 'idle' | 'working' | 'complete';
  priority?: number;
  assigned_to?: string;
  created_by?: string;
}> = {}) {
  return {
    title: 'Test Task',
    description: 'Test description',
    status: 'idle' as const,
    priority: 5,
    assigned_to: 'test-agent',
    created_by: 'test-creator',
    ...overrides,
  };
}
