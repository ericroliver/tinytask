import { describe, it, expect, vi } from 'vitest';

// Mock the MCP SDK modules before importing anything that uses them
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamable.js', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

const { createCLI } = await import('../../../src/cli.js');

function getCommand(path: string[]) {
  let current = createCLI();
  for (const name of path) {
    current = current.commands.find((c) => c.name() === name) as never;
  }
  return current;
}

describe('Strict positional arity (task #478: silent wrong answers)', () => {
  it('rejects excess positional args on comment get (was silently ignored)', () => {
    const cmd = getCommand(['comment', 'get']);
    expect(cmd.name()).toBe('get');
    expect(() => cmd.exitOverride().parse(['node', 'tko', 'get', '555', '890'])).toThrow(
      /too many arguments/i
    );
  });

  it('rejects excess positional args on task get', () => {
    const cmd = getCommand(['task', 'get']);
    expect(() => cmd.exitOverride().parse(['node', 'tko', 'get', '890', '999'])).toThrow(
      /too many arguments/i
    );
  });

  it('rejects excess positional args on comment list', () => {
    const cmd = getCommand(['comment', 'list']);
    expect(() => cmd.exitOverride().parse(['node', 'tko', 'list', '890', '9'])).toThrow(
      /too many arguments/i
    );
  });

  it('comment get declares an optional task-id for cross-checking', () => {
    const cmd = getCommand(['comment', 'get']);
    // <comment-id> [task-id] — 2 args are the documented shape, not excess
    expect(() => cmd.exitOverride().parse(['node', 'tko', 'get', '555', '890', '9'])).toThrow(
      /too many arguments/i
    );
  });

  it('all commands reject excess positional arguments', () => {
    const cli = createCLI();
    const check = (command: { commands: unknown[] }): void => {
      for (const sub of command.commands as Array<{
        name: () => string;
        _allowExcessArguments: boolean;
        commands: unknown[];
      }>) {
        expect(sub._allowExcessArguments, `command ${sub.name()}`).toBe(false);
        check(sub);
      }
    };
    check(cli);
  });
});