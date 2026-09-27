import { describe, it, expect } from 'vitest';
import { TableFormatter } from '../../../src/formatters/table.js';

const task = {
  id: 906,
  title: 'Add context-saving output options',
  status: 'working',
  assigned_to: 'tko-sword',
  priority: 7,
  tags: ['cli', 'performance'],
  queue_name: 'ready-for-development',
  blocked_by_task_id: 890,
  is_currently_blocked: true,
};

describe('TableFormatter with --fields', () => {
  it('renders only the requested fields as columns (regression: crashed on missing priority)', () => {
    // Regression: projecting to a subset of fields used to crash the default
    // table renderer with "Cannot read properties of undefined (reading
    // 'toString')" because it assumed the full 8-column layout.
    const formatter = new TableFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'title'],
    });
    const output = formatter.format([task, { id: 907, title: 'Second' }]);
    expect(output).toContain('ID');
    expect(output).toContain('Title');
    expect(output).toContain('906');
    expect(output).toContain('Second');
  });

  it('renders requested fields in requested order with friendly headers', () => {
    const formatter = new TableFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'status', 'priority'],
    });
    const output = formatter.format([{ id: 1, status: 'idle', priority: 9 }]);
    expect(output).toContain('Status');
    expect(output).toContain('Priority');
    expect(output).toContain('idle');
  });

  it('renders absent fields as a dash', () => {
    const formatter = new TableFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'title'],
    });
    const output = formatter.format([{ id: 1, title: 'Only title' }]);
    expect(output).toContain('Only title');
  });

  it('does not crash when projecting fields absent from the object', () => {
    const formatter = new TableFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'description'],
    });
    expect(() => formatter.format([{ id: 1 }])).not.toThrow();
  });
});