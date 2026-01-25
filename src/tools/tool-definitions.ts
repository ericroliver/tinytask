/**
 * Tool definitions for MCP
 * Defines metadata for all available tools
 */

import { z } from 'zod';

/**
 * Zod schema for tool input parameters
 */
export const toolSchemas = {
  // Task tools
  create_task: z.object({
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    assigned_to: z.string().optional().describe('Agent name to assign to'),
    created_by: z.string().optional().describe('Agent name creating the task'),
    priority: z.number().optional().describe('Priority level (default: 0)'),
    tags: z.array(z.string()).optional().describe('Array of tags'),
    parent_task_id: z.number().optional().describe('Parent task ID (creates subtask)'),
    queue_name: z.string().optional().describe('Queue name (dev, product, qa, etc.)'),
  }).strict(),

  update_task: z.object({
    id: z.number().describe('Task ID'),
    title: z.string().optional().describe('New title'),
    description: z.string().optional().describe('New description'),
    status: z.enum(['idle', 'working', 'complete']).optional().describe('New status'),
    assigned_to: z.string().optional().describe('New assignee'),
    priority: z.number().optional().describe('New priority'),
    tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
    parent_task_id: z.number().optional().describe('New parent task ID (null to make top-level)'),
    queue_name: z.string().optional().describe('New queue name'),
  }).strict(),

  get_task: z.object({
    id: z.number().describe('Task ID'),
  }).strict(),

  delete_task: z.object({
    id: z.number().describe('Task ID'),
  }).strict(),

  archive_task: z.object({
    id: z.number().describe('Task ID'),
  }).strict(),

  list_tasks: z.object({
    assigned_to: z.string().optional().describe('Filter by assignee'),
    status: z.enum(['idle', 'working', 'complete']).optional().describe('Filter by status'),
    include_archived: z.boolean().optional().describe('Include archived tasks'),
    limit: z.number().optional().describe('Max results (default: 100)'),
    offset: z.number().optional().describe('Pagination offset'),
    queue_name: z.string().optional().describe('Filter by queue name'),
    parent_task_id: z.number().optional().describe('Filter by parent task ID'),
    exclude_subtasks: z.boolean().optional().describe('Exclude subtasks from results (default: false)'),
  }).strict(),

  // Subtask tools
  create_subtask: z.object({
    parent_task_id: z.number().describe('Parent task ID'),
    title: z.string().describe('Subtask title'),
    description: z.string().optional().describe('Subtask description'),
    assigned_to: z.string().optional().describe('Agent to assign to'),
    priority: z.number().optional().describe('Priority (default: 0)'),
    tags: z.array(z.string()).optional().describe('Tags'),
    queue_name: z.string().optional().describe('Override queue from parent'),
  }).strict(),

  get_subtasks: z.object({
    parent_task_id: z.number().describe('Parent task ID'),
    recursive: z.boolean().optional().describe('Include nested subtasks (default: false)'),
    include_archived: z.boolean().optional().describe('Include archived subtasks'),
  }).strict(),

  get_task_with_subtasks: z.object({
    task_id: z.number().describe('Task ID'),
    recursive: z.boolean().optional().describe('Include nested subtasks (default: false)'),
  }).strict(),

  move_subtask: z.object({
    subtask_id: z.number().describe('Subtask ID to move'),
    new_parent_id: z.number().optional().describe('New parent task ID (null or omit to make top-level)'),
  }).strict(),

  get_my_queue: z.object({
    agent_name: z.string().describe('Agent name'),
  }).strict(),

  signup_for_task: z.object({
    agent_name: z.string().describe('Agent name signing up for task'),
  }).strict(),

  move_task: z.object({
    task_id: z.number().describe('Task ID to transfer'),
    current_agent: z.string().describe('Current agent (for verification)'),
    new_agent: z.string().describe('Agent to transfer to'),
    comment: z.string().describe('Handoff message/context'),
  }).strict(),

  // Blocking tools
  set_blocked_by: z.object({
    task_id: z.number().describe('Task ID to update'),
    blocker_task_id: z.number().nullable().describe('Blocker task ID (null to clear)'),
  }).strict(),

  get_blockers: z.object({
    task_id: z.number().describe('Task ID to find blockers for'),
  }).strict(),

  // Queue tools
  list_queues: z.object({}).strict(),

  get_queue_stats: z.object({
    queue_name: z.string().describe('Queue name'),
  }).strict(),

  add_task_to_queue: z.object({
    task_id: z.number().describe('Task ID'),
    queue_name: z.string().describe('Queue name to add task to'),
  }).strict(),

  remove_task_from_queue: z.object({
    task_id: z.number().describe('Task ID'),
  }).strict(),

  move_task_to_queue: z.object({
    task_id: z.number().describe('Task ID'),
    new_queue_name: z.string().describe('New queue name to move task to'),
  }).strict(),

  get_queue_tasks: z.object({
    queue_name: z.string().describe('Queue name'),
    assigned_to: z.string().optional().describe('Filter by assignee'),
    status: z.enum(['idle', 'working', 'complete']).optional().describe('Filter by status'),
    parent_task_id: z.number().optional().describe('Filter by parent task ID'),
    exclude_subtasks: z.boolean().optional().describe('Exclude subtasks from results'),
    include_archived: z.boolean().optional().describe('Include archived tasks'),
    limit: z.number().optional().describe('Max results'),
    offset: z.number().optional().describe('Pagination offset'),
  }).strict(),

  clear_queue: z.object({
    queue_name: z.string().describe('Queue name to clear'),
  }).strict(),

  // Comment tools
  add_comment: z.object({
    task_id: z.number().describe('Task ID'),
    content: z.string().describe('Comment text'),
    created_by: z.string().optional().describe('Agent name'),
  }),

  update_comment: z.object({
    id: z.number().describe('Comment ID'),
    content: z.string().describe('New comment text'),
  }),

  delete_comment: z.object({
    id: z.number().describe('Comment ID'),
  }),

  list_comments: z.object({
    task_id: z.number().describe('Task ID'),
  }),

  // Link tools
  add_link: z.object({
    task_id: z.number().describe('Task ID'),
    url: z.string().describe('Link/path/reference'),
    description: z.string().optional().describe('Description of the artifact'),
    created_by: z.string().optional().describe('Agent name'),
  }),

  update_link: z.object({
    id: z.number().describe('Link ID'),
    url: z.string().optional().describe('New URL'),
    description: z.string().optional().describe('New description'),
  }),

  delete_link: z.object({
    id: z.number().describe('Link ID'),
  }),

  list_links: z.object({
    task_id: z.number().describe('Task ID'),
  }),
};

/**
 * Convert Zod schema to JSON Schema for MCP tool metadata
 */
function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const shape = schema._def.shape();
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    const description = zodType.description || '';

    // Handle different Zod types
    if (zodType instanceof z.ZodString) {
      properties[key] = { type: 'string', description };
    } else if (zodType instanceof z.ZodNumber) {
      properties[key] = { type: 'number', description };
    } else if (zodType instanceof z.ZodBoolean) {
      properties[key] = { type: 'boolean', description };
    } else if (zodType instanceof z.ZodArray) {
      properties[key] = { type: 'array', description, items: { type: 'string' } };
    } else if (zodType instanceof z.ZodEnum) {
      properties[key] = {
        type: 'string',
        description,
        enum: zodType._def.values,
      };
    } else if (zodType instanceof z.ZodOptional) {
      // Recursive handling for optional types
      const innerType = zodType._def.innerType;
      if (innerType instanceof z.ZodString) {
        properties[key] = { type: 'string', description };
      } else if (innerType instanceof z.ZodNumber) {
        properties[key] = { type: 'number', description };
      } else if (innerType instanceof z.ZodBoolean) {
        properties[key] = { type: 'boolean', description };
      } else if (innerType instanceof z.ZodArray) {
        properties[key] = { type: 'array', description, items: { type: 'string' } };
      } else if (innerType instanceof z.ZodEnum) {
        properties[key] = {
          type: 'string',
          description,
          enum: innerType._def.values,
        };
      }
    }

    // Check if required
    if (!(zodType instanceof z.ZodOptional)) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Tool metadata in MCP format
 */
export const toolDefinitions = [
  // Task tools
  {
    name: 'create_task',
    description: 'Create a new task in the system',
    inputSchema: zodToJsonSchema(toolSchemas.create_task),
  },
  {
    name: 'update_task',
    description: 'Update an existing task',
    inputSchema: zodToJsonSchema(toolSchemas.update_task),
  },
  {
    name: 'get_task',
    description: 'Get a task by ID with all comments and links',
    inputSchema: zodToJsonSchema(toolSchemas.get_task),
  },
  {
    name: 'delete_task',
    description: 'Delete a task by ID',
    inputSchema: zodToJsonSchema(toolSchemas.delete_task),
  },
  {
    name: 'archive_task',
    description: 'Archive a task by ID',
    inputSchema: zodToJsonSchema(toolSchemas.archive_task),
  },
  {
    name: 'list_tasks',
    description: 'List tasks with optional filters',
    inputSchema: zodToJsonSchema(toolSchemas.list_tasks),
  },
  {
    name: 'get_my_queue',
    description: 'Get all open tasks assigned to a specific agent',
    inputSchema: zodToJsonSchema(toolSchemas.get_my_queue),
  },
  {
    name: 'signup_for_task',
    description: 'Claim the highest priority idle task from your queue and mark it as working',
    inputSchema: zodToJsonSchema(toolSchemas.signup_for_task),
  },
  {
    name: 'move_task',
    description: 'Transfer a task to another agent with status reset to idle and add handoff comment',
    inputSchema: zodToJsonSchema(toolSchemas.move_task),
  },
  
  // Blocking tools
  {
    name: 'set_blocked_by',
    description: 'Set or clear the blocking relationship for a task',
    inputSchema: zodToJsonSchema(toolSchemas.set_blocked_by),
  },
  {
    name: 'get_blockers',
    description: 'Get all tasks that are blocking a given task',
    inputSchema: zodToJsonSchema(toolSchemas.get_blockers),
  },
 
  // Subtask tools
  {
    name: 'create_subtask',
    description: 'Create a new subtask under a parent task',
    inputSchema: zodToJsonSchema(toolSchemas.create_subtask),
  },
  {
    name: 'get_subtasks',
    description: 'Get all subtasks for a parent task',
    inputSchema: zodToJsonSchema(toolSchemas.get_subtasks),
  },
  {
    name: 'get_task_with_subtasks',
    description: 'Get a task with all its subtasks in a tree structure',
    inputSchema: zodToJsonSchema(toolSchemas.get_task_with_subtasks),
  },
  {
    name: 'move_subtask',
    description: 'Move a subtask to a different parent or make it a top-level task',
    inputSchema: zodToJsonSchema(toolSchemas.move_subtask),
  },

  // Queue tools
  {
    name: 'list_queues',
    description: 'List all queue names currently in use',
    inputSchema: zodToJsonSchema(toolSchemas.list_queues),
  },
  {
    name: 'get_queue_stats',
    description: 'Get statistics for a specific queue',
    inputSchema: zodToJsonSchema(toolSchemas.get_queue_stats),
  },
  {
    name: 'add_task_to_queue',
    description: 'Add an existing task to a queue',
    inputSchema: zodToJsonSchema(toolSchemas.add_task_to_queue),
  },
  {
    name: 'remove_task_from_queue',
    description: 'Remove a task from its queue',
    inputSchema: zodToJsonSchema(toolSchemas.remove_task_from_queue),
  },
  {
    name: 'move_task_to_queue',
    description: 'Move a task from one queue to another',
    inputSchema: zodToJsonSchema(toolSchemas.move_task_to_queue),
  },
  {
    name: 'get_queue_tasks',
    description: 'Get all tasks in a queue with optional filters',
    inputSchema: zodToJsonSchema(toolSchemas.get_queue_tasks),
  },
  {
    name: 'clear_queue',
    description: 'Remove all tasks from a queue',
    inputSchema: zodToJsonSchema(toolSchemas.clear_queue),
  },

  // Comment tools
  {
    name: 'add_comment',
    description: 'Add a comment to a task',
    inputSchema: zodToJsonSchema(toolSchemas.add_comment),
  },
  {
    name: 'update_comment',
    description: 'Update an existing comment',
    inputSchema: zodToJsonSchema(toolSchemas.update_comment),
  },
  {
    name: 'delete_comment',
    description: 'Delete a comment by ID',
    inputSchema: zodToJsonSchema(toolSchemas.delete_comment),
  },
  {
    name: 'list_comments',
    description: 'List all comments for a task',
    inputSchema: zodToJsonSchema(toolSchemas.list_comments),
  },

  // Link tools
  {
    name: 'add_link',
    description: 'Add a link/artifact reference to a task',
    inputSchema: zodToJsonSchema(toolSchemas.add_link),
  },
  {
    name: 'update_link',
    description: 'Update an existing link',
    inputSchema: zodToJsonSchema(toolSchemas.update_link),
  },
  {
    name: 'delete_link',
    description: 'Delete a link by ID',
    inputSchema: zodToJsonSchema(toolSchemas.delete_link),
  },
  {
    name: 'list_links',
    description: 'List all links for a task',
    inputSchema: zodToJsonSchema(toolSchemas.list_links),
  },
];
