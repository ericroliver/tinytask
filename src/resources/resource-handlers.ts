/**
 * MCP resource handlers using SDK 0.5.0 API
 * Implements ListResources and ReadResource request handlers
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskService, CommentService, LinkService } from '../services/index.js';
import { resourceDefinitions, parseResourceUri } from './resource-definitions.js';
import {
  handleTaskResource,
  handleTaskCommentsResource,
  handleTaskLinksResource,
  handleActiveTasksResource,
  handleArchivedTasksResource,
} from './task-resources.js';
import { handleQueueResource, handleQueueSummaryResource } from './queue-resources.js';

/**
 * Register MCP resource handlers with the server
 */
export function registerResourceHandlers(
  server: Server,
  taskService: TaskService,
  commentService: CommentService,
  linkService: LinkService
): void {
  // Handler for resources/list request
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: resourceDefinitions,
    };
  });

  // Handler for resources/read request
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      // Parse the URI to determine resource type and parameters
      const parsed = parseResourceUri(uri);
      if (!parsed) {
        throw new Error(`Invalid resource URI: ${uri}`);
      }

      // Route to appropriate handler
      switch (parsed.type) {
        case 'task':
          return await handleTaskResource(taskService, parsed.params as { id: string });

        case 'task_comments':
          return await handleTaskCommentsResource(commentService, parsed.params as { id: string });

        case 'task_links':
          return await handleTaskLinksResource(linkService, parsed.params as { id: string });

        case 'queue':
          return await handleQueueResource(taskService, parsed.params as { agent_name: string });

        case 'queue_summary':
          return await handleQueueSummaryResource(
            taskService,
            parsed.params as { agent_name: string }
          );

        case 'tasks_active':
          return await handleActiveTasksResource(taskService);

        case 'tasks_archived':
          return await handleArchivedTasksResource(taskService);

        default:
          throw new Error(`Unknown resource type: ${parsed.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error reading resource ${uri}: ${errorMessage}`);
    }
  });
}
