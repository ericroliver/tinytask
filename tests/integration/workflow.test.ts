/**
 * Multi-Agent Workflow Integration Tests
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient, createTestTask, TestClient } from '../helpers/test-client.js';

describe('Multi-Agent Workflow', () => {
  let client: TestClient;
  let taskId: number;

  beforeEach(() => {
    client = createTestClient();
  });

  afterEach(() => {
    client.cleanup();
  });

  test('Product agent creates task', () => {
    const taskData = createTestTask({
      title: 'Implement dark mode',
      description: 'Add dark mode toggle',
      assigned_to: 'architect-agent',
      created_by: 'product-agent',
      priority: 10,
    });

    const result = client.taskService.createTask(taskData);

    expect(result.id).toBeDefined();
    expect(result.title).toBe('Implement dark mode');
    expect(result.assigned_to).toBe('architect-agent');
    expect(result.created_by).toBe('product-agent');
    taskId = result.id;
  });

  test('Architect agent queries queue', () => {
    // Create a task assigned to architect-agent
    const task = client.taskService.createTask(
      createTestTask({
        assigned_to: 'architect-agent',
        created_by: 'product-agent',
      })
    );
    taskId = task.id;

    const result = client.taskService.getMyQueue('architect-agent');

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe(taskId);
    expect(result.tasks[0].assigned_to).toBe('architect-agent');
  });

  test('Architect agent updates status', () => {
    const task = client.taskService.createTask(
      createTestTask({ assigned_to: 'architect-agent' })
    );
    taskId = task.id;

    client.taskService.updateTask(taskId, { status: 'working' });

    const retrieved = client.taskService.getTask(taskId);
    expect(retrieved?.status).toBe('working');
  });

  test('Architect agent adds comment', () => {
    const task = client.taskService.createTask(
      createTestTask({ assigned_to: 'architect-agent' })
    );
    taskId = task.id;

    const result = client.commentService.addComment({
      task_id: taskId,
      content: 'Created design document',
      created_by: 'architect-agent',
    });

    expect(result.id).toBeDefined();
    expect(result.content).toBe('Created design document');
    expect(result.created_by).toBe('architect-agent');
  });

  test('Architect agent adds link', () => {
    const task = client.taskService.createTask(
      createTestTask({ assigned_to: 'architect-agent' })
    );
    taskId = task.id;

    const result = client.linkService.addLink({
      task_id: taskId,
      url: '/docs/dark-mode-design.md',
      description: 'Design document',
      created_by: 'architect-agent',
    });

    expect(result.id).toBeDefined();
    expect(result.url).toBe('/docs/dark-mode-design.md');
    expect(result.description).toBe('Design document');
  });

  test('Architect agent reassigns to code agent', () => {
    const task = client.taskService.createTask(
      createTestTask({ assigned_to: 'architect-agent' })
    );
    taskId = task.id;

    client.taskService.updateTask(taskId, {
      assigned_to: 'code-agent',
      status: 'idle',
    });

    const retrieved = client.taskService.getTask(taskId);
    expect(retrieved?.assigned_to).toBe('code-agent');
    expect(retrieved?.status).toBe('idle');
  });

  test('Code agent completes task', () => {
    const task = client.taskService.createTask(
      createTestTask({ assigned_to: 'code-agent' })
    );
    taskId = task.id;

    client.taskService.updateTask(taskId, { status: 'complete' });

    const retrieved = client.taskService.getTask(taskId);
    expect(retrieved?.status).toBe('complete');
  });

  test('Complete workflow: Create -> Comment -> Link -> Reassign -> Complete', () => {
    // Product agent creates task
    const task = client.taskService.createTask(
      createTestTask({
        title: 'Full workflow test',
        assigned_to: 'architect-agent',
        created_by: 'product-agent',
      })
    );
    taskId = task.id;

    // Architect agent starts working
    client.taskService.updateTask(taskId, { status: 'working' });

    // Architect agent adds comment
    const comment = client.commentService.addComment({
      task_id: taskId,
      content: 'Architecture planned',
      created_by: 'architect-agent',
    });

    // Architect agent adds link
    const link = client.linkService.addLink({
      task_id: taskId,
      url: '/docs/architecture.md',
      description: 'Architecture doc',
      created_by: 'architect-agent',
    });

    // Architect agent reassigns to code agent
    client.taskService.updateTask(taskId, {
      assigned_to: 'code-agent',
      status: 'idle',
    });

    // Code agent starts working
    client.taskService.updateTask(taskId, { status: 'working' });

    // Code agent adds comment
    client.commentService.addComment({
      task_id: taskId,
      content: 'Implementation complete',
      created_by: 'code-agent',
    });

    // Code agent completes task
    client.taskService.updateTask(taskId, { status: 'complete' });

    // Verify full task history
    const finalTask = client.taskService.getTask(taskId, true);
    expect(finalTask?.status).toBe('complete');
    expect(finalTask?.assigned_to).toBe('code-agent');
    expect(finalTask?.comments).toHaveLength(2);
    expect(finalTask?.links).toHaveLength(1);
  });

  test('Multiple agents working concurrently', () => {
    // Create tasks for multiple agents
    const task1 = client.taskService.createTask(
      createTestTask({
        title: 'Task 1',
        assigned_to: 'agent-1',
      })
    );

    const task2 = client.taskService.createTask(
      createTestTask({
        title: 'Task 2',
        assigned_to: 'agent-2',
      })
    );

    const task3 = client.taskService.createTask(
      createTestTask({
        title: 'Task 3',
        assigned_to: 'agent-1',
      })
    );

    // Agent 1 should see 2 tasks
    const agent1Queue = client.taskService.getMyQueue('agent-1');
    expect(agent1Queue.tasks).toHaveLength(2);

    // Agent 2 should see 1 task
    const agent2Queue = client.taskService.getMyQueue('agent-2');
    expect(agent2Queue.tasks).toHaveLength(1);

    // Both agents update their tasks
    client.taskService.updateTask(task1.id, { status: 'working' });
    client.taskService.updateTask(task2.id, { status: 'working' });

    // Verify updates
    const updatedTask1 = client.taskService.getTask(task1.id);
    const updatedTask2 = client.taskService.getTask(task2.id);

    expect(updatedTask1?.status).toBe('working');
    expect(updatedTask2?.status).toBe('working');
  });
});
