/**
 * Task resource handler functions
 */

import { TaskService, CommentService, LinkService } from '../services/index.js';

export async function handleTaskResource(taskService: TaskService, params: { id: string }) {
  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      throw new Error(`Invalid task ID: ${params.id}`);
    }

    const task = taskService.get(taskId, true);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return {
      contents: [
        {
          uri: `task://${taskId}`,
          mimeType: 'application/json',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve task: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleTaskCommentsResource(
  commentService: CommentService,
  params: { id: string }
) {
  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      throw new Error(`Invalid task ID: ${params.id}`);
    }

    const comments = commentService.listByTask(taskId);

    return {
      contents: [
        {
          uri: `task://${taskId}/comments`,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              task_id: taskId,
              count: comments.length,
              comments: comments,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve comments: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleTaskLinksResource(linkService: LinkService, params: { id: string }) {
  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      throw new Error(`Invalid task ID: ${params.id}`);
    }

    const links = linkService.listByTask(taskId);

    return {
      contents: [
        {
          uri: `task://${taskId}/links`,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              task_id: taskId,
              count: links.length,
              links: links,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve links: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleTaskHierarchyResource(
  taskService: TaskService,
  params: { id: string }
) {
  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      throw new Error(`Invalid task ID: ${params.id}`);
    }

    const taskWithSubtasks = taskService.getTaskWithSubtasks(taskId, true);
    if (!taskWithSubtasks) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Format as readable text hierarchy
    let text = `Task #${taskWithSubtasks.id}: ${taskWithSubtasks.title}\n`;
    text += `Status: ${taskWithSubtasks.status}\n`;
    text += `Priority: ${taskWithSubtasks.priority}\n`;
    if (taskWithSubtasks.assigned_to) {
      text += `Assigned To: ${taskWithSubtasks.assigned_to}\n`;
    }
    if (taskWithSubtasks.queue_name) {
      text += `Queue: ${taskWithSubtasks.queue_name}\n`;
    }
    if (taskWithSubtasks.description) {
      text += `Description: ${taskWithSubtasks.description}\n`;
    }
    text += `\nSubtask Count: ${taskWithSubtasks.subtask_count}\n`;

    if (taskWithSubtasks.subtasks.length > 0) {
      text += `\nSubtasks:\n`;
      text += formatSubtaskHierarchy(taskWithSubtasks.subtasks, 1);
    }

    return {
      contents: [
        {
          uri: `task://hierarchy/${taskId}`,
          mimeType: 'text/plain',
          text: text,
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve task hierarchy: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function formatSubtaskHierarchy(subtasks: unknown[], depth: number): string {
  const indent = '  '.repeat(depth);
  let text = '';

  for (const subtask of subtasks) {
    const t = subtask as {
      id: number;
      title: string;
      status: string;
      priority: number;
      assigned_to: string | null;
    };
    text += `${indent}└─ #${t.id}: ${t.title} [${t.status}]`;
    if (t.assigned_to) {
      text += ` (${t.assigned_to})`;
    }
    text += `\n`;
  }

  return text;
}

export async function handleActiveTasksResource(taskService: TaskService) {
  try {
    const tasks = taskService.list({ include_archived: false });

    return {
      contents: [
        {
          uri: 'tasks://active',
          mimeType: 'application/json',
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
    throw new Error(
      `Failed to retrieve active tasks: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleArchivedTasksResource(taskService: TaskService) {
  try {
    const tasks = taskService
      .list({ include_archived: true })
      .filter((t) => t.archived_at !== null);

    return {
      contents: [
        {
          uri: 'tasks://archived',
          mimeType: 'application/json',
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
    throw new Error(
      `Failed to retrieve archived tasks: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
