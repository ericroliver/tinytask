import chalk from 'chalk';
import { Formatter, FormatterOptions } from './types.js';

interface TaskNode {
  id: number;
  title: string;
  status?: string;
  assigned_to?: string | null;
  queue_name?: string | null;
  priority?: number;
  subtasks?: TaskNode[];
}

export class TreeFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}

  format(data: unknown): string {
    const task = data as TaskNode;

    if (!task || typeof task !== 'object') {
      return this.options.color ? chalk.red('Invalid task data') : 'Invalid task data';
    }

    const lines: string[] = [];
    this.formatNode(task, '', true, lines);
    return lines.join('\n');
  }

  private formatNode(node: TaskNode, prefix: string, isLast: boolean, lines: string[]): void {
    // Format the current node
    const connector = isLast ? '└── ' : '├── ';
    const taskInfo = this.formatTaskInfo(node);

    if (prefix === '') {
      // Root node - no connector
      lines.push(taskInfo);
    } else {
      lines.push(prefix + connector + taskInfo);
    }

    // Process subtasks if they exist
    const subtasks = node.subtasks || [];
    if (subtasks.length > 0) {
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      subtasks.forEach((subtask, index) => {
        const isLastChild = index === subtasks.length - 1;
        this.formatNode(subtask, childPrefix, isLastChild, lines);
      });
    }
  }

  private formatTaskInfo(task: TaskNode): string {
    const parts: string[] = [];

    // Task ID and title
    if (this.options.color) {
      parts.push(chalk.cyan(`Task #${task.id}:`));
      parts.push(chalk.bold(task.title));
    } else {
      parts.push(`Task #${task.id}: ${task.title}`);
    }

    // Additional info in brackets
    const info: string[] = [];

    if (task.queue_name) {
      info.push(this.options.color ? chalk.blue(task.queue_name) : task.queue_name);
    }

    if (task.status) {
      info.push(this.formatStatus(task.status));
    }

    if (task.assigned_to) {
      info.push(this.options.color ? chalk.green(task.assigned_to) : task.assigned_to);
    } else {
      info.push(this.options.color ? chalk.gray('unassigned') : 'unassigned');
    }

    if (task.priority !== undefined && task.priority !== 0) {
      const priorityStr = `P${task.priority}`;
      info.push(
        this.options.color
          ? task.priority > 5
            ? chalk.red(priorityStr)
            : chalk.yellow(priorityStr)
          : priorityStr
      );
    }

    if (info.length > 0) {
      if (this.options.color) {
        parts.push(chalk.gray('[') + info.join(chalk.gray(', ')) + chalk.gray(']'));
      } else {
        parts.push(`[${info.join(', ')}]`);
      }
    }

    return parts.join(' ');
  }

  private formatStatus(status: string): string {
    if (!this.options.color) {
      return status;
    }

    switch (status.toLowerCase()) {
      case 'idle':
        return chalk.gray(status);
      case 'working':
        return chalk.yellow(status);
      case 'complete':
        return chalk.green(status);
      default:
        return status;
    }
  }
}
