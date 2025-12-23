/**
 * Task tool handler functions
 */

import { TaskService } from '../services/index.js';

export async function createTaskHandler(
  taskService: TaskService,
  params: {
    title: string;
    description?: string;
    assigned_to?: string;
    created_by?: string;
    priority?: number;
    tags?: string[];
  }
) {
  try {
    const task = taskService.create(params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error creating task: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function updateTaskHandler(
  taskService: TaskService,
  params: {
    id: number;
    title?: string;
    description?: string;
    status?: 'idle' | 'working' | 'complete';
    assigned_to?: string;
    priority?: number;
    tags?: string[];
  }
) {
  try {
    const { id, ...updates } = params;
    const task = taskService.update(id, updates);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error updating task: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function getTaskHandler(taskService: TaskService, params: { id: number }) {
  try {
    const task = taskService.get(params.id, true); // Include comments and links
    if (!task) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Task not found: ${params.id}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error retrieving task: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function deleteTaskHandler(taskService: TaskService, params: { id: number }) {
  try {
    taskService.delete(params.id);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Task ${params.id} deleted successfully`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error deleting task: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function archiveTaskHandler(taskService: TaskService, params: { id: number }) {
  try {
    const task = taskService.archive(params.id);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error archiving task: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function listTasksHandler(
  taskService: TaskService,
  params: {
    assigned_to?: string;
    status?: 'idle' | 'working' | 'complete';
    include_archived?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const tasks = taskService.list(params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
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
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function getMyQueueHandler(taskService: TaskService, params: { agent_name: string }) {
  try {
    const tasks = taskService.getQueue(params.agent_name);
    return {
      content: [
        {
          type: 'text' as const,
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
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error retrieving queue: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
