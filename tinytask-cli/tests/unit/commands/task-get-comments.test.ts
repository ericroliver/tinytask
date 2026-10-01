/**
 * Behavior tests for `task get` comment inclusion:
 * - default: only the latest comment is included (as if --include-comments 1),
 *   so agents still see the most recent handoff/verification note
 * - bare --include-comments: full comment history
 * - --include-comments N: the last N comments
 * - --include-comments 0: comments omitted entirely
 * - tasks without comments: no comments key in the output
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the MCP SDK modules before importing anything that uses them
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamable.js', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

const ensureConnected = vi.fn();

vi.mock('../../../src/client/connection.js', () => ({
  ensureConnected: (...args: unknown[]) => ensureConnected(...args),
}));

vi.mock('../../../src/config/loader.js', () => ({
  loadConfig: vi.fn(async () => ({
    url: 'http://localhost:9999/mcp',
    agent: 'tester',
    outputFormat: 'json',
    colorOutput: false,
    timeout: 5000,
  })),
}));

const { createCLI } = await import('../../../src/cli.js');

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 890,
    title: 'Implement task list response slimming',
    status: 'idle',
    comments: [
      {
        id: 1,
        task_id: 890,
        content: 'oldest comment',
        created_by: 'agent-a',
        created_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 2,
        task_id: 890,
        content: 'middle comment',
        created_by: 'agent-b',
        created_at: '2026-09-02T10:00:00Z',
      },
      {
        id: 3,
        task_id: 890,
        content: 'latest comment',
        created_by: 'agent-c',
        created_at: '2026-09-03T10:00:00Z',
      },
    ],
    ...overrides,
  };
}

async function runTaskGet(args: string[]): Promise<string> {
  const logs: string[] = [];
  const logSpy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => {
    if (m !== undefined) logs.push(String(m));
  });
  try {
    const cli = createCLI();
    await cli.parseAsync(['task', 'get', ...args], { from: 'user' });
    return logs.join('\n');
  } finally {
    logSpy.mockRestore();
  }
}

describe('task get comment inclusion (task #906 follow-up: latest comment by default)', () => {
  beforeEach(() => {
    ensureConnected.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes only the latest comment by default', async () => {
    ensureConnected.mockResolvedValue({ getTask: vi.fn().mockResolvedValue(makeTask()) });

    const output = JSON.parse(await runTaskGet(['890']));

    expect(output.comments).toHaveLength(1);
    expect(output.comments[0].content).toBe('latest comment');
  });

  it('includes the full history with bare --include-comments', async () => {
    ensureConnected.mockResolvedValue({ getTask: vi.fn().mockResolvedValue(makeTask()) });

    const output = JSON.parse(await runTaskGet(['890', '--include-comments']));

    expect(output.comments).toHaveLength(3);
    expect(output.comments.map((c: { content: string }) => c.content)).toEqual([
      'oldest comment',
      'middle comment',
      'latest comment',
    ]);
  });

  it('includes only the last N comments with --include-comments N', async () => {
    ensureConnected.mockResolvedValue({ getTask: vi.fn().mockResolvedValue(makeTask()) });

    const output = JSON.parse(await runTaskGet(['890', '--include-comments', '2']));

    expect(output.comments).toHaveLength(2);
    expect(output.comments.map((c: { content: string }) => c.content)).toEqual([
      'middle comment',
      'latest comment',
    ]);
  });

  it('omits comments entirely with --include-comments 0', async () => {
    ensureConnected.mockResolvedValue({ getTask: vi.fn().mockResolvedValue(makeTask()) });

    const output = JSON.parse(await runTaskGet(['890', '--include-comments', '0']));

    expect('comments' in output).toBe(false);
  });

  it('omits the comments key when the task has no comments', async () => {
    ensureConnected.mockResolvedValue({
      getTask: vi.fn().mockResolvedValue(makeTask({ comments: [] })),
    });

    const output = JSON.parse(await runTaskGet(['890']));

    expect('comments' in output).toBe(false);
  });
});
