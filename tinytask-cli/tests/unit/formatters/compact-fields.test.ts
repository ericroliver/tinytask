import { describe, it, expect } from 'vitest';
import { CompactFormatter } from '../../../src/formatters/compact.js';

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

describe('CompactFormatter with --fields', () => {
  it('renders only the requested fields in requested order', () => {
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'status', 'assigned_to'],
    });
    expect(formatter.format(task)).toBe('[906] (working) @tko-sword');
  });

  it('renders arbitrary scalar fields as key:value', () => {
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'queue_name'],
    });
    expect(formatter.format(task)).toBe('[906] queue_name:ready-for-development');
  });

  it('skips fields absent from the task object', () => {
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'description'],
    });
    expect(formatter.format(task)).toBe('[906]');
  });

  it('renders explicit null as a dash', () => {
    const withNull = { ...task, completed_at: null };
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'completed_at'],
    });
    expect(formatter.format(withNull)).toBe('[906] completed_at:-');
  });

  it('keeps compact decorations for known fields', () => {
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['priority', 'tags'],
    });
    expect(formatter.format(task)).toBe('p:7 [cli, performance]');
  });

  it('renders blocked indicator only when currently blocked', () => {
    const blocked = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['blocked_by_task_id'],
    });
    expect(blocked.format(task)).toBe('blocked:#890');

    const notBlocked = { ...task, is_currently_blocked: false };
    expect(blocked.format(notBlocked)).toBe('blocked_by_task_id:890');
  });

  it('truncates long titles to 40 characters', () => {
    const longTitle = { ...task, title: 'x'.repeat(45) };
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'title'],
    });
    const output = formatter.format(longTitle);
    expect(output).toBe(`[906] ${'x'.repeat(37)}...`);
  });

  it('renders one line per task when given an array', () => {
    const second = { ...task, id: 907, queue_name: 'ready-for-qa' };
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['id', 'queue_name'],
    });
    expect(formatter.format([task, second])).toBe(
      '[906] queue_name:ready-for-development\n[907] queue_name:ready-for-qa'
    );
  });

  it('does not include fields that were not requested', () => {
    const formatter = new CompactFormatter({
      color: false,
      verbose: false,
      fields: ['id'],
    });
    const output = formatter.format(task);
    expect(output).not.toContain('tko-sword');
    expect(output).not.toContain('working');
    expect(output).not.toContain('performance');
  });
});

describe('CompactFormatter default layout (no --fields)', () => {
  it('keeps the existing full compact layout', () => {
    const formatter = new CompactFormatter({ color: false, verbose: false });
    expect(formatter.format(task)).toBe(
      '[906] Add context-saving output options (working) @tko-sword p:7 blocked:#890 [cli, performance]'
    );
  });
});
