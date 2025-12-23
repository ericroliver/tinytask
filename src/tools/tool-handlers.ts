/**
 * MCP tool handlers using SDK 0.5.0 API
 * Implements ListTools and CallTool request handlers
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskService, CommentService, LinkService } from '../services/index.js';
import { toolDefinitions, toolSchemas } from './tool-definitions.js';
import {
  createTaskHandler,
  updateTaskHandler,
  getTaskHandler,
  deleteTaskHandler,
  archiveTaskHandler,
  listTasksHandler,
  getMyQueueHandler,
} from './task-tools.js';
import {
  addCommentHandler,
  updateCommentHandler,
  deleteCommentHandler,
  listCommentsHandler,
} from './comment-tools.js';
import {
  addLinkHandler,
  updateLinkHandler,
  deleteLinkHandler,
  listLinksHandler,
} from './link-tools.js';
import type {
  CreateTaskParams,
  UpdateTaskParams,
  GetTaskParams,
  DeleteTaskParams,
  ArchiveTaskParams,
  ListTasksParams,
  GetMyQueueParams,
  AddCommentParams,
  UpdateCommentParams,
  DeleteCommentParams,
  ListCommentsParams,
  AddLinkParams,
  UpdateLinkParams,
  DeleteLinkParams,
  ListLinksParams,
} from './handler-types.js';

/**
 * Register MCP tool handlers with the server
 */
export function registerToolHandlers(
  server: Server,
  taskService: TaskService,
  commentService: CommentService,
  linkService: LinkService
): void {
  // Handler for tools/list request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions,
    };
  });

  // Handler for tools/call request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      // Validate arguments against schema
      const schema = toolSchemas[name as keyof typeof toolSchemas];
      if (!schema) {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
      }

      // Parse and validate arguments
      const validatedArgs = schema.parse(args || {});

      // Route to appropriate handler
      let result;
      switch (name) {
        // Task tools
        case 'create_task':
          result = await createTaskHandler(taskService, validatedArgs as CreateTaskParams);
          break;
        case 'update_task':
          result = await updateTaskHandler(taskService, validatedArgs as UpdateTaskParams);
          break;
        case 'get_task':
          result = await getTaskHandler(taskService, validatedArgs as GetTaskParams);
          break;
        case 'delete_task':
          result = await deleteTaskHandler(taskService, validatedArgs as DeleteTaskParams);
          break;
        case 'archive_task':
          result = await archiveTaskHandler(taskService, validatedArgs as ArchiveTaskParams);
          break;
        case 'list_tasks':
          result = await listTasksHandler(taskService, validatedArgs as ListTasksParams);
          break;
        case 'get_my_queue':
          result = await getMyQueueHandler(taskService, validatedArgs as GetMyQueueParams);
          break;

        // Comment tools
        case 'add_comment':
          result = await addCommentHandler(commentService, validatedArgs as AddCommentParams);
          break;
        case 'update_comment':
          result = await updateCommentHandler(commentService, validatedArgs as UpdateCommentParams);
          break;
        case 'delete_comment':
          result = await deleteCommentHandler(commentService, validatedArgs as DeleteCommentParams);
          break;
        case 'list_comments':
          result = await listCommentsHandler(commentService, validatedArgs as ListCommentsParams);
          break;

        // Link tools
        case 'add_link':
          result = await addLinkHandler(linkService, validatedArgs as AddLinkParams);
          break;
        case 'update_link':
          result = await updateLinkHandler(linkService, validatedArgs as UpdateLinkParams);
          break;
        case 'delete_link':
          result = await deleteLinkHandler(linkService, validatedArgs as DeleteLinkParams);
          break;
        case 'list_links':
          result = await listLinksHandler(linkService, validatedArgs as ListLinksParams);
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }

      return result;
    } catch (error) {
      // Handle validation errors and other exceptions
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error calling tool ${name}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });
}
