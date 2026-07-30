/**
 * Tests for task list command options:
 * - --status (comma-separated list)
 * - --excludeStatus (comma-separated list)
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the MCP SDK modules before importing anything that uses them
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamable.js', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

const { createCLI } = await import('../../../src/cli.js');

describe('Task List Command Options', () => {
  it('should have --excludeStatus option on task list', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const listCmd = taskCmd?.commands.find((c) => c.name() === 'list');
    expect(listCmd).toBeDefined();

    const options = listCmd!.options.map((o) => o.long);
    expect(options).toContain('--status');
    expect(options).toContain('--excludeStatus');
  });

  it('should have --excludeStatus option on queue tasks', () => {
    const cli = createCLI();
    const queueCmd = cli.commands.find((c) => c.name() === 'queue');
    const tasksCmd = queueCmd?.commands.find((c) => c.name() === 'tasks');
    expect(tasksCmd).toBeDefined();

    const options = tasksCmd!.options.map((o) => o.long);
    expect(options).toContain('--status');
    expect(options).toContain('--excludeStatus');
  });

  it('should have help text mentioning comma-separated for --status on task list', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const listCmd = taskCmd?.commands.find((c) => c.name() === 'list');
    const statusOption = listCmd?.options.find((o) => o.long === '--status');
    expect(statusOption?.description).toContain('comma-separated');
  });

  it('should have help text mentioning comma-separated for --excludeStatus on task list', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const listCmd = taskCmd?.commands.find((c) => c.name() === 'list');
    const excludeOption = listCmd?.options.find((o) => o.long === '--excludeStatus');
    expect(excludeOption?.description).toContain('comma-separated');
  });
});