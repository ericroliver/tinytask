/**
 * Tests for task get command options:
 * - comments are omitted by default
 * - --include-comments opts in (bare = all comments)
 * - --include-comments N includes only the last N comments
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
  it('should have --include-comments option on task get', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const getCmd = taskCmd?.commands.find((c) => c.name() === 'get');
    expect(getCmd).toBeDefined();

    const options = getCmd!.options.map((o) => o.long);
    expect(options).toContain('--include-comments');
  });

  it('should have an optional value for --include-comments', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const getCmd = taskCmd?.commands.find((c) => c.name() === 'get');
    const includeComments = getCmd?.options.find((o) => o.long === '--include-comments');
    // Optional value: brackets, not angle brackets (--include-comments [n])
    expect(includeComments?.flags).toContain('[n]');
  });

  it('should describe --include-comments as opt-in with last-N support', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const getCmd = taskCmd?.commands.find((c) => c.name() === 'get');
    const includeComments = getCmd?.options.find((o) => o.long === '--include-comments');
    expect(includeComments?.description).toContain('omitted by default');
    expect(includeComments?.description).toContain('last N');
  });

  it('should not offer --no-comments or --last-comment anymore', () => {
    const cli = createCLI();
    const taskCmd = cli.commands.find((c) => c.name() === 'task');
    const getCmd = taskCmd?.commands.find((c) => c.name() === 'get');
    const options = getCmd!.options.map((o) => o.long);
    expect(options).not.toContain('--no-comments');
    expect(options).not.toContain('--last-comment');
  });
});
