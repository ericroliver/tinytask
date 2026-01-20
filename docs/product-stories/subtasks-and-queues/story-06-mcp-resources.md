# Story 6: MCP Resources - Subtasks and Queues

## Overview
Expose subtask and queue data through MCP resources, providing alternative access patterns for read-heavy operations.

## User Story
**As an** MCP client (LLM agent or CLI user)  
**I want** MCP resources for subtasks and queues  
**So that** I can efficiently access hierarchical and queue-organized data

## Business Value
- Provides efficient read access for hierarchical and queue data
- Complements tool-based access with resource URIs
- Enables caching and optimization opportunities
- Follows MCP best practices for data access

## Acceptance Criteria

### New Resources
- [ ] `task://{id}/subtasks` - Get all subtasks for a task
- [ ] `task://{id}/tree` - Get task with full subtask hierarchy
- [ ] `queue://{queue_name}/tasks` - Get all tasks in queue
- [ ] `queue://{queue_name}/unassigned` - Get unassigned tasks in queue
- [ ] `queue://{queue_name}/stats` - Get queue statistics
- [ ] `queues://list` - List all active queues

### Enhanced Resources
- [ ] `task://{id}` includes subtask count
- [ ] `queue://{agent_name}` accepts optional queue filter

### Resource Definitions
- [ ] All resource URIs properly registered
- [ ] All resource handlers implemented
- [ ] Parameter parsing from URIs
- [ ] Error handling for invalid URIs

## Technical Details

### Resource URI Patterns

```typescript
// Subtask resources
task://{id}/subtasks           // Immediate subtasks
task://{id}/tree               // Full hierarchy

// Queue resources
queue://{queue_name}/tasks     // All tasks in queue
queue://{queue_name}/unassigned // Unassigned tasks
queue://{queue_name}/stats     // Queue statistics

// Queue list resource
queues://list                  // All queues with counts
```

### Resource Definitions

```typescript
// src/resources/resource-definitions.ts

export function parseResourceUri(uri: string): ParsedResource | null {
  // ... existing patterns ...

  // Task subtasks: task://5/subtasks
  const subtasksMatch = uri.match(/^task:\/\/(\d+)\/subtasks$/);
  if (subtasksMatch) {
    return {
      type: 'task_subtasks',
      params: { id: parseInt(subtasksMatch[1]) },
    };
  }

  // Task tree: task://5/tree
  const treeMatch = uri.match(/^task:\/\/(\d+)\/tree$/);
  if (treeMatch) {
    return {
      type: 'task_tree',
      params: { id: parseInt(treeMatch[1]) },
    };
  }

  // Queue tasks: queue://dev/tasks
  const queueTasksMatch = uri.match(/^queue:\/\/([^\/]+)\/tasks$/);
  if (queueTasksMatch) {
    return {
      type: 'queue_tasks',
      params: { queue_name: decodeURIComponent(queueTasksMatch[1]) },
    };
  }

  // Queue unassigned: queue://dev/unassigned
  const queueUnassignedMatch = uri.match(/^queue:\/\/([^\/]+)\/unassigned$/);
  if (queueUnassignedMatch) {
    return {
      type: 'queue_unassigned',
      params: { queue_name: decodeURIComponent(queueUnassignedMatch[1]) },
    };
  }

  // Queue stats: queue://dev/stats
  const queueStatsMatch = uri.match(/^queue:\/\/([^\/]+)\/stats$/);
  if (queueStatsMatch) {
    return {
      type: 'queue_stats',
      params: { queue_name: decodeURIComponent(queueStatsMatch[1]) },
    };
  }

  // Queue list: queues://list
  const queuesListMatch = uri.match(/^queues:\/\/list$/);
  if (queuesListMatch) {
    return { type: 'queues_list', params: {} };
  }

  return null;
}
```

### Resource Handlers

```typescript
// src/resources/subtask-resources.ts

export async function handleTaskSubtasksResource(
  taskService: TaskService,
  params: { id: number }
) {
  try {
    const task = taskService.get(params.id);
    if (!task) {
      throw new Error(`Task not found: ${params.id}`);
    }

    const subtasks = taskService.getSubtasks(params.id, false);

    return {
      contents: [{
        uri: `task://${params.id}/subtasks`,
        mimeType: 'application/json',
        text: JSON.stringify({
          parent_task_id: params.id,
          parent_title: task.title,
          count: subtasks.length,
          subtasks: subtasks,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve subtasks: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleTaskTreeResource(
  taskService: TaskService,
  params: { id: number }
) {
  try {
    const taskWithSubtasks = taskService.getWithSubtasks(params.id, true);

    return {
      contents: [{
        uri: `task://${params.id}/tree`,
        mimeType: 'application/json',
        text: JSON.stringify(taskWithSubtasks, null, 2),
      }],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve task tree: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

```typescript
// src/resources/queue-resources.ts (additions)

export async function handleQueueTasksResource(
  taskService: TaskService,
  params: { queue_name: string }
) {
  try {
    const tasks = taskService.getQueueTasks(params.queue_name, {});

    return {
      contents: [{
        uri: `queue://${encodeURIComponent(params.queue_name)}/tasks`,
        mimeType: 'application/json',
        text: JSON.stringify({
          queue_name: params.queue_name,
          count: tasks.length,
          tasks: tasks,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve queue tasks: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleQueueUnassignedResource(
  taskService: TaskService,
  params: { queue_name: string }
) {
  try {
    const tasks = taskService.getUnassignedInQueue(params.queue_name);

    return {
      contents: [{
        uri: `queue://${encodeURIComponent(params.queue_name)}/unassigned`,
        mimeType: 'application/json',
        text: JSON.stringify({
          queue_name: params.queue_name,
          count: tasks.length,
          tasks: tasks,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve unassigned tasks: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleQueueStatsResource(
  taskService: TaskService,
  params: { queue_name: string }
) {
  try {
    const stats = taskService.getQueueStats(params.queue_name);

    return {
      contents: [{
        uri: `queue://${encodeURIComponent(params.queue_name)}/stats`,
        mimeType: 'application/json',
        text: JSON.stringify(stats, null, 2),
      }],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve queue stats: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function handleQueuesListResource(taskService: TaskService) {
  try {
    const queues = taskService.listQueues(true);

    return {
      contents: [{
        uri: 'queues://list',
        mimeType: 'application/json',
        text: JSON.stringify({
          count: queues.length,
          queues: queues,
        }, null, 2),
      }],
    };
  } catch (error) {
    throw new Error(
      `Failed to list queues: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

### Resource Handler Registration

```typescript
// src/resources/resource-handlers.ts

export async function handleResource(
  taskService: TaskService,
  commentService: CommentService,
  linkService: LinkService,
  uri: string
) {
  const parsed = parseResourceUri(uri);

  if (!parsed) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  switch (parsed.type) {
    // ... existing cases ...

    case 'task_subtasks':
      return await handleTaskSubtasksResource(taskService, parsed.params as { id: number });

    case 'task_tree':
      return await handleTaskTreeResource(taskService, parsed.params as { id: number });

    case 'queue_tasks':
      return await handleQueueTasksResource(taskService, parsed.params as { queue_name: string });

    case 'queue_unassigned':
      return await handleQueueUnassignedResource(taskService, parsed.params as { queue_name: string });

    case 'queue_stats':
      return await handleQueueStatsResource(taskService, parsed.params as { queue_name: string });

    case 'queues_list':
      return await handleQueuesListResource(taskService);

    default:
      throw new Error(`Unknown resource type: ${parsed.type}`);
  }
}
```

## Testing Requirements

### Unit Tests
- [ ] Parse `task://{id}/subtasks` URI
- [ ] Parse `task://{id}/tree` URI
- [ ] Parse `queue://{queue_name}/tasks` URI
- [ ] Parse `queue://{queue_name}/unassigned` URI
- [ ] Parse `queue://{queue_name}/stats` URI
- [ ] Parse `queues://list` URI
- [ ] Handle invalid URI formats
- [ ] Handle task_subtasks resource
- [ ] Handle task_tree resource
- [ ] Handle queue_tasks resource
- [ ] Handle queue_unassigned resource
- [ ] Handle queue_stats resource
- [ ] Handle queues_list resource

### Integration Tests
- [ ] Access task subtasks via resource URI
- [ ] Access task tree via resource URI
- [ ] Access queue tasks via resource URI
- [ ] Access unassigned queue tasks via resource URI
- [ ] Access queue stats via resource URI
- [ ] Access queues list via resource URI
- [ ] Resource content matches tool responses
- [ ] URI encoding/decoding works correctly

### Error Handling
- [ ] Invalid task ID in URI returns error
- [ ] Non-existent task returns error
- [ ] Non-existent queue returns empty results
- [ ] Malformed URI returns error

## Usage Examples

### Example 1: Access Task Subtasks
```typescript
// Via resource
const subtasks = await mcp.readResource('task://5/subtasks');
// Returns: { parent_task_id: 5, count: 3, subtasks: [...] }

// Via tool (equivalent)
const subtasksTool = await mcp.callTool('get_subtasks', { parent_task_id: 5 });
```

### Example 2: Access Task Hierarchy
```typescript
// Get full task tree
const tree = await mcp.readResource('task://5/tree');
// Returns task with nested subtasks

// For LLM context
const context = `
Current task: ${tree.title}
Subtasks:
${tree.subtasks.map(s => `- ${s.title} (${s.status})`).join('\n')}
`;
```

### Example 3: Queue Dashboard
```typescript
// Get queue overview
const devQueue = await mcp.readResource('queue://dev/tasks');
const unassignedDev = await mcp.readResource('queue://dev/unassigned');
const devStats = await mcp.readResource('queue://dev/stats');

// Display dashboard
console.log(`Dev Queue: ${devStats.total_tasks} tasks`);
console.log(`Unassigned: ${unassignedDev.count} tasks`);
console.log(`Agents: ${devStats.agents.join(', ')}`);
```

### Example 4: Multi-Queue View
```typescript
// Get all queues
const allQueues = await mcp.readResource('queues://list');

// Access each queue's unassigned work
for (const queue of allQueues.queues) {
  const unassigned = await mcp.readResource(
    `queue://${queue.queue_name}/unassigned`
  );
  console.log(`${queue.queue_name}: ${unassigned.count} unassigned`);
}
```

## MCP Protocol Compliance
- [ ] Resources return proper MCP resource format
- [ ] MIME type set to `application/json`
- [ ] URI properly set in response
- [ ] Content properly formatted as JSON
- [ ] Errors thrown (not returned as content)

## Documentation Requirements
- [ ] Resource URI reference documentation
- [ ] Usage examples for each resource
- [ ] Comparison with tool-based access
- [ ] Best practices for resource usage
- [ ] Update resource list in README

## Dependencies
- Story 2: Service Layer - Subtasks (MUST be complete)
- Story 3: Service Layer - Queues (MUST be complete)
- MCP SDK for resource protocol

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All resource handlers implemented
- [ ] All URI patterns registered
- [ ] All unit tests passing (13+ tests)
- [ ] All integration tests passing
- [ ] Code coverage >90%
- [ ] Code reviewed and approved
- [ ] MCP protocol compliance verified
- [ ] Documentation complete with examples
- [ ] Resource list updated in server metadata

## Estimated Effort
**2-3 hours**

## Related Stories
- Story 2: Service Layer - Subtasks (prerequisite)
- Story 3: Service Layer - Queues (prerequisite)
- Story 4: MCP Tools - Subtasks
- Story 5: MCP Tools - Queues

## Notes
- Resources are read-only (mutations use tools)
- Resources are ideal for LLM context gathering
- URI encoding important for queue names with spaces/special chars
- Consider caching resource responses if performance becomes issue
- Resources complement tools, don't replace them
