# Story 5: MCP Tools - Queue Management

## Overview
Expose queue management functionality through MCP tools, enabling team-based task organization and workload visibility.

## User Story
**As an** MCP client (LLM agent or CLI user)  
**I want** MCP tools to organize and query tasks by queue  
**So that** I can manage team workloads and find unassigned work

## Business Value
- Enables team-based task management (dev, product, qa teams)
- Provides visibility into queue workloads and unassigned tasks
- Supports capacity planning and work distribution
- Facilitates sprint planning and team coordination

## Acceptance Criteria

### New Tools
- [ ] `get_queue_tasks` retrieves all tasks in a queue
- [ ] `get_queue_stats` provides queue statistics
- [ ] `get_unassigned_in_queue` finds unassigned tasks in queue
- [ ] `list_queues` lists all active queues with counts
- [ ] All tools validate input parameters
- [ ] All tools return properly formatted MCP responses
- [ ] All tools handle errors gracefully

### Enhanced Tools
- [ ] `create_task` accepts optional `queue_name` parameter
- [ ] `update_task` accepts optional `queue_name` parameter
- [ ] `list_tasks` accepts `queue_name` filter
- [ ] `get_my_queue` accepts optional `queue_name` filter

### Tool Definitions
- [ ] All tool schemas updated with Zod validation
- [ ] All tool descriptions clear and accurate
- [ ] Parameter descriptions helpful for LLM agents
- [ ] Tool metadata properly registered with MCP server

## Technical Details

### New Tool Schemas

```typescript
// Get all tasks in queue
get_queue_tasks: z.object({
  queue_name: z.string().describe('Queue name (dev, product, qa, etc.)'),
  assigned_to: z.string().optional().describe('Filter by assignee'),
  status: z.enum(['idle', 'working', 'complete']).optional().describe('Filter by status'),
  include_subtasks: z.boolean().optional().describe('Include subtasks (default: true)'),
  include_archived: z.boolean().optional().describe('Include archived tasks'),
}),

// Get queue statistics
get_queue_stats: z.object({
  queue_name: z.string().describe('Queue name'),
}),

// Get unassigned tasks in queue
get_unassigned_in_queue: z.object({
  queue_name: z.string().describe('Queue name'),
  status: z.enum(['idle', 'working', 'complete']).optional().describe('Filter by status'),
}),

// List all queues
list_queues: z.object({
  include_stats: z.boolean().optional().describe('Include statistics for each queue (default: false)'),
}),
```

### Enhanced Tool Schemas

```typescript
// Enhanced get_my_queue
get_my_queue: z.object({
  agent_name: z.string().describe('Agent name'),
  queue_name: z.string().optional().describe('Filter by queue name'),
}),
```

### Tool Handlers

```typescript
// Get queue tasks handler
export async function getQueueTasksHandler(
  taskService: TaskService,
  params: {
    queue_name: string;
    assigned_to?: string;
    status?: 'idle' | 'working' | 'complete';
    include_subtasks?: boolean;
    include_archived?: boolean;
  }
) {
  try {
    const tasks = taskService.getQueueTasks(params.queue_name, {
      assigned_to: params.assigned_to,
      status: params.status,
      include_subtasks: params.include_subtasks ?? true,
      include_archived: params.include_archived || false,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          queue_name: params.queue_name,
          count: tasks.length,
          filters: {
            assigned_to: params.assigned_to,
            status: params.status,
            include_subtasks: params.include_subtasks ?? true,
          },
          tasks: tasks,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error retrieving queue tasks: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// Get queue stats handler
export async function getQueueStatsHandler(
  taskService: TaskService,
  params: { queue_name: string }
) {
  try {
    const stats = taskService.getQueueStats(params.queue_name);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(stats, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error retrieving queue stats: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// Get unassigned in queue handler
export async function getUnassignedInQueueHandler(
  taskService: TaskService,
  params: {
    queue_name: string;
    status?: 'idle' | 'working' | 'complete';
  }
) {
  try {
    const tasks = taskService.getUnassignedInQueue(params.queue_name, {
      status: params.status,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          queue_name: params.queue_name,
          count: tasks.length,
          status_filter: params.status,
          tasks: tasks,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error retrieving unassigned tasks: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// List queues handler
export async function listQueuesHandler(
  taskService: TaskService,
  params: { include_stats?: boolean }
) {
  try {
    const queues = taskService.listQueues(params.include_stats || false);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          count: queues.length,
          queues: queues,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error listing queues: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
```

## Testing Requirements

### Unit Tests
- [ ] `get_queue_tasks` returns all tasks in queue
- [ ] `get_queue_tasks` with assigned_to filter
- [ ] `get_queue_tasks` with status filter
- [ ] `get_queue_tasks` with include_subtasks=false
- [ ] `get_queue_tasks` for non-existent queue returns empty
- [ ] `get_queue_stats` returns correct statistics
- [ ] `get_queue_stats` for empty queue
- [ ] `get_unassigned_in_queue` returns unassigned tasks
- [ ] `get_unassigned_in_queue` with status filter
- [ ] `list_queues` returns all active queues
- [ ] `list_queues` with include_stats=true
- [ ] Enhanced `get_my_queue` with queue filter
- [ ] Enhanced `get_my_queue` without queue filter (backwards compat)

### Integration Tests
- [ ] Create tasks in multiple queues via MCP
- [ ] Query each queue independently
- [ ] Get statistics for each queue
- [ ] Find unassigned work across all queues
- [ ] Filter agent queue by queue name
- [ ] List all queues and get stats for each

### Error Handling
- [ ] Missing required queue_name caught by Zod
- [ ] Empty queue returns empty array (not error)
- [ ] Invalid status value caught by Zod
- [ ] Database errors returned as MCP errors

## Usage Examples

### Example 1: View Queue Workload
```typescript
// See all dev queue tasks
const devTasks = await mcp.call('get_queue_tasks', {
  queue_name: 'dev',
});

// See dev queue statistics
const devStats = await mcp.call('get_queue_stats', {
  queue_name: 'dev',
});
// Returns: {
//   queue_name: 'dev',
//   total_tasks: 12,
//   by_status: { idle: 4, working: 6, complete: 2 },
//   assigned: 10,
//   unassigned: 2,
//   agents: ['Vaela', 'Gaion']
// }
```

### Example 2: Find Unassigned Work
```typescript
// Get all unassigned tasks in QA queue
const unassignedQA = await mcp.call('get_unassigned_in_queue', {
  queue_name: 'qa',
  status: 'idle',
});

// List all queues with stats
const allQueues = await mcp.call('list_queues', {
  include_stats: true,
});

// Find queue with most unassigned work
const queueNeedingHelp = allQueues.queues
  .sort((a, b) => b.stats.unassigned - a.stats.unassigned)[0];
```

### Example 3: Agent Workload by Queue
```typescript
// See Vaela's work in dev queue only
const vaelaDevWork = await mcp.call('get_my_queue', {
  agent_name: 'Vaela',
  queue_name: 'dev',
});

// See all of Vaela's work across queues
const vaelaAllWork = await mcp.call('get_my_queue', {
  agent_name: 'Vaela',
});

// Get dev queue tasks assigned to Vaela
const devVaelaTasks = await mcp.call('get_queue_tasks', {
  queue_name: 'dev',
  assigned_to: 'Vaela',
});
```

### Example 4: Sprint Planning
```typescript
// Create task in product queue
const productTask = await mcp.call('create_task', {
  title: 'Design user workflow',
  queue_name: 'product',
  assigned_to: 'Spartus',
  priority: 5,
});

// Create dev subtask in dev queue
const devSubtask = await mcp.call('create_subtask', {
  parent_task_id: productTask.id,
  title: 'Implement workflow',
  queue_name: 'dev', // Different queue than parent
  priority: 5,
});

// See all product tasks
const productTasks = await mcp.call('get_queue_tasks', {
  queue_name: 'product',
  include_subtasks: false, // Exclude dev subtasks
});
```

## Response Formats

### get_queue_tasks Response
```json
{
  "queue_name": "dev",
  "count": 8,
  "filters": {
    "assigned_to": null,
    "status": "idle",
    "include_subtasks": true
  },
  "tasks": [
    {
      "id": 1,
      "title": "Fix bug",
      "queue_name": "dev",
      "assigned_to": "Vaela",
      "status": "idle",
      ...
    }
  ]
}
```

### get_queue_stats Response
```json
{
  "queue_name": "dev",
  "total_tasks": 12,
  "by_status": {
    "idle": 4,
    "working": 6,
    "complete": 2
  },
  "assigned": 10,
  "unassigned": 2,
  "agents": ["Vaela", "Gaion"],
  "avg_priority": 3.5
}
```

### list_queues Response
```json
{
  "count": 3,
  "queues": [
    {
      "queue_name": "dev",
      "task_count": 12,
      "stats": { ... }
    },
    {
      "queue_name": "product",
      "task_count": 6,
      "stats": { ... }
    },
    {
      "queue_name": "qa",
      "task_count": 8,
      "stats": { ... }
    }
  ]
}
```

## MCP Protocol Compliance
- [ ] All tool responses follow MCP content format
- [ ] Error responses include `isError: true`
- [ ] Success responses include formatted JSON
- [ ] Tool metadata properly registered
- [ ] Parameter validation via Zod schemas

## Documentation Requirements
- [ ] Tool reference documentation updated
- [ ] Usage examples added to docs
- [ ] Queue management guide created
- [ ] API change log updated
- [ ] Migration guide includes queue examples

## Dependencies
- Story 1: Database Schema and Type System Updates (MUST be complete)
- Story 3: Service Layer - Queues (MUST be complete)
- Zod for schema validation
- MCP SDK for tool registration

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All tools implemented and registered
- [ ] All handlers implemented
- [ ] All unit tests passing (13+ tests)
- [ ] All integration tests passing
- [ ] Code coverage >90%
- [ ] Code reviewed and approved
- [ ] MCP protocol compliance verified
- [ ] Documentation complete with examples
- [ ] No breaking changes to existing tools

## Estimated Effort
**3-4 hours**

## Related Stories
- Story 3: Service Layer - Queues (prerequisite)
- Story 4: MCP Tools - Subtasks
- Story 6: MCP Resources

## Notes
- Queue names are free-form (no validation against predefined list)
- Empty queue returns empty array, not an error
- Statistics are calculated on-demand
- Agent can work across multiple queues
- `include_subtasks` defaults to true for backwards compatibility
- Tool descriptions should guide LLM agents for capacity planning workflows
