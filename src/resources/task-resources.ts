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
