import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
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

  constructor(private serverUrl: string) {
    this.transport = new StreamableHTTPClientTransport(new URL(serverUrl));

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

  private parseResult<T>(result: CallToolResult, allowVoid = false): T {
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
      // For void operations, a simple success message is acceptable
      if (allowVoid && text.includes('success')) {
        return undefined as T;
      }
      throw new Error(
        `Failed to parse server response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Task Operations
  async createTask(params: CreateTaskParams): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'create_task',
      arguments: params,
    });
    return this.parseResult(result);
  }

  async getTask(id: number): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'get_task',
      arguments: { id },
    });
    return this.parseResult(result);
  }

  async updateTask(params: UpdateTaskParams): Promise<unknown> {
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
    this.parseResult(result, true);
  }

  async archiveTask(id: number): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'archive_task',
      arguments: { id },
    });
    return this.parseResult(result);
  }

  async listTasks(filters?: TaskFilters): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'list_tasks',
      arguments: filters || {},
    });
    return this.parseResult(result);
  }

  async getMyQueue(agentName: string): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'get_my_queue',
      arguments: { agent_name: agentName },
    });
    return this.parseResult(result);
  }

  async signupForTask(agentName: string): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'signup_for_task',
      arguments: { agent_name: agentName },
    });
    return this.parseResult(result);
  }

  async moveTask(
    taskId: number,
    currentAgent: string,
    newAgent: string,
    comment: string
  ): Promise<unknown> {
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
  async addComment(taskId: number, content: string, createdBy?: string): Promise<unknown> {
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

  async listComments(taskId: number): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'list_comments',
      arguments: { task_id: taskId },
    });
    return this.parseResult(result);
  }

  async updateComment(id: number, content: string): Promise<unknown> {
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
    this.parseResult(result, true);
  }

  // Link Operations
  async addLink(
    taskId: number,
    url: string,
    description?: string,
    createdBy?: string
  ): Promise<unknown> {
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

  async listLinks(taskId: number): Promise<unknown> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name: 'list_links',
      arguments: { task_id: taskId },
    });
    return this.parseResult(result);
  }

  async updateLink(id: number, updates: { url?: string; description?: string }): Promise<unknown> {
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
