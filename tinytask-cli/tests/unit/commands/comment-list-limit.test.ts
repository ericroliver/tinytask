/**
 * Tests for comment list command options:
 * - --limit N (show only the last N comments)
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

describe('Comment List Command Options', () => {
  it('should have --limit option on comment list', () => {
    const cli = createCLI();
    const commentCmd = cli.commands.find((c) => c.name() === 'comment');
    const listCmd = commentCmd?.commands.find((c) => c.name() === 'list');
    expect(listCmd).toBeDefined();

    const options = listCmd!.options.map((o) => o.long);
    expect(options).toContain('--limit');
  });

  it('should describe --limit as showing the last N comments', () => {
    const cli = createCLI();
    const commentCmd = cli.commands.find((c) => c.name() === 'comment');
    const listCmd = commentCmd?.commands.find((c) => c.name() === 'list');
    const limitOption = listCmd?.options.find((o) => o.long === '--limit');
    expect(limitOption?.description).toContain('last N comments');
  });
});
