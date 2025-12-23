# Story 4: MCP Tools Implementation

## Title
Implement all MCP tools for task, comment, and link operations

## Description
As a developer, I need to implement all MCP tools that expose the service layer functionality so that LLM agents can interact with the task management system via the MCP protocol.

## User Story
**As an** LLM agent  
**I want to** use MCP tools to manage tasks, comments, and links  
**So that** I can collaborate with other agents on shared work

## Acceptance Criteria

### Must Have
- [ ] Task tools: create_task, update_task, get_task, delete_task, archive_task, list_tasks, get_my_queue (7 tools)
- [ ] Comment tools: add_comment, update_comment, delete_comment, list_comments (4 tools)
- [ ] Link tools: add_link, update_link, delete_link, list_links (4 tools)
- [ ] Zod schema validation for all tool parameters
- [ ] Proper error handling and error response formatting
- [ ] Success responses with appropriate data
- [ ] All tools properly registered with MCP server

### Should Have
- [ ] Tool descriptions that help agents understand usage
- [ ] Parameter descriptions for better agent understanding
- [ ] Examples in tool metadata

### Could Have
- [ ] Tool usage telemetry/logging
- [ ] Performance monitoring

## Technical Details

### Task Tools Examples

```typescript
// src/tools/task-tools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTaskTools(server: McpServer, taskService: TaskService) {
  
  // create_task
  server.tool(
    "create_task",
    {
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      assigned_to: z.string().optional().describe("Agent name to assign to"),
      created_by: z.string().optional().describe("Agent name creating the task"),
      priority: z.number().optional().describe("Priority level (default: 0)"),
      tags: z.array(z.string()).optional().describe("Array of tags"),
    },
    async (params) => {
      try {
        const task = taskService.create(params);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating task: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // update_task
  server.tool(
    "update_task",
    {
      id: z.number().describe("Task ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      status: z.enum(['idle', 'working', 'complete']).optional().describe("New status"),
      assigned_to: z.string().optional().describe("New assignee"),
      priority: z.number().optional().describe("New priority"),
      tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
    },
    async ({ id, ...updates }) => {
      try {
        const task = taskService.update(id, updates);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error updating task: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // get_task
  server.tool(
    "get_task",
    {
      id: z.number().describe("Task ID"),
    },
    async ({ id }) => {
      try {
        const task = taskService.get(id, true); // Include comments and links
        if (!task) {
          return {
            content: [{
              type: "text",
              text: `Task not found: ${id}`,
            }],
            isError: true,
          };
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error retrieving task: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // get_my_queue
  server.tool(
    "get_my_queue",
    {
      agent_name: z.string().describe("Agent name"),
    },
    async ({ agent_name }) => {
      try {
        const tasks = taskService.getQueue(agent_name);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              agent: agent_name,
              count: tasks.length,
              tasks: tasks,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error retrieving queue: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // archive_task
  server.tool(
    "archive_task",
    {
      id: z.number().describe("Task ID"),
    },
    async ({ id }) => {
      try {
        const task = taskService.archive(id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error archiving task: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // list_tasks
  server.tool(
    "list_tasks",
    {
      assigned_to: z.string().optional().describe("Filter by assignee"),
      status: z.enum(['idle', 'working', 'complete']).optional().describe("Filter by status"),
      include_archived: z.boolean().optional().describe("Include archived tasks"),
      limit: z.number().optional().describe("Max results (default: 100)"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (filters) => {
      try {
        const tasks = taskService.list(filters);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: tasks.length,
              tasks: tasks,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing tasks: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  // delete_task
  server.tool(
    "delete_task",
    {
      id: z.number().describe("Task ID"),
    },
    async ({ id }) => {
      try {
        taskService.delete(id);
        return {
          content: [{
            type: "text",
            text: `Task ${id} deleted successfully`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error deleting task: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
```

### Comment Tools Structure
```typescript
// src/tools/comment-tools.ts
export function registerCommentTools(server: McpServer, commentService: CommentService) {
  // add_comment(task_id, content, created_by?)
  // update_comment(id, content)
  // delete_comment(id)
  // list_comments(task_id)
}
```

### Link Tools Structure
```typescript
// src/tools/link-tools.ts
export function registerLinkTools(server: McpServer, linkService: LinkService) {
  // add_link(task_id, url, description?, created_by?)
  // update_link(id, url?, description?)
  // delete_link(id)
  // list_links(task_id)
}
```

## Dependencies
- Story 3: Service Layer (needs TaskService, CommentService, LinkService)

## Subtasks
1. [ ] Create src/tools/task-tools.ts
2. [ ] Implement create_task tool with zod validation
3. [ ] Implement update_task tool
4. [ ] Implement get_task tool
5. [ ] Implement delete_task tool
6. [ ] Implement archive_task tool
7. [ ] Implement list_tasks tool
8. [ ] Implement get_my_queue tool
9. [ ] Create src/tools/comment-tools.ts
10. [ ] Implement all 4 comment tools
11. [ ] Create src/tools/link-tools.ts
12. [ ] Implement all 4 link tools
13. [ ] Add error handling to all tools
14. [ ] Test each tool individually
15. [ ] Create tool registry module to organize registration

## Testing
- [ ] create_task creates task and returns data
- [ ] update_task updates fields correctly
- [ ] get_task retrieves task with comments and links
- [ ] delete_task removes task
- [ ] archive_task sets archived_at
- [ ] list_tasks filters correctly
- [ ] get_my_queue returns agent's open tasks only
- [ ] All comment tools work
- [ ] All link tools work
- [ ] Invalid parameters return error with isError: true
- [ ] Missing required fields return clear error
- [ ] Nonexistent IDs return clear error
- [ ] Error responses are properly formatted

## Definition of Done
- All acceptance criteria met
- 15+ tools implemented
- Zod validation on all tools
- Error handling complete
- All tools tested manually
- Code committed

## Estimated Effort
**8-12 hours**

## Priority
**P0 - Critical** (Core functionality for agents)

## Labels
`mcp`, `tools`, `api`, `phase-4`

## Notes
- Focus on clear error messages - agents will use these for debugging
- Keep tool responses consistent (always JSON)
- Validate parameters thoroughly before calling services
- Consider what data agents need in responses
