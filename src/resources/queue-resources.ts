/**
 * Queue resource handler functions
 */

import { TaskService } from '../services/index.js';

export async function handleQueueResource(
  taskService: TaskService,
  params: { agent_name: string }
) {
  try {
    const tasks = taskService.getQueue(params.agent_name);

    return {
      contents: [
        {
          uri: `queue://${encodeURIComponent(params.agent_name)}`,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              agent: params.agent_name,
              count: tasks.length,
              tasks: tasks,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve queue: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleQueueSummaryResource(
  taskService: TaskService,
  params: { agent_name: string }
) {
  try {
    const tasks = taskService.getQueue(params.agent_name);

    const summary = {
      agent: params.agent_name,
      total: tasks.length,
      by_status: {
        idle: tasks.filter((t) => t.status === 'idle').length,
        working: tasks.filter((t) => t.status === 'working').length,
      },
      by_priority: {
        high: tasks.filter((t) => t.priority > 5).length,
        medium: tasks.filter((t) => t.priority >= 0 && t.priority <= 5).length,
        low: tasks.filter((t) => t.priority < 0).length,
      },
    };

    return {
      contents: [
        {
          uri: `queue://${encodeURIComponent(params.agent_name)}/summary`,
          mimeType: 'application/json',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve queue summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
