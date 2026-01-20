# Story 2: TinyTask CLI - MCP Client Integration

## Overview
Implement MCP client wrapper that connects to TinyTask server via Streamable HTTP and provides a clean API for CLI commands.

## User Story
As a CLI developer, I want a reliable MCP client wrapper so that I can easily call TinyTask tools from command handlers.

## Acceptance Criteria
- [ ] MCP client wrapper class created
- [ ] Streamable HTTP transport configured
- [ ] Connection management implemented (connect/disconnect)
- [ ] All TinyTask MCP tools wrapped with type-safe methods
- [ ] Error handling for connection failures
- [ ] Response parsing and error extraction
- [ ] Connection timeout handling
- [ ] Unit tests for client wrapper

## Technical Details

### Client Wrapper Implementation
```typescript
// src/client/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamable.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface CreateTaskParams {
  title: string;
  description?: string;
  assigned_to?: string;
  created_by?: string;
  priority?: number;
  tags?: string[];
  status?: 'idle' | 'working' | 'complete';
}

export interface UpdateTaskParams {
  id: number;
  title?: string;
  description?: string;
  status?: 'idle' | 'working' | 'complete';
  assigned_to?: string;
  priority?: number;
  tags?: string[];
}

export interface TaskFilters {
  assigned_to?: string;
  status?: 'idle' | 'working' | 'complete';
  include_archived?: boolean;
  limit?: number;
  offset?: number;
}

export class TinyTaskClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;
  private connected: boolean = false;
  
  constructor(private serverUrl: string, private timeout: number = 30000) {
    this.transport = new StreamableHTTPClientTransport(
      new URL(serverUrl)
    );
    
    this.client = new Client(
      {
        name: 'tinytask-cli',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }
  
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    try {
      await this.client.connect(this.transport);
      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to TinyTask server at ${this.serverUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      await this.client.close();
      this.connected = false;
    } catch (error) {
      // Log but don't throw on disconnect errors
      console.error('Error disconnecting:', error);
    }
  }
  
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }
  }
  
  private parseResult<T>(result: CallToolResult): T {
    if (result.isError) {
      const errorText = result.content[0]?.text || 'Unknown error';
      throw new Error(errorText);
    }
    
    const text = result.content[0]?.text;
    if (!text) {
      throw new Error('Empty response from server');
    }
    
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse server response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Task Operations
  async createTask(params: CreateTaskParams): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'create_task',
      arguments: params,
    });
    return this.parseResult(result);
  }
  
  async getTask(id: number): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'get_task',
      arguments: { id },
    });
    return this.parseResult(result);
  }
  
  async updateTask(params: UpdateTaskParams): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'update_task',
      arguments: params,
    });
    return this.parseResult(result);
  }
  
  async deleteTask(id: number): Promise<void> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'delete_task',
      arguments: { id },
    });
    this.parseResult(result);
  }
  
  async archiveTask(id: number): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'archive_task',
      arguments: { id },
    });
    return this.parseResult(result);
  }
  
  async listTasks(filters?: TaskFilters): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'list_tasks',
      arguments: filters || {},
    });
    return this.parseResult(result);
  }
  
  async getMyQueue(agentName: string): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'get_my_queue',
      arguments: { agent_name: agentName },
    });
    return this.parseResult(result);
  }
  
  async signupForTask(agentName: string): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'signup_for_task',
      arguments: { agent_name: agentName },
    });
    return this.parseResult(result);
  }
  
  async moveTask(taskId: number, currentAgent: string, newAgent: string, comment: string): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'move_task',
      arguments: {
        task_id: taskId,
        current_agent: currentAgent,
        new_agent: newAgent,
        comment,
      },
    });
    return this.parseResult(result);
  }
  
  // Comment Operations
  async addComment(taskId: number, content: string, createdBy?: string): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'add_comment',
      arguments: {
        task_id: taskId,
        content,
        created_by: createdBy,
      },
    });
    return this.parseResult(result);
  }
  
  async listComments(taskId: number): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'list_comments',
      arguments: { task_id: taskId },
    });
    return this.parseResult(result);
  }
  
  async updateComment(id: number, content: string): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'update_comment',
      arguments: { id, content },
    });
    return this.parseResult(result);
  }
  
  async deleteComment(id: number): Promise<void> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'delete_comment',
      arguments: { id },
    });
    this.parseResult(result);
  }
  
  // Link Operations
  async addLink(taskId: number, url: string, description?: string, createdBy?: string): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'add_link',
      arguments: {
        task_id: taskId,
        url,
        description,
        created_by: createdBy,
      },
    });
    return this.parseResult(result);
  }
  
  async listLinks(taskId: number): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'list_links',
      arguments: { task_id: taskId },
    });
    return this.parseResult(result);
  }
  
  async updateLink(id: number, updates: { url?: string; description?: string }): Promise<any> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'update_link',
      arguments: { id, ...updates },
    });
    return this.parseResult(result);
  }
  
  async deleteLink(id: number): Promise<void> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'delete_link',
      arguments: { id },
    });
    this.parseResult(result);
  }
}
```

### Connection Manager
```typescript
// src/client/connection.ts
import { TinyTaskClient } from './mcp-client.js';

let clientInstance: TinyTaskClient | null = null;

export function getClient(url: string): TinyTaskClient {
  if (!clientInstance) {
    clientInstance = new TinyTaskClient(url);
  }
  return clientInstance;
}

export async function ensureConnected(url: string): Promise<TinyTaskClient> {
  const client = getClient(url);
  await client.connect();
  return client;
}

export async function disconnect(): Promise<void> {
  if (clientInstance) {
    await clientInstance.disconnect();
    clientInstance = null;
  }
}
```

## Testing Requirements
```typescript
// tests/unit/client/mcp-client.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TinyTaskClient } from '../../../src/client/mcp-client.js';

describe('TinyTaskClient', () => {
  let client: TinyTaskClient;
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
  
  it('should connect successfully', async () => {
    // Mock transport for testing
    await expect(client.connect()).resolves.not.toThrow();
  });
  
  it('should handle connection failures', async () => {
    const badClient = new TinyTaskClient('http://invalid:99999/mcp');
    await expect(badClient.connect()).rejects.toThrow('Failed to connect');
  });
  
  // More tests for each method...
});
```

## Definition of Done
- [ ] TinyTaskClient class implemented with all MCP tool wrappers
- [ ] Connection management working (connect/disconnect)
- [ ] Error handling for all failure scenarios
- [ ] Response parsing extracts data correctly
- [ ] Unit tests pass
- [ ] Integration test with real TinyTask server passes
- [ ] Timeout handling works
- [ ] Documentation comments added

## Dependencies
- Story 1: Project Setup

## Estimated Effort
4-6 hours

## Notes
- Keep client stateless except for connection status
- Use singleton pattern for client instance to avoid multiple connections
- Properly clean up connections to prevent resource leaks
- Consider retry logic for transient connection failures (future enhancement)
