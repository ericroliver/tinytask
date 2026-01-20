import chalk from 'chalk';
import { Formatter, FormatterOptions } from './types.js';

export class CompactFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}

  format(data: unknown): string {
    if (Array.isArray(data)) {
      return data.map((task) => this.formatTask(task)).join('\n');
    } else if (
      typeof data === 'object' &&
      data !== null &&
      'task_id' in data &&
      'comments' in data
    ) {
      return this.formatComments(data as Record<string, unknown>);
    } else if (typeof data === 'object' && data !== null && 'task_id' in data && 'links' in data) {
      return this.formatLinks(data as Record<string, unknown>);
    } else {
      return this.formatTask(data);
    }
  }

  private formatLinks(linkData: Record<string, unknown>): string {
    const { task_id, count, links } = linkData;
    const lines = [];

    const header = `Task #${task_id} - ${count} link${count !== 1 ? 's' : ''}`;
    lines.push(this.options.color ? chalk.cyan.bold(header) : header);

    if (!Array.isArray(links) || links.length === 0) {
      const msg = 'No links';
      lines.push(this.options.color ? chalk.yellow(msg) : msg);
      return lines.join('\n');
    }

    links.forEach((link) => {
      const l = link as Record<string, unknown>;
      const date = new Date(String(l.created_at)).toLocaleString();
      const desc = l.description ? ` - ${l.description}` : '';
      lines.push(
        this.options.color
          ? `  ${chalk.bold(`[${l.id}]`)} ${l.url} ${chalk.gray(desc)}${desc ? '' : ''} ${chalk.gray(`(${date})`)}`
          : `  [${l.id}] ${l.url}${desc} (${date})`
      );
    });

    return lines.join('\n');
  }

  private formatComments(commentData: Record<string, unknown>): string {
    const { task_id, count, comments } = commentData;
    const lines = [];

    const header = `Task #${task_id} - ${count} comment${count !== 1 ? 's' : ''}`;
    lines.push(this.options.color ? chalk.cyan.bold(header) : header);

    if (!Array.isArray(comments) || comments.length === 0) {
      const msg = 'No comments';
      lines.push(this.options.color ? chalk.yellow(msg) : msg);
      return lines.join('\n');
    }

    comments.forEach((comment) => {
      const c = comment as Record<string, unknown>;
      const author = c.created_by || 'Unknown';
      const date = new Date(String(c.created_at)).toLocaleString();
      lines.push(
        this.options.color
          ? `  ${chalk.bold(`[${c.id}]`)} ${chalk.gray(author)} ${chalk.gray(`(${date})`)} - ${c.content}`
          : `  [${c.id}] ${author} (${date}) - ${c.content}`
      );
    });

    return lines.join('\n');
  }

  private formatTask(task: unknown): string {
    const t = task as Record<string, unknown>;
    const parts = [];

    // ID
    parts.push(this.formatId(t.id as number));

    // Title
    parts.push(this.truncate(String(t.title), 40));

    // Status
    parts.push(`(${this.formatStatus(String(t.status))})`);

    // Assignee
    if (t.assigned_to) {
      parts.push(`@${t.assigned_to}`);
    }

    // Priority
    if (t.priority !== 0) {
      parts.push(`p:${t.priority}`);
    }

    // Tags
    if (Array.isArray(t.tags) && t.tags.length > 0) {
      parts.push(`[${t.tags.join(', ')}]`);
    }

    return parts.join(' ');
  }

  private formatId(id: number): string {
    const formatted = `[${id}]`;
    return this.options.color ? chalk.bold(formatted) : formatted;
  }

  private formatStatus(status: string): string {
    if (!this.options.color) {
      return status;
    }

    switch (status) {
      case 'idle':
        return chalk.yellow(status);
      case 'working':
        return chalk.blue(status);
      case 'complete':
        return chalk.green(status);
      default:
        return status;
    }
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) {
      return str;
    }
    return str.substring(0, maxLen - 3) + '...';
  }
}
