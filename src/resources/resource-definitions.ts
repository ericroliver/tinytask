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
