# Story 4: TinyTask CLI - Output Formatters

## Overview
Implement output formatters for multiple formats (table, JSON, CSV, compact) to support both human and machine consumption of CLI output.

## User Story
As a CLI user, I want flexible output formatting so that I can read data in my terminal or parse it in scripts.

## Acceptance Criteria
- [ ] Table formatter with colored output
- [ ] JSON formatter for machine parsing
- [ ] CSV formatter for spreadsheet export
- [ ] Compact formatter for quick scanning
- [ ] Formatter factory to select format
- [ ] Color disable option works
- [ ] Proper truncation for long fields
- [ ] Empty result handling

## Technical Details

### Formatter Interface
```typescript
// src/formatters/types.ts
export interface FormatterOptions {
  color: boolean;
  verbose: boolean;
}

export interface Formatter<T = any> {
  format(data: T): string;
}
```

### Table Formatter
```typescript
// src/formatters/table.ts
import Table from 'cli-table3';
import chalk from 'chalk';
import { Formatter, FormatterOptions } from './types.js';

export class TableFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}
  
  formatTasks(tasks: any[]): string {
    if (tasks.length === 0) {
      return chalk.yellow('No tasks found');
    }
    
    const table = new Table({
      head: this.formatHeader(['ID', 'Title', 'Status', 'Assigned', 'Priority']),
      style: {
        head: [],
        border: this.options.color ? ['gray'] : [],
      },
      colWidths: [6, 40, 12, 15, 10],
      wordWrap: true,
    });
    
    tasks.forEach(task => {
      table.push([
        this.formatId(task.id),
        this.truncate(task.title, 38),
        this.formatStatus(task.status),
        this.formatAssignee(task.assigned_to),
        this.formatPriority(task.priority),
      ]);
    });
    
    return table.toString();
  }
  
  formatTask(task: any): string {
    const lines = [];
    
    lines.push(chalk.cyan.bold(`Task #${task.id}`));
    lines.push('');
    lines.push(`${chalk.gray('Title:')}       ${task.title}`);
    lines.push(`${chalk.gray('Status:')}      ${this.formatStatus(task.status)}`);
    lines.push(`${chalk.gray('Assigned:')}    ${task.assigned_to || '-'}`);
    lines.push(`${chalk.gray('Priority:')}    ${task.priority}`);
    
    if (task.description) {
      lines.push(`${chalk.gray('Description:')} ${task.description}`);
    }
    
    if (task.tags && task.tags.length > 0) {
      lines.push(`${chalk.gray('Tags:')}        ${task.tags.join(', ')}`);
    }
    
    if (task.created_by) {
      lines.push(`${chalk.gray('Created by:')}  ${task.created_by}`);
    }
    
    lines.push(`${chalk.gray('Created:')}     ${this.formatDate(task.created_at)}`);
    lines.push(`${chalk.gray('Updated:')}     ${this.formatDate(task.updated_at)}`);
    
    if (task.comments && task.comments.length > 0) {
      lines.push('');
      lines.push(chalk.cyan.bold('Comments:'));
      task.comments.forEach((comment: any) => {
        lines.push(`  [${comment.id}] ${comment.created_by || 'Unknown'}: ${comment.content}`);
      });
    }
    
    if (task.links && task.links.length > 0) {
      lines.push('');
      lines.push(chalk.cyan.bold('Links:'));
      task.links.forEach((link: any) => {
        lines.push(`  [${link.id}] ${link.url}`);
        if (link.description) {
          lines.push(`       ${chalk.gray(link.description)}`);
        }
      });
    }
    
    return lines.join('\n');
  }
  
  formatQueue(queueData: any): string {
    const { agent, count, tasks } = queueData;
    
    const lines = [];
    lines.push(chalk.cyan.bold(`Queue for ${agent}`));
    lines.push(chalk.gray(`${count} task${count !== 1 ? 's' : ''}`));
    lines.push('');
    
    if (tasks.length === 0) {
      return lines.join('\n') + chalk.yellow('No tasks in queue');
    }
    
    lines.push(this.formatTasks(tasks));
    
    return lines.join('\n');
  }
  
  private formatHeader(headers: string[]): string[] {
    if (!this.options.color) {
      return headers;
    }
    return headers.map(h => chalk.cyan(h));
  }
  
  private formatId(id: number): string {
    return this.options.color ? chalk.bold(id.toString()) : id.toString();
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
  
  private formatAssignee(assignee: string | null): string {
    if (!assignee) {
      return this.options.color ? chalk.gray('-') : '-';
    }
    return assignee;
  }
  
  private formatPriority(priority: number): string {
    if (!this.options.color) {
      return priority.toString();
    }
    
    if (priority >= 8) {
      return chalk.red(priority.toString());
    } else if (priority >= 5) {
      return chalk.yellow(priority.toString());
    } else {
      return chalk.gray(priority.toString());
    }
  }
  
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString();
  }
  
  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) {
      return str;
    }
    return str.substring(0, maxLen - 3) + '...';
  }
  
  format(data: any): string {
    // Auto-detect data type and format appropriately
    if (Array.isArray(data)) {
      return this.formatTasks(data);
    } else if (data.agent && data.tasks) {
      return this.formatQueue(data);
    } else {
      return this.formatTask(data);
    }
  }
}
```

### JSON Formatter
```typescript
// src/formatters/json.ts
import { Formatter, FormatterOptions } from './types.js';

export class JSONFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}
  
  format(data: any): string {
    return JSON.stringify(data, null, this.options.verbose ? 2 : 0);
  }
}
```

### CSV Formatter
```typescript
// src/formatters/csv.ts
import { Formatter, FormatterOptions } from './types.js';

export class CSVFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}
  
  format(data: any): string {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) {
      return '';
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Format header row
    const lines = [this.formatRow(headers)];
    
    // Format data rows
    data.forEach(item => {
      const values = headers.map(h => this.formatValue(item[h]));
      lines.push(this.formatRow(values));
    });
    
    return lines.join('\n');
  }
  
  private formatRow(values: string[]): string {
    return values.map(v => this.escapeCSV(v)).join(',');
  }
  
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.join(';');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
  
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
```

### Compact Formatter
```typescript
// src/formatters/compact.ts
import chalk from 'chalk';
import { Formatter, FormatterOptions } from './types.js';

export class CompactFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}
  
  format(data: any): string {
    if (Array.isArray(data)) {
      return data.map(task => this.formatTask(task)).join('\n');
    } else {
      return this.formatTask(data);
    }
  }
  
  private formatTask(task: any): string {
    const parts = [];
    
    // ID
    parts.push(this.formatId(task.id));
    
    // Title
    parts.push(this.truncate(task.title, 40));
    
    // Status
    parts.push(`(${this.formatStatus(task.status)})`);
    
    // Assignee
    if (task.assigned_to) {
      parts.push(`@${task.assigned_to}`);
    }
    
    // Priority
    if (task.priority !== 0) {
      parts.push(`p:${task.priority}`);
    }
    
    // Tags
    if (task.tags && task.tags.length > 0) {
      parts.push(`[${task.tags.join(', ')}]`);
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
```

### Formatter Factory
```typescript
// src/formatters/index.ts
import { Formatter, FormatterOptions } from './types.js';
import { TableFormatter } from './table.js';
import { JSONFormatter } from './json.js';
import { CSVFormatter } from './csv.js';
import { CompactFormatter } from './compact.js';

export * from './types.js';

export function createFormatter(
  type: 'table' | 'json' | 'csv' | 'compact',
  options: FormatterOptions
): Formatter {
  switch (type) {
    case 'table':
      return new TableFormatter(options);
    case 'json':
      return new JSONFormatter(options);
    case 'csv':
      return new CSVFormatter(options);
    case 'compact':
      return new CompactFormatter(options);
    default:
      return new TableFormatter(options);
  }
}
```

## Testing Requirements
```typescript
// tests/unit/formatters/table.test.ts
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
});

// tests/unit/formatters/json.test.ts
import { describe, it, expect } from 'vitest';
import { JSONFormatter } from '../../../src/formatters/json.js';

describe('JSONFormatter', () => {
  it('should format as JSON', () => {
    const formatter = new JSONFormatter({ color: false, verbose: false });
    const data = { id: 1, title: 'Test' };
    const output = formatter.format(data);
    
    expect(JSON.parse(output)).toEqual(data);
  });
  
  it('should pretty print in verbose mode', () => {
    const formatter = new JSONFormatter({ color: false, verbose: true });
    const data = { id: 1, title: 'Test' };
    const output = formatter.format(data);
    
    expect(output).toContain('\n');
  });
});
```

## Definition of Done
- [ ] All formatters implemented (table, JSON, CSV, compact)
- [ ] Formatter factory works correctly
- [ ] Color output works when enabled
- [ ] Color disabled when --no-color flag used
- [ ] Empty results handled gracefully
- [ ] Long fields truncated appropriately
- [ ] Unit tests pass for all formatters
- [ ] Integration tests with real data pass

## Dependencies
- Story 1: Project Setup

## Estimated Effort
4-6 hours

## Notes
- Consider adding more formatters in future (YAML, XML)
- Table formatter should be smart about terminal width
- CSV formatter useful for importing into spreadsheets
- Compact format great for piping to grep/awk
