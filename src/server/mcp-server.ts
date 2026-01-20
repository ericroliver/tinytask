/**
 * MCP Server factory
 * Creates and configures the MCP server with all tools and resources
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TaskService, CommentService, LinkService, QueueService } from '../services/index.js';
import { registerToolHandlers } from '../tools/index.js';
import { registerResourceHandlers } from '../resources/index.js';

/**
 * Create and configure an MCP server with all tools and resources
 */
export function createMcpServer(
  taskService: TaskService,
  commentService: CommentService,
  linkService: LinkService,
  queueService: QueueService
): Server {
  // Create server with capabilities
  const server = new Server(
    {
      name: 'tinytask-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register all tool handlers
  registerToolHandlers(server, taskService, commentService, linkService, queueService);

  // Register all resource handlers
  registerResourceHandlers(server, taskService, commentService, linkService, queueService);

  return server;
}
