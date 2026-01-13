import { describe, it, expect } from 'vitest';
import { TableFormatter } from '../../../src/formatters/table.js';

describe('TableFormatter', () => {
  const tasks = [
    {
      id: 1,
      title: 'Test Task',
      status: 'idle',
      assigned_to: 'alice',
      priority: 5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  it('should format tasks as table', () => {
    const formatter = new TableFormatter({ color: false, verbose: false });
    const output = formatter.formatTasks(tasks);

    expect(output).toContain('Test Task');
    expect(output).toContain('idle');
    expect(output).toContain('alice');
  });

  it('should handle empty task list', () => {
    const formatter = new TableFormatter({ color: false, verbose: false });
    const output = formatter.formatTasks([]);

    expect(output).toContain('No tasks found');
  });

  it('should truncate long titles', () => {
    const longTask = {
      ...tasks[0],
      title: 'A'.repeat(100),
    };

    const formatter = new TableFormatter({ color: false, verbose: false });
    const output = formatter.formatTasks([longTask]);

    expect(output).toContain('...');
  });

  it('should format single task with details', () => {
    const formatter = new TableFormatter({ color: false, verbose: false });
    const output = formatter.formatTask(tasks[0]);

    expect(output).toContain('Task #1');
    expect(output).toContain('Test Task');
    expect(output).toContain('alice');
  });

  it('should format queue data', () => {
    const formatter = new TableFormatter({ color: false, verbose: false });
    const queueData = {
      agent: 'test-agent',
      count: 1,
      tasks: tasks,
    };
    const output = formatter.formatQueue(queueData);

    expect(output).toContain('Queue for test-agent');
    expect(output).toContain('1 task');
  });
});
