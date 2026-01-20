/**
 * Resource definitions for MCP
 * Defines metadata for all available resources
 */

/**
 * Resource metadata in MCP format
 */
export const resourceDefinitions = [
  // Task resources
  {
    uri: 'task://{id}',
    name: 'Task by ID',
    description: 'Get a specific task with all comments and links',
    mimeType: 'application/json',
  },
  {
    uri: 'task://{id}/comments',
    name: 'Task Comments',
    description: 'Get all comments for a specific task',
    mimeType: 'application/json',
  },
  {
    uri: 'task://{id}/links',
    name: 'Task Links',
    description: 'Get all links/artifacts for a specific task',
    mimeType: 'application/json',
  },
  {
    uri: 'task://hierarchy/{id}',
    name: 'Task Hierarchy',
    description: 'Get a task with its complete subtask hierarchy',
    mimeType: 'text/plain',
  },

  // Queue resources
  {
    uri: 'queue://{agent_name}',
    name: 'Agent Queue',
    description: 'Get all open tasks assigned to a specific agent',
    mimeType: 'application/json',
  },
  {
    uri: 'queue://{agent_name}/summary',
    name: 'Agent Queue Summary',
    description: "Get summary statistics for an agent's queue",
    mimeType: 'application/json',
  },
  {
    uri: 'queue://list',
    name: 'Queue List',
    description: 'List all queues with basic statistics',
    mimeType: 'text/plain',
  },
  {
    uri: 'queue://stats/{queue_name}',
    name: 'Queue Statistics',
    description: 'Get detailed statistics for a specific queue',
    mimeType: 'text/plain',
  },
  {
    uri: 'queue://tasks/{queue_name}',
    name: 'Queue Tasks',
    description: 'Get all tasks in a specific queue',
    mimeType: 'text/plain',
  },

  // Tasks list resources
  {
    uri: 'tasks://active',
    name: 'Active Tasks',
    description: 'Get all active (non-archived) tasks',
    mimeType: 'application/json',
  },
  {
    uri: 'tasks://archived',
    name: 'Archived Tasks',
    description: 'Get all archived tasks',
    mimeType: 'application/json',
  },
];

/**
 * Parse URI and extract parameters
 */
export function parseResourceUri(uri: string): {
  type: string;
  params: Record<string, string>;
} | null {
  // task://{id}
  const taskMatch = uri.match(/^task:\/\/(\d+)$/);
  if (taskMatch) {
    return { type: 'task', params: { id: taskMatch[1] } };
  }

  // task://{id}/comments
  const taskCommentsMatch = uri.match(/^task:\/\/(\d+)\/comments$/);
  if (taskCommentsMatch) {
    return { type: 'task_comments', params: { id: taskCommentsMatch[1] } };
  }

  // task://{id}/links
  const taskLinksMatch = uri.match(/^task:\/\/(\d+)\/links$/);
  if (taskLinksMatch) {
    return { type: 'task_links', params: { id: taskLinksMatch[1] } };
  }

  // task://hierarchy/{id}
  const taskHierarchyMatch = uri.match(/^task:\/\/hierarchy\/(\d+)$/);
  if (taskHierarchyMatch) {
    return { type: 'task_hierarchy', params: { id: taskHierarchyMatch[1] } };
  }

  // queue://{agent_name}
  const queueMatch = uri.match(/^queue:\/\/([^/]+)$/);
  if (queueMatch) {
    return { type: 'queue', params: { agent_name: decodeURIComponent(queueMatch[1]) } };
  }

  // queue://{agent_name}/summary
  const queueSummaryMatch = uri.match(/^queue:\/\/([^/]+)\/summary$/);
  if (queueSummaryMatch) {
    return {
      type: 'queue_summary',
      params: { agent_name: decodeURIComponent(queueSummaryMatch[1]) },
    };
  }

  // queue://list
  if (uri === 'queue://list') {
    return { type: 'queue_list', params: {} };
  }

  // queue://stats/{queue_name}
  const queueStatsMatch = uri.match(/^queue:\/\/stats\/([^/]+)$/);
  if (queueStatsMatch) {
    return {
      type: 'queue_stats',
      params: { queue_name: decodeURIComponent(queueStatsMatch[1]) },
    };
  }

  // queue://tasks/{queue_name}
  const queueTasksMatch = uri.match(/^queue:\/\/tasks\/([^/]+)$/);
  if (queueTasksMatch) {
    return {
      type: 'queue_tasks',
      params: { queue_name: decodeURIComponent(queueTasksMatch[1]) },
    };
  }

  // tasks://active
  if (uri === 'tasks://active') {
    return { type: 'tasks_active', params: {} };
  }

  // tasks://archived
  if (uri === 'tasks://archived') {
    return { type: 'tasks_archived', params: {} };
  }

  return null;
}
