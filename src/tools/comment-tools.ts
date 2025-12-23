/**
 * Comment tool handler functions
 */

import { CommentService } from '../services/index.js';

export async function addCommentHandler(
  commentService: CommentService,
  params: {
    task_id: number;
    content: string;
    created_by?: string;
  }
) {
  try {
    const comment = commentService.create(params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(comment, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error adding comment: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function updateCommentHandler(
  commentService: CommentService,
  params: {
    id: number;
    content: string;
  }
) {
  try {
    const comment = commentService.update(params.id, params.content);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(comment, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error updating comment: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function deleteCommentHandler(commentService: CommentService, params: { id: number }) {
  try {
    commentService.delete(params.id);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Comment ${params.id} deleted successfully`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error deleting comment: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function listCommentsHandler(
  commentService: CommentService,
  params: { task_id: number }
) {
  try {
    const comments = commentService.listByTask(params.task_id);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              task_id: params.task_id,
              count: comments.length,
              comments,
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
          text: `Error listing comments: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
