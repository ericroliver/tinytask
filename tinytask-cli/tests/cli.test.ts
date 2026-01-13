import { describe, it, expect, vi } from 'vitest';

// Mock the MCP SDK modules before importing anything that uses them
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamable.js', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

const { createCLI } = await import('../src/cli.js');

describe('CLI', () => {
  it('should create CLI program', () => {
    const cli = createCLI();
    expect(cli.name()).toBe('tinytask');
  });

  it('should have version option', () => {
    const cli = createCLI();
    expect(cli.version()).toBeDefined();
  });

  it('should have ping command', () => {
    const cli = createCLI();
    const commands = cli.commands.map((c) => c.name());
    expect(commands).toContain('ping');
  });

  it('should have task command', () => {
    const cli = createCLI();
    const commands = cli.commands.map((c) => c.name());
    expect(commands).toContain('task');
  });

  it('should have config command', () => {
    const cli = createCLI();
    const commands = cli.commands.map((c) => c.name());
    expect(commands).toContain('config');
  });

  it('should have global options', () => {
    const cli = createCLI();
    const options = cli.options.map((o) => o.long);
    expect(options).toContain('--url');
    expect(options).toContain('--json');
    expect(options).toContain('--no-color');
    expect(options).toContain('--verbose');
  });
});
