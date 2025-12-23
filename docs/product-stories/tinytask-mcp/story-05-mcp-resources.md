# Story 5: MCP Resources Implementation

## Title
Implement MCP resources for convenient data access

## Description
As a developer, I need to implement MCP resources that provide URI-based access to task data so that LLM agents have convenient read-only access patterns.

## User Story
**As an** LLM agent  
**I want to** access task data via URIs  
**So that** I can reference and retrieve data conveniently

## Acceptance Criteria

### Must Have
- [ ] Task resource: `task://{id}` returns full task with comments/links
- [ ] Task comments resource: `task://{id}/comments`
- [ ] Task links resource: `task://{id}/links`
- [ ] Queue resource: `queue://{agent_name}` returns agent's open tasks
- [ ] Queue summary resource: `queue://{agent_name}/summary` with counts
- [ ] Active tasks resource: `tasks://active`
- [ ] Archived tasks resource: `tasks://archived`
- [ ] URI parsing and parameter extraction
- [ ] Resource listing support (show available resources)

### Should Have
- [ ] Error handling for invalid URIs
- [ ] Error handling for nonexistent resources

### Could Have
- [ ] Caching for frequently accessed resources
- [ ] Pagination support for large lists

## Technical Details

### Resource Implementation Examples

```typescript
// src/resources/task-resources.ts
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTaskResources(
  server: McpServer,
  taskService: TaskService,
  commentService: CommentService,
  linkService: LinkService
) {
  
  // task://{id} - Full task with comments and links
  server.resource(
    "task_by_id",
    new ResourceTemplate("task://{id}", { list: true }),
    async (uri, { id }) => {
      try {
        const taskId = parseInt(id);
        const task = taskService.get(taskId, true);
        
        if (!task) {
          throw new Error(`Task not found: ${id}`);
        }
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(task, null, 2),
          }],
        };
      } catch (error) {
        throw new Error(`Failed to retrieve task: ${error.message}`);
      }
    }
  );
  
  // task://{id}/comments - Task comments
  server.resource(
    "task_comments",
    new ResourceTemplate("task://{id}/comments", { list: true }),
    async (uri, { id }) => {
      try {
        const taskId = parseInt(id);
        const comments = commentService.listByTask(taskId);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              task_id: taskId,
              count: comments.length,
              comments: comments,
            }, null, 2),
          }],
        };
      } catch (error) {
        throw new Error(`Failed to retrieve comments: ${error.message}`);
      }
    }
  );
  
  // task://{id}/links - Task links
  server.resource(
    "task_links",
    new ResourceTemplate("task://{id}/links", { list: true }),
    async (uri, { id }) => {
      try {
        const taskId = parseInt(id);
        const links = linkService.listByTask(taskId);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              task_id: taskId,
              count: links.length,
              links: links,
            }, null, 2),
          }],
        };
      } catch (error) {
        throw new Error(`Failed to retrieve links: ${error.message}`);
      }
    }
  );
  
  // tasks://active - All active tasks
  server.resource(
    "active_tasks",
    { uri: "tasks://active", list: true },
    async (uri) => {
      try {
        const tasks = taskService.list({ include_archived: false });
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              count: tasks.length,
              tasks: tasks,
            }, null, 2),
          }],
        };
      } catch (error) {
        throw new Error(`Failed to retrieve active tasks: ${error.message}`);
      }
    }
  );
  
  // tasks://archived - All archived tasks
  server.resource(
    "archived_tasks",
    { uri: "tasks://archived", list: true },
    async (uri) => {
      try {
        const tasks = taskService.list({ 
          include_archived: true 
        }).filter(t => t.archived_at !== null);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              count: tasks.length,
              tasks: tasks,
            }, null, 2),
          }],
        };
      } catch (error) {
        throw new Error(`Failed to retrieve archived tasks: ${error.message}`);
      }
    }
  );
}
```

### Queue Resources

```typescript
// src/resources/queue-resources.ts
export function registerQueueResources(
  server: McpServer,
  taskService: TaskService
) {
  
  // queue://{agent_name} - Agent's open tasks
  server.resource(
    "agent_queue",
    new ResourceTemplate("queue://{agent_name}", { list: true }),
    async (uri, { agent_name }) => {
      try {
        const tasks = taskService.getQueue(agent_name);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              agent: agent_name,
              count: tasks.length,
              tasks: tasks,
            }, null, 2),
          }],
        };
      } catch (error) {
        throw new Error(`Failed to retrieve queue: ${error.message}`);
      }
    }
  );
  
  // queue://{agent_name}/summary - Queue summary
  server.resource(
    "agent_queue_summary",
    new ResourceTemplate("queue://{agent_name}/summary", { list: true }),
    async (uri, { agent_name }) => {
      try {
        const tasks = taskService.getQueue(agent_name);
        
        const summary = {
          agent: agent_name,
          total: tasks.length,
          by_status: {
            idle: tasks.filter(t => t.status === 'idle').length,
            working: tasks.filter(t => t.status === 'working').length,
          },
          by_priority: {
            high: tasks.filter(t => t.priority > 5).length,
            medium: tasks.filter(t => t.priority >= 0 && t.priority <= 5).length,
            low: tasks.filter(t => t.priority < 0).length,
          },
        };
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2),
          }],
        };
      } catch (error) {
        throw new Error(`Failed to retrieve queue summary: ${error.message}`);
      }
    }
  );
}
```

## Dependencies
- Story 3: Service Layer (needs services)

## Subtasks
1. [ ] Create src/resources/task-resources.ts
2. [ ] Implement task://{id} resource
3. [ ] Implement task://{id}/comments resource
4. [ ] Implement task://{id}/links resource
5. [ ] Implement tasks://active resource
6. [ ] Implement tasks://archived resource
7. [ ] Create src/resources/queue-resources.ts
8. [ ] Implement queue://{agent_name} resource
9. [ ] Implement queue://{agent_name}/summary resource
10. [ ] Test all resources with MCP client
11. [ ] Verify resource listing works
12. [ ] Add error handling for all resources

## Testing
- [ ] task://{id} returns full task data
- [ ] task://{id}/comments returns only comments
- [ ] task://{id}/links returns only links
- [ ] tasks://active returns active tasks
- [ ] tasks://archived returns archived tasks
- [ ] queue://{agent_name} returns agent's queue
- [ ] queue://{agent_name}/summary returns statistics
- [ ] Invalid IDs return clear errors
- [ ] Nonexistent tasks return clear errors
- [ ] Resources are listed in resource list

## Definition of Done
- All acceptance criteria met
- 7+ resources implemented
- URI templates working correctly
- Error handling in place
- All resources tested
- Code committed

## Estimated Effort
**4-6 hours**

## Priority
**P1 - High** (Enhances agent experience)

## Labels
`mcp`, `resources`, `api`, `phase-5`

## Notes
- Resources are read-only - use tools for mutations
- Resources provide convenient access patterns
- Good for agents that need to reference data frequently
- Clear error messages help debugging
