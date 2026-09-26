/**
 * Tests for task get command options:
 * - --no-comments (omit comments entirely)
 * - --last-comment N (only the last N comments)
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

describe('Task Get Command Options', () => {
  it('should have --no-comments option on task get', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const getCmd = taskCmd?.commands.find((c) => c.name() === 'get');
    expect(getCmd).toBeDefined();

    const options = getCmd!.options.map((o) => o.long);
    expect(options).toContain('--no-comments');
  });

  it('should have --last-comment option on task get', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const getCmd = taskCmd?.commands.find((c) => c.name() === 'get');
    const lastComment = getCmd?.options.find((o) => o.long === '--last-comment');
    expect(lastComment).toBeDefined();
    expect(lastComment?.description).toContain('last N comments');
  });

  it('should describe --no-comments as omitting comments', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const getCmd = taskCmd?.commands.find((c) => c.name() === 'get');
    const noComments = getCmd?.options.find((o) => o.long === '--no-comments');
    expect(noComments?.description).toContain('Omit comments');
  });
});
