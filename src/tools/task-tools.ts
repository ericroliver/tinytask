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
    parent_task_id?: number;
    queue_name?: string;
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

export async function createSubtaskHandler(
  taskService: TaskService,
  params: {
    parent_task_id: number;
    title: string;
    description?: string;
    assigned_to?: string;
    priority?: number;
    tags?: string[];
    queue_name?: string;
  }
) {
  try {
    // Validate parent exists
    const parent = taskService.get(params.parent_task_id);
    if (!parent) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Parent task not found: ${params.parent_task_id}`,
          },
        ],
        isError: true,
      };
    }

    // Create subtask using createSubtask service method
    const subtask = taskService.createSubtask(params.parent_task_id, {
      title: params.title,
      description: params.description,
      assigned_to: params.assigned_to,
      priority: params.priority,
      tags: params.tags,
      queue_name: params.queue_name,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(subtask, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error creating subtask: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function getSubtasksHandler(
  taskService: TaskService,
  params: {
    parent_task_id: number;
    recursive?: boolean;
    include_archived?: boolean;
  }
) {
  try {
    const subtasks = taskService.getSubtasks(
      params.parent_task_id,
      params.recursive || false
    );

    // Filter archived if needed
    const filtered = params.include_archived
      ? subtasks
      : subtasks.filter((t) => !t.archived_at);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              parent_task_id: params.parent_task_id,
              recursive: params.recursive || false,
              count: filtered.length,
              subtasks: filtered,
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
          text: `Error retrieving subtasks: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function getTaskWithSubtasksHandler(
  taskService: TaskService,
  params: {
    task_id: number;
    recursive?: boolean;
  }
) {
  try {
    const task = taskService.getTaskWithSubtasks(
      params.task_id,
      params.recursive || false
    );

    if (!task) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Task not found: ${params.task_id}`,
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
          text: `Error retrieving task with subtasks: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function moveSubtaskHandler(
  taskService: TaskService,
  params: {
    subtask_id: number;
    new_parent_id?: number;
  }
) {
  try {
    // new_parent_id can be undefined (to make top-level) or a number
    const newParentId = params.new_parent_id === undefined ? null : params.new_parent_id;
    
    const task = taskService.moveSubtask(params.subtask_id, newParentId);

    const message = newParentId === null
      ? `Task #${params.subtask_id} moved to top-level (no parent)`
      : `Task #${params.subtask_id} moved to parent #${newParentId}`;

    return {
      content: [
        {
          type: 'text' as const,
          text: `${message}\n\n${JSON.stringify(task, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error moving subtask: ${error instanceof Error ? error.message : String(error)}`,
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
    parent_task_id?: number;
    queue_name?: string;
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
          text: JSON.stringify({
            success: true,
            message: `Task ${params.id} deleted successfully`,
            id: params.id,
          }),
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

export async function signupForTaskHandler(
  taskService: TaskService,
  params: { agent_name: string }
) {
  try {
    const task = taskService.signupForTask(params.agent_name);
    
    if (!task) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No idle tasks available in queue for agent: ${params.agent_name}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Task #${task.id} claimed and set to working status\n\n${JSON.stringify(task, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error signing up for task: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function moveTaskHandler(
  taskService: TaskService,
  params: {
    task_id: number;
    current_agent: string;
    new_agent: string;
    comment: string;
  }
) {
  try {
    const task = taskService.moveTask(
      params.task_id,
      params.current_agent,
      params.new_agent,
      params.comment
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: `Task #${params.task_id} transferred from ${params.current_agent} to ${params.new_agent}\n\n${JSON.stringify(task, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error moving task: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Set or clear the blocking relationship for a task
 */
export async function setBlockedByHandler(
  taskService: TaskService,
  params: {
    task_id: number;
    blocker_task_id: number | null;
  }
) {
  try {
    // Validate that the task exists
    const existingTask = taskService.get(params.task_id);
    if (!existingTask) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Task not found: ${params.task_id}`,
          },
        ],
        isError: true,
      };
    }

    // Validate that the blocker task exists (if provided)
    if (params.blocker_task_id !== null) {
      const blockerTask = taskService.get(params.blocker_task_id);
      if (!blockerTask) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Blocker task not found: ${params.blocker_task_id}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Update the task with new blocked_by_task_id
    const updatedTask = taskService.update(params.task_id, {
      blocked_by_task_id: params.blocker_task_id,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `BlockedBy relationship updated for task #${params.task_id}\n\n${JSON.stringify(updatedTask, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error setting blocked by relationship: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get all tasks that are blocking a given task
 */
export async function getBlockersHandler(
  taskService: TaskService,
  params: {
    task_id: number;
  }
) {
  try {
    // Validate that the task exists
    const existingTask = taskService.get(params.task_id);
    if (!existingTask) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Task not found: ${params.task_id}`,
          },
        ],
        isError: true,
      };
    }

    // Find all tasks that are blocking this task (where blocked_by_task_id = params.task_id)
    const blockers = taskService.list({
      blocked_by_task_id: params.task_id,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Blockers for task #${params.task_id}:\n\n${JSON.stringify(blockers, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error retrieving blockers: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
