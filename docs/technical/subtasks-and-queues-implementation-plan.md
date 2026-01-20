# Subtasks and Queue Management Implementation Plan

## Overview

This document outlines the implementation plan for adding two key features to TinyTask:
1. **Subtasks**: Hierarchical task relationships with parent-child structure
2. **Queue Management**: Team-level queue organization separate from individual agent assignment

## Current State Analysis

### Existing Features
- **assigned_to**: Individual agent assignment (Vaela, Gaion, Spartus, etc.)
- **Virtual Queue**: Current `getQueue()` filters by `assigned_to` + status
- **No Hierarchical Tasks**: All tasks are currently flat/top-level
- **No Team Queues**: No concept of team-level organization (dev, product, qa)

### Database Schema (Current)
```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('idle', 'working', 'complete')),
    assigned_to TEXT,              -- Individual agent
    previous_assigned_to TEXT,
    created_by TEXT,
    priority INTEGER DEFAULT 0,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME
);
```

## Requirements

### 1. Subtask Hierarchy

**Goal**: Allow tasks to have parent-child relationships

**Use Cases**:
- Break down complex tasks into smaller subtasks
- Track completion of parent tasks based on subtask status
- Maintain context between related work items
- Support 2+ levels of nesting (task → subtask → sub-subtask)

**Business Rules**:
- A task with `parent_task_id = NULL` is a top-level task
- A task with `parent_task_id != NULL` is a subtask
- Subtasks can have their own subtasks (recursive hierarchy)
- Deleting a parent task should cascade to subtasks (or prevent deletion if subtasks exist)
- Archiving a parent task should not automatically archive subtasks
- Subtasks inherit queue assignment from parent (but can be overridden)

### 2. Queue Management

**Goal**: Organize tasks by team/functional area separate from individual assignment

**Use Cases**:
- View all dev tasks (assigned and unassigned)
- View all product tasks for sprint planning
- Find unassigned tasks in QA queue
- Track workload distribution across teams

**Example Scenario**:
```
Task    Queue       Assigned To
1       dev         Vaela
2       dev         unassigned
3       product     Spartus
4       product     unassigned
5       product     Daedus
6       qa          Zaeion
7       qa          unassigned
8       qa          unassigned
```

**Business Rules**:
- `queue_name` identifies the team/functional area (dev, product, qa, etc.)
- `assigned_to` identifies the specific agent (Vaela, Gaion, etc.)
- Tasks can be in a queue but unassigned (`queue_name` set, `assigned_to` NULL)
- Tasks can be assigned without a queue (backwards compatibility)
- Queue is typically set at creation and rarely changes
- Individual assignment changes frequently

## Database Changes

### Schema Migration

```sql
-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN queue_name TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_queue_name ON tasks(queue_name);
CREATE INDEX IF NOT EXISTS idx_tasks_queue_status ON tasks(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_tasks_queue_assigned ON tasks(queue_name, assigned_to);
```

### Migration Strategy

1. **Backwards Compatibility**: Existing tasks will have `parent_task_id = NULL` and `queue_name = NULL`
2. **Data Integrity**: Foreign key constraint ensures parent tasks exist
3. **Cascade Behavior**: Deleting parent deletes subtasks (can be changed to RESTRICT if needed)

## Type System Changes

### Updated Database Types

```typescript
// src/types/database.ts

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'idle' | 'working' | 'complete';
  assigned_to: string | null;      // Individual agent
  previous_assigned_to: string | null;
  created_by: string | null;
  priority: number;
  tags: string | null;              // JSON array
  parent_task_id: number | null;    // NEW: Parent task reference
  queue_name: string | null;        // NEW: Team/functional queue
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: 'idle' | 'working' | 'complete';
  assigned_to?: string;
  created_by?: string;
  priority?: number;
  tags?: string[];
  parent_task_id?: number;          // NEW
  queue_name?: string;              // NEW
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'idle' | 'working' | 'complete';
  assigned_to?: string;
  priority?: number;
  tags?: string[];
  parent_task_id?: number;          // NEW
  queue_name?: string;              // NEW
}

// NEW: Subtask-specific types
export interface TaskWithSubtasks extends ParsedTask {
  subtasks?: ParsedTask[];
  subtask_count?: number;
}

// NEW: Queue statistics
export interface QueueStats {
  queue_name: string;
  total_tasks: number;
  by_status: {
    idle: number;
    working: number;
    complete: number;
  };
  assigned: number;
  unassigned: number;
  agents: string[];                  // List of agents with tasks in queue
}
```

## Service Layer Changes

### TaskService Enhancements

```typescript
// src/services/task-service.ts

export class TaskService {
  
  // ENHANCED: Create task with parent_task_id and queue_name support
  create(params: CreateTaskParams): ParsedTask {
    // Validate parent_task_id exists if provided
    // Inherit queue_name from parent if not specified
    // Insert with new fields
  }
  
  // ENHANCED: Update task with parent_task_id and queue_name support
  update(id: number, updates: UpdateTaskParams): ParsedTask {
    // Validate parent_task_id exists if changed
    // Prevent circular references (task can't be its own parent)
  }
  
  // NEW: Get subtasks for a parent task
  getSubtasks(parentId: number, recursive = false): ParsedTask[] {
    // Get immediate children
    // If recursive, get all descendants
  }
  
  // NEW: Get task with all subtasks
  getWithSubtasks(id: number, recursive = false): TaskWithSubtasks {
    // Get task
    // Get subtasks (recursive or not)
    // Include subtask count
  }
  
  // NEW: Get tasks by queue
  getQueueTasks(queueName: string, filters?: {
    assigned_to?: string;
    status?: TaskStatus;
    include_subtasks?: boolean;
  }): ParsedTask[] {
    // Filter by queue_name
    // Apply additional filters
    // Optionally include or exclude subtasks
  }
  
  // NEW: Get queue statistics
  getQueueStats(queueName: string): QueueStats {
    // Count tasks by status
    // Count assigned vs unassigned
    // List unique agents
  }
  
  // NEW: Get unassigned tasks in queue
  getUnassignedInQueue(queueName: string): ParsedTask[] {
    // Filter by queue_name and assigned_to IS NULL
  }
  
  // ENHANCED: List tasks with queue and parent filtering
  list(filters: TaskFilters = {}): ParsedTask[] {
    // Add queue_name filter
    // Add parent_task_id filter
    // Add option to exclude subtasks (only top-level)
  }
  
  // ENHANCED: Delete with subtask awareness
  delete(id: number, force = false): void {
    // Check if task has subtasks
    // Require force=true to delete task with subtasks
    // Or rely on CASCADE to delete subtasks automatically
  }
}
```

### Query Examples

```sql
-- Get all subtasks of task #5
SELECT * FROM tasks 
WHERE parent_task_id = 5 
AND archived_at IS NULL
ORDER BY priority DESC, created_at ASC;

-- Get all tasks in 'dev' queue
SELECT * FROM tasks 
WHERE queue_name = 'dev' 
AND archived_at IS NULL
ORDER BY priority DESC, created_at ASC;

-- Get unassigned tasks in 'qa' queue
SELECT * FROM tasks 
WHERE queue_name = 'qa' 
AND assigned_to IS NULL 
AND archived_at IS NULL
ORDER BY priority DESC, created_at ASC;

-- Get queue statistics
SELECT 
  queue_name,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle,
  SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working,
  SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete,
  SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned,
  SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END) as assigned
FROM tasks
WHERE queue_name = 'dev' 
AND archived_at IS NULL;

-- Get recursive subtasks (requires CTE)
WITH RECURSIVE subtask_tree AS (
  SELECT * FROM tasks WHERE id = 5
  UNION ALL
  SELECT t.* FROM tasks t
  INNER JOIN subtask_tree st ON t.parent_task_id = st.id
)
SELECT * FROM subtask_tree WHERE id != 5;
```

## MCP Tools Changes

### New Tools

```typescript
// Create subtask
create_subtask: z.object({
  parent_task_id: z.number().describe('Parent task ID'),
  title: z.string().describe('Subtask title'),
  description: z.string().optional().describe('Subtask description'),
  assigned_to: z.string().optional().describe('Agent to assign to'),
  priority: z.number().optional().describe('Priority (default: 0)'),
  tags: z.array(z.string()).optional().describe('Tags'),
  // queue_name inherited from parent unless overridden
  queue_name: z.string().optional().describe('Override queue from parent'),
}),

// Get subtasks
get_subtasks: z.object({
  parent_task_id: z.number().describe('Parent task ID'),
  recursive: z.boolean().optional().describe('Include nested subtasks'),
}),

// Get queue tasks
get_queue_tasks: z.object({
  queue_name: z.string().describe('Queue name (dev, product, qa, etc.)'),
  assigned_to: z.string().optional().describe('Filter by assignee'),
  status: z.enum(['idle', 'working', 'complete']).optional().describe('Filter by status'),
  include_subtasks: z.boolean().optional().describe('Include subtasks (default: true)'),
}),

// Get queue statistics
get_queue_stats: z.object({
  queue_name: z.string().describe('Queue name'),
}),

// Get unassigned tasks in queue
get_unassigned_in_queue: z.object({
  queue_name: z.string().describe('Queue name'),
}),

// List all queues
list_queues: z.object({
  include_stats: z.boolean().optional().describe('Include statistics for each queue'),
}),
```

### Enhanced Tools

```typescript
// Enhanced create_task - add queue_name and parent_task_id
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

// Enhanced update_task - add queue_name and parent_task_id
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

// Enhanced list_tasks - add queue and parent filters
list_tasks: z.object({
  assigned_to: z.string().optional().describe('Filter by assignee'),
  status: z.enum(['idle', 'working', 'complete']).optional().describe('Filter by status'),
  include_archived: z.boolean().optional().describe('Include archived tasks'),
  limit: z.number().optional().describe('Max results (default: 100)'),
  offset: z.number().optional().describe('Pagination offset'),
  queue_name: z.string().optional().describe('Filter by queue name'),
  parent_task_id: z.number().optional().describe('Filter by parent (use null for top-level)'),
  exclude_subtasks: z.boolean().optional().describe('Exclude subtasks from results'),
}),

// get_my_queue now supports queue-based filtering
get_my_queue: z.object({
  agent_name: z.string().describe('Agent name'),
  queue_name: z.string().optional().describe('Filter by queue'),
}),
```

## MCP Resources Changes

### New Resources

```
queue://{queue_name}/tasks
  - All tasks in the specified queue

queue://{queue_name}/unassigned
  - Unassigned tasks in the queue

queue://{queue_name}/stats
  - Statistics for the queue

queues://list
  - List of all active queues with counts

task://{id}/subtasks
  - All subtasks for a task

task://{id}/tree
  - Task with full subtask hierarchy
```

## UI/UX Considerations (for external applications)

### Queue View Example
```
Dev Queue (12 tasks)
├─ Assigned (8)
│  ├─ Vaela (3 tasks: 1 idle, 2 working)
│  ├─ Gaion (5 tasks: 2 idle, 2 working, 1 complete)
└─ Unassigned (4 tasks: 4 idle)

Product Queue (6 tasks)
├─ Assigned (4)
│  ├─ Spartus (2 tasks: 1 idle, 1 working)
│  ├─ Daedus (2 tasks: 2 idle)
└─ Unassigned (2 tasks: 2 idle)
```

### Task Hierarchy Example
```
Task #1: Implement User Authentication (dev, Vaela)
├─ Task #10: Design database schema (dev, Vaela, working)
├─ Task #11: Create API endpoints (dev, unassigned, idle)
│  ├─ Task #20: Login endpoint (dev, unassigned, idle)
│  └─ Task #21: Logout endpoint (dev, unassigned, idle)
└─ Task #12: Write tests (qa, unassigned, idle)
```

## Implementation Phases

### Phase 1: Database & Types (Story 1)
- Add schema migration
- Update TypeScript types
- Add indexes
- Write migration script
- Test data integrity

### Phase 2: Service Layer - Subtasks (Story 2)
- Implement `getSubtasks()`
- Implement `getWithSubtasks()`
- Update `create()` to handle parent_task_id
- Update `update()` to handle parent_task_id
- Update `delete()` with subtask awareness
- Add validation for circular references
- Write unit tests

### Phase 3: Service Layer - Queues (Story 3)
- Implement `getQueueTasks()`
- Implement `getQueueStats()`
- Implement `getUnassignedInQueue()`
- Update `create()` to handle queue_name
- Update `update()` to handle queue_name
- Update `list()` with queue filters
- Update `getQueue()` with queue filter
- Write unit tests

### Phase 4: MCP Tools - Subtasks (Story 4)
- Add `create_subtask` tool
- Add `get_subtasks` tool
- Update `create_task` tool
- Update `update_task` tool
- Update `list_tasks` tool
- Update `get_task` to show subtask info
- Write integration tests

### Phase 5: MCP Tools - Queues (Story 5)
- Add `get_queue_tasks` tool
- Add `get_queue_stats` tool
- Add `get_unassigned_in_queue` tool
- Add `list_queues` tool
- Update `get_my_queue` tool
- Write integration tests

### Phase 6: MCP Resources (Story 6)
- Add queue-based resources
- Add subtask-based resources
- Update resource definitions
- Write integration tests

### Phase 7: Testing & Documentation (Story 7)
- Integration tests for combined scenarios
- Performance tests for recursive queries
- Update README.md
- Update API documentation
- Create migration guide
- Update examples

## Testing Strategy

### Unit Tests
- TaskService methods with subtasks
- TaskService methods with queues
- Validation logic (circular references, etc.)
- Data integrity constraints

### Integration Tests
- Create task with subtasks
- Update parent affects subtasks (or doesn't)
- Delete parent cascades to subtasks
- Queue filtering with various combinations
- Agent queue with queue filter
- Recursive subtask queries

### Performance Tests
- Large hierarchies (100+ subtasks)
- Many queues with many tasks
- Recursive queries at depth
- Index effectiveness

## Migration Guide

### For Existing Users

```typescript
// Before: Create a task
const task = await mcp.call('create_task', {
  title: 'Fix bug',
  assigned_to: 'Vaela'
});

// After: Create a task with queue
const task = await mcp.call('create_task', {
  title: 'Fix bug',
  assigned_to: 'Vaela',
  queue_name: 'dev'
});

// NEW: Create a subtask
const subtask = await mcp.call('create_task', {
  title: 'Write test for fix',
  parent_task_id: task.id,
  assigned_to: 'Zaeion',
  queue_name: 'qa'
});

// NEW: Get all dev queue tasks
const devTasks = await mcp.call('get_queue_tasks', {
  queue_name: 'dev'
});

// NEW: Get unassigned QA tasks
const unassignedQA = await mcp.call('get_unassigned_in_queue', {
  queue_name: 'qa'
});
```

## Open Questions

1. **Queue Inheritance**: Should subtasks always inherit parent's queue? Or allow override?
   - **Recommendation**: Allow override for flexibility (e.g., parent in dev, subtask in qa)

2. **Deletion Behavior**: CASCADE or RESTRICT when parent has subtasks?
   - **Recommendation**: CASCADE with warning in UI, or require force flag

3. **Archive Behavior**: Should archiving parent archive subtasks?
   - **Recommendation**: No, allow independent archiving for flexibility

4. **Queue Validation**: Should we validate queue names against a predefined list?
   - **Recommendation**: No validation initially, allow free-form for flexibility

5. **Performance**: Do we need recursive CTE for subtasks, or is 2-level depth enough?
   - **Recommendation**: Support full recursion, but provide depth limit parameter

6. **Subtask Status**: Should parent status be computed from subtask status?
   - **Recommendation**: No automatic computation initially, allow manual control

## Success Metrics

- ✅ All existing tests pass
- ✅ New tests achieve >90% coverage
- ✅ Performance tests show <100ms for typical queries
- ✅ Zero breaking changes to existing API
- ✅ Documentation complete and reviewed
- ✅ Migration guide tested with sample data

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular reference bugs | High | Validation in service layer + tests |
| Performance degradation | Medium | Proper indexing + performance tests |
| Breaking changes | High | Backwards compatibility checks |
| Complex recursive queries | Medium | Limit depth + caching if needed |
| Data migration issues | Low | Nullable columns + careful testing |

## Dependencies

- SQLite version must support recursive CTEs (3.8.3+) ✅
- better-sqlite3 must support foreign keys (it does) ✅
- No external dependencies needed ✅

## Timeline Estimate

- Phase 1: 2-3 hours (Database & Types)
- Phase 2: 4-6 hours (Service Layer - Subtasks)
- Phase 3: 4-6 hours (Service Layer - Queues)
- Phase 4: 3-4 hours (MCP Tools - Subtasks)
- Phase 5: 3-4 hours (MCP Tools - Queues)
- Phase 6: 2-3 hours (MCP Resources)
- Phase 7: 3-4 hours (Testing & Documentation)

**Total: 21-30 hours**

## Next Steps

1. Review and approve this plan
2. Create product stories for each phase
3. Implement Phase 1 (Database & Types)
4. Proceed iteratively through remaining phases
5. Conduct final review and testing
