/**
 * Link tool handler functions
 */

import { LinkService } from '../services/index.js';

export async function addLinkHandler(
  linkService: LinkService,
  params: {
    task_id: number;
    url: string;
    description?: string;
    created_by?: string;
  }
) {
  try {
    const link = linkService.create(params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(link, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error adding link: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function updateLinkHandler(
  linkService: LinkService,
  params: {
    id: number;
    url?: string;
    description?: string;
  }
) {
  try {
    const { id, ...updates } = params;
    const link = linkService.update(id, updates);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(link, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error updating link: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function deleteLinkHandler(linkService: LinkService, params: { id: number }) {
  try {
    linkService.delete(params.id);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Link ${params.id} deleted successfully`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error deleting link: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function listLinksHandler(linkService: LinkService, params: { task_id: number }) {
  try {
    const links = linkService.listByTask(params.task_id);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              task_id: params.task_id,
              count: links.length,
              links,
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
          text: `Error listing links: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
