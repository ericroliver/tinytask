# Story 4: MCP Tools - Subtask Support

## Overview
Expose subtask functionality through MCP tools, allowing clients to create, query, and manage hierarchical task structures.

## User Story
**As an** MCP client (LLM agent or CLI user)  
**I want** MCP tools to create and query subtasks  
**So that** I can break down complex tasks and manage hierarchical work structures

## Business Value
- Enables task decomposition workflows through MCP protocol
- Provides intuitive tools for hierarchical task management
- Maintains backwards compatibility with existing tools
- Simplifies complex task organization

## Acceptance Criteria

### New Tools
- [ ] `create_subtask` tool creates subtask with parent reference
- [ ] `get_subtasks` tool retrieves subtasks for a parent task
- [ ] Both tools validate input parameters
- [ ] Both tools return properly formatted MCP responses
- [ ] Both tools handle errors gracefully

### Enhanced Tools
- [ ] `create_task` accepts optional `parent_task_id` parameter
- [ ] `update_task` accepts optional `parent_task_id` parameter
- [ ] `get_task` includes subtask count in response
- [ ] `get_task` optionally includes subtasks inline
- [ ] `list_tasks` accepts `parent_task_id` filter
- [ ] `list_tasks` accepts `exclude_subtasks` flag

### Tool Definitions
- [ ] All tool schemas updated with Zod validation
- [ ] All tool descriptions clear and accurate
- [ ] Parameter descriptions helpful for LLM agents
- [ ] Tool metadata properly registered with MCP server

## Technical Details

### New Tool Schemas

```typescript
// Create subtask (convenience wrapper)
create_subtask: z.object({
  parent_task_id: z.number().describe('Parent task ID'),
  title: z.string().describe('Subtask title'),
  description: z.string().optional().describe('Subtask description'),
  assigned_to: z.string().optional().describe('Agent to assign to'),
  priority: z.number().optional().describe('Priority (default: 0)'),
  tags: z.array(z.string()).optional().describe('Tags'),
  queue_name: z.string().optional().describe('Override queue from parent'),
}),

// Get subtasks
get_subtasks: z.object({
  parent_task_id: z.number().describe('Parent task ID'),
  recursive: z.boolean().optional().describe('Include nested subtasks (default: false)'),
  include_archived: z.boolean().optional().describe('Include archived subtasks'),
}),
```

### Enhanced Tool Schemas

```typescript
// Enhanced create_task
create_task: z.object({
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  assigned_to: z.string().optional().describe('Agent name to assign to'),
  created_by: z.string().optional().describe('Agent name creating the task'),
  priority: z.number().optional().describe('Priority level (default: 0)'),
  tags: z.array(z.string()).optional().describe('Array of tags'),
  parent_task_id: z.number().optional().describe('Parent task ID (creates subtask)'),
  queue_name: z.string().optional().describe('Queue name (dev, product, qa, etc.)'),
}),

// Enhanced update_task
update_task: z.object({
  id: z.number().describe('Task ID'),
  title: z.string().optional().describe('New title'),
  description: z.string().optional().describe('New description'),
  status: z.enum(['idle', 'working', 'complete']).optional().describe('New status'),
  assigned_to: z.string().optional().describe('New assignee'),
  priority: z.number().optional().describe('New priority'),
  tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
  parent_task_id: z.number().optional().describe('New parent task ID'),
  queue_name: z.string().optional().describe('New queue name'),
}),

// Enhanced list_tasks
list_tasks: z.object({
  assigned_to: z.string().optional().describe('Filter by assignee'),
  status: z.enum(['idle', 'working', 'complete']).optional().describe('Filter by status'),
  include_archived: z.boolean().optional().describe('Include archived tasks'),
  limit: z.number().optional().describe('Max results (default: 100)'),
  offset: z.number().optional().describe('Pagination offset'),
  queue_name: z.string().optional().describe('Filter by queue name'),
  parent_task_id: z.number().optional().describe('Filter by parent task ID'),
  exclude_subtasks: z.boolean().optional().describe('Exclude subtasks from results (default: false)'),
}),
```

### Tool Handlers

```typescript
// Create subtask handler
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
        content: [{
          type: 'text' as const,
          text: `Parent task not found: ${params.parent_task_id}`,
        }],
        isError: true,
      };
    }

    // Create subtask (inherits queue from parent if not specified)
    const subtask = taskService.create({
      ...params,
      queue_name: params.queue_name || parent.queue_name,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(subtask, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error creating subtask: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// Get subtasks handler
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
      : subtasks.filter(t => !t.archived_at);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          parent_task_id: params.parent_task_id,
          recursive: params.recursive || false,
          count: filtered.length,
          subtasks: filtered,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error retrieving subtasks: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
```

## Testing Requirements

### Unit Tests
- [ ] `create_subtask` with valid parent creates subtask
- [ ] `create_subtask` with invalid parent returns error
- [ ] `create_subtask` inherits queue from parent
- [ ] `create_subtask` with explicit queue overrides parent
- [ ] `get_subtasks` returns immediate children
- [ ] `get_subtasks` with recursive=true returns all descendants
- [ ] `get_subtasks` with non-existent parent returns empty array
- [ ] Enhanced `create_task` with parent_task_id creates subtask
- [ ] Enhanced `update_task` changes parent successfully
- [ ] Enhanced `update_task` with circular ref returns error
- [ ] Enhanced `list_tasks` with parent_task_id filter works
- [ ] Enhanced `list_tasks` with exclude_subtasks works

### Integration Tests
- [ ] Create task hierarchy through MCP tools (3 levels)
- [ ] Query each level of hierarchy
- [ ] Move subtask to different parent
- [ ] Update task to become/stop being subtask
- [ ] List top-level tasks only (exclude_subtasks)
- [ ] Get task with subtasks included

### Error Handling
- [ ] Invalid parent_task_id handled gracefully
- [ ] Circular reference prevented
- [ ] Missing required parameters caught by Zod
- [ ] Database errors returned as MCP errors

## Usage Examples

### Example 1: Create Task with Subtasks
```typescript
// Create parent task
const parent = await mcp.call('create_task', {
  title: 'Implement User Authentication',
  queue_name: 'dev',
  assigned_to: 'Vaela',
});

// Create subtasks
const subtask1 = await mcp.call('create_subtask', {
  parent_task_id: parent.id,
  title: 'Design database schema',
  assigned_to: 'Vaela',
});

const subtask2 = await mcp.call('create_subtask', {
  parent_task_id: parent.id,
  title: 'Write tests',
  queue_name: 'qa', // Override to qa queue
  assigned_to: 'Zaeion',
});
```

### Example 2: Query Task Hierarchy
```typescript
// Get all subtasks (immediate children)
const subtasks = await mcp.call('get_subtasks', {
  parent_task_id: 5,
});

// Get all descendants (recursive)
const allSubtasks = await mcp.call('get_subtasks', {
  parent_task_id: 5,
  recursive: true,
});

// Get task with subtasks
const task = await mcp.call('get_task', {
  id: 5,
});
// Returns task with subtask_count field
```

### Example 3: List Top-Level Tasks Only
```typescript
// Get only top-level tasks (no subtasks)
const topLevel = await mcp.call('list_tasks', {
  exclude_subtasks: true,
  status: 'idle',
});

// Get all subtasks of a specific parent
const childrenOfTask10 = await mcp.call('list_tasks', {
  parent_task_id: 10,
});
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
- [ ] API change log updated
- [ ] Migration guide includes subtask examples

## Dependencies
- Story 1: Database Schema and Type System Updates (MUST be complete)
- Story 2: Service Layer - Subtasks (MUST be complete)
- Zod for schema validation
- MCP SDK for tool registration

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All tools implemented and registered
- [ ] All handlers implemented
- [ ] All unit tests passing (12+ tests)
- [ ] All integration tests passing
- [ ] Code coverage >90%
- [ ] Code reviewed and approved
- [ ] MCP protocol compliance verified
- [ ] Documentation complete
- [ ] No breaking changes to existing tools

## Estimated Effort
**3-4 hours**

## Related Stories
- Story 2: Service Layer - Subtasks (prerequisite)
- Story 5: MCP Tools - Queues
- Story 6: MCP Resources

## Notes
- `create_subtask` is a convenience wrapper around `create_task`
- Consider deprecating `create_subtask` in favor of enhanced `create_task`
- Recursive queries may be expensive - consider documenting depth limits
- Tool descriptions should guide LLM agents effectively
- Error messages should be clear and actionable
