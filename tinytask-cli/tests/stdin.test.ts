import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';

// Mock the MCP SDK modules before importing anything that uses them
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamable.js', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

// Mock the connection module
vi.mock('../src/client/connection.js', () => ({
  ensureConnected: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock config loader
vi.mock('../src/config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    url: 'http://localhost:3000/mcp',
    defaultAgent: 'test-agent',
    outputFormat: 'json',
    colorOutput: false,
  }),
}));

import { createCLI } from '../src/cli.js';
import { ensureConnected } from '../src/client/connection.js';

/**
 * Helper: simulate piping content to stdin for a CLI command.
 * Returns a promise that resolves when the action handler completes.
 */
async function runCommand(args: string[], stdinContent?: string): Promise<string> {
  const cli = createCLI();

  // Capture stdout
  const originalWrite = process.stdout.write.bind(process.stdout);
  let output = '';

  // Mock console.log to capture output
  const originalLog = console.log;
  console.log = (msg: string) => {
    output += msg + '\n';
  };

  try {
    if (stdinContent !== undefined) {
      // Create a readable stream to simulate piped stdin
      const stdinStream = Readable.from(stdinContent);
      (stdinStream as any).isTTY = false;
      Object.defineProperty(process, 'stdin', {
        value: stdinStream,
        writable: true,
        configurable: true,
      });
    } else {
      // Simulate TTY stdin (no piped input)
      const fakeStdin = new Readable({ read() {} });
      (fakeStdin as any).isTTY = true;
      Object.defineProperty(process, 'stdin', {
        value: fakeStdin,
        writable: true,
        configurable: true,
      });
    }

    await cli.parseAsync(['node', 'tinytask', ...args]);
  } finally {
    console.log = originalLog;
  }

  return output;
}

describe('stdin utility', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      addComment: vi.fn().mockResolvedValue({ id: 1, taskId: 800, content: 'test' }),
      updateComment: vi.fn().mockResolvedValue({ id: 1, content: 'test' }),
      createTask: vi.fn().mockResolvedValue({ id: 1, title: 'test' }),
      updateTask: vi.fn().mockResolvedValue({ id: 1, title: 'test' }),
      createSubtask: vi.fn().mockResolvedValue({ id: 1, title: 'test' }),
      addLink: vi.fn().mockResolvedValue({ id: 1, url: 'http://example.com' }),
      moveTask: vi.fn().mockResolvedValue({ task: { id: 1 }, comment: { id: 1 } }),
    };
    vi.mocked(ensureConnected).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('comment add --stdin', () => {
    it('should read content from stdin when --stdin is provided', async () => {
      const contentWithBackticks = '## Re-Review\nCode has `hostname`, `resources` fields';
      await runCommand(['comment', 'add', '800', '--stdin'], contentWithBackticks);

      expect(mockClient.addComment).toHaveBeenCalledWith(800, contentWithBackticks, 'test-agent');
    });

    it('should still accept content as positional argument when --stdin is not used', async () => {
      await runCommand(['comment', 'add', '800', 'simple comment']);

      expect(mockClient.addComment).toHaveBeenCalledWith(800, 'simple comment', 'test-agent');
    });

    it('should handle multi-line content with many backticks from stdin', async () => {
      const complexContent = [
        '## Re-Review',
        '',
        'The code uses `hostname`, `resources`, `uptime` — fields that do not exist.',
        '```typescript',
        'const x = `template literal`',
        '```',
      ].join('\n');

      await runCommand(
        ['comment', 'add', '800', '--stdin', '--created-by', 'enigma-prime'],
        complexContent
      );

      expect(mockClient.addComment).toHaveBeenCalledWith(800, complexContent, 'enigma-prime');
    });
  });

  describe('comment update --stdin', () => {
    it('should read content from stdin when --stdin is provided', async () => {
      const content = 'Updated with `backticks` and more';
      await runCommand(['comment', 'update', '5', '--stdin'], content);

      expect(mockClient.updateComment).toHaveBeenCalledWith(5, content);
    });

    it('should still accept content as positional argument when --stdin is not used', async () => {
      await runCommand(['comment', 'update', '5', 'updated comment']);

      expect(mockClient.updateComment).toHaveBeenCalledWith(5, 'updated comment');
    });
  });

  describe('task create --stdin', () => {
    it('should read description from stdin when --stdin is provided', async () => {
      const desc = 'Description with `backticks` that would break bash';
      await runCommand(['task', 'create', 'Test Task', '--stdin', '-a', 'dev'], desc);

      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          description: desc,
        })
      );
    });

    it('should still use -d option when --stdin is not provided', async () => {
      await runCommand(['task', 'create', 'Test Task', '-d', 'simple description']);

      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          description: 'simple description',
        })
      );
    });
  });

  describe('task update --stdin', () => {
    it('should read description from stdin when --stdin is provided', async () => {
      const desc = 'Updated description with `backticks`';
      await runCommand(['task', 'update', '5', '--stdin'], desc);

      expect(mockClient.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 5,
          description: desc,
        })
      );
    });

    it('should still use -d option when --stdin is not provided', async () => {
      await runCommand(['task', 'update', '5', '-d', 'simple update']);

      expect(mockClient.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 5,
          description: 'simple update',
        })
      );
    });
  });

  describe('subtask create --stdin', () => {
    it('should read description from stdin when --stdin is provided', async () => {
      const desc = 'Subtask description with `backticks`';
      await runCommand(['subtask', 'create', '100', 'Sub Task', '--stdin'], desc);

      expect(mockClient.createSubtask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sub Task',
          description: desc,
        })
      );
    });

    it('should still use -d option when --stdin is not provided', async () => {
      await runCommand(['subtask', 'create', '100', 'Sub Task', '-d', 'simple sub desc']);

      expect(mockClient.createSubtask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sub Task',
          description: 'simple sub desc',
        })
      );
    });
  });

  describe('link add --stdin', () => {
    it('should read description from stdin when --stdin is provided', async () => {
      const desc = 'Link description with `backticks`';
      await runCommand(['link', 'add', '5', 'http://example.com', '--stdin'], desc);

      expect(mockClient.addLink).toHaveBeenCalledWith(5, 'http://example.com', desc, 'test-agent');
    });

    it('should still use -d option when --stdin is not provided', async () => {
      await runCommand(['link', 'add', '5', 'http://example.com', '-d', 'simple link']);

      expect(mockClient.addLink).toHaveBeenCalledWith(
        5,
        'http://example.com',
        'simple link',
        'test-agent'
      );
    });
  });

  describe('move --stdin', () => {
    it('should read comment from stdin when --stdin is provided', async () => {
      const comment = 'Handoff with `backticks` in comment';
      await runCommand(['move', '5', 'other-agent', '--stdin'], comment);

      expect(mockClient.moveTask).toHaveBeenCalledWith(5, 'test-agent', 'other-agent', comment);
    });

    it('should still use -m option when --stdin is not provided', async () => {
      await runCommand(['move', '5', 'other-agent', '-m', 'simple comment']);

      expect(mockClient.moveTask).toHaveBeenCalledWith(
        5,
        'test-agent',
        'other-agent',
        'simple comment'
      );
    });

    it('should use default comment when neither --stdin nor -m is provided', async () => {
      await runCommand(['move', '5', 'other-agent']);

      expect(mockClient.moveTask).toHaveBeenCalledWith(
        5,
        'test-agent',
        'other-agent',
        'Task transferred'
      );
    });
  });
});
