import chalk from 'chalk';
import { Formatter, FormatterOptions } from './types.js';

interface QueueStats {
  queue_name: string;
  total_tasks: number;
  idle_tasks: number;
  working_tasks: number;
  complete_tasks: number;
  assigned_tasks: number;
  unassigned_tasks: number;
  agents?: string[];
}

export class StatsFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}

  format(data: unknown): string {
    const stats = data as QueueStats;

    if (!stats || typeof stats !== 'object') {
      return this.options.color ? chalk.red('Invalid stats data') : 'Invalid stats data';
    }

    const lines: string[] = [];

    // Queue name header
    const queueHeader = `Queue: ${stats.queue_name}`;
    lines.push(this.options.color ? chalk.cyan.bold(queueHeader) : queueHeader);
    lines.push(this.formatSeparator());
    lines.push('');

    // Total tasks
    lines.push(this.formatLine('Total Tasks:', stats.total_tasks, 'cyan'));

    // Status breakdown
    if (stats.total_tasks > 0) {
      lines.push(this.formatLine('  Idle:', stats.idle_tasks, 'gray'));
      lines.push(this.formatLine('  Working:', stats.working_tasks, 'yellow'));
      lines.push(this.formatLine('  Complete:', stats.complete_tasks, 'green'));
      lines.push('');
    }

    // Assignment breakdown
    lines.push(this.formatLine('Assignment:', '', 'cyan'));
    lines.push(this.formatLine('  Assigned:', stats.assigned_tasks, 'green'));
    lines.push(this.formatLine('  Unassigned:', stats.unassigned_tasks, 'yellow'));

    // Agents list
    if (stats.agents && stats.agents.length > 0) {
      lines.push('');
      const agentsList = stats.agents.join(', ');
      lines.push(
        this.options.color
          ? `${chalk.cyan('Agents:')}       ${chalk.green(agentsList)}`
          : `Agents:       ${agentsList}`
      );
    }

    return lines.join('\n');
  }

  private formatLine(label: string, value: string | number, valueColor?: string): string {
    const valueStr = String(value);

    if (!this.options.color) {
      return `${label.padEnd(15)} ${valueStr}`;
    }

    const coloredLabel = chalk.gray(label);
    let coloredValue = valueStr;

    if (valueColor && valueStr !== '') {
      switch (valueColor) {
        case 'cyan':
          coloredValue = chalk.cyan(valueStr);
          break;
        case 'green':
          coloredValue = chalk.green(valueStr);
          break;
        case 'yellow':
          coloredValue = chalk.yellow(valueStr);
          break;
        case 'red':
          coloredValue = chalk.red(valueStr);
          break;
        case 'gray':
          coloredValue = chalk.gray(valueStr);
          break;
      }
    }

    return `${coloredLabel.padEnd(25)} ${coloredValue}`;
  }

  private formatSeparator(): string {
    const separator = '─'.repeat(25);
    return this.options.color ? chalk.gray(separator) : separator;
  }
}
