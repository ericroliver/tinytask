import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the MCP SDK before importing the client
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
    close: vi.fn().mockResolvedValue(undefined),
    callTool: vi.fn().mockResolvedValue({
      isError: false,
      content: [{ text: '{"result":"success"}' }],
    }),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamable.js', () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({})),
}));

const { TinyTaskClient } = await import('../../../src/client/mcp-client.js');

describe('TinyTaskClient', () => {
  let client: typeof TinyTaskClient.prototype;
  const testUrl = 'http://localhost:3000/mcp';

  beforeEach(() => {
    client = new TinyTaskClient(testUrl);
  });

  afterEach(async () => {
    await client.disconnect();
  });

  it('should create client instance', () => {
    expect(client).toBeDefined();
  });

  it('should throw error when calling methods before connect', async () => {
    await expect(client.listTasks()).rejects.toThrow('Client not connected');
  });

  it('should throw error when calling getTask before connect', async () => {
    await expect(client.getTask(1)).rejects.toThrow('Client not connected');
  });

  it('should throw error when calling createTask before connect', async () => {
    await expect(client.createTask({ title: 'Test' })).rejects.toThrow('Client not connected');
  });

  it('should allow multiple disconnect calls', async () => {
    await client.disconnect();
    await expect(client.disconnect()).resolves.not.toThrow();
  });

  it('should have proper structure', () => {
    expect(client).toBeDefined();
    expect(typeof client.connect).toBe('function');
    expect(typeof client.disconnect).toBe('function');
    expect(typeof client.createTask).toBe('function');
    expect(typeof client.getTask).toBe('function');
    expect(typeof client.listTasks).toBe('function');
  });
});
