# Story 2: Service Layer - Subtask Support

## Overview
Implement service layer methods to support hierarchical task relationships, including creating, retrieving, and managing subtasks.

## User Story
**As a** TinyTask API consumer  
**I want** service methods to create and retrieve subtasks  
**So that** I can build hierarchical task structures and query them efficiently

## Business Value
- Enables task breakdown and decomposition workflows
- Supports recursive task hierarchies
- Maintains referential integrity
- Prevents circular dependencies

## Acceptance Criteria

### Core Functionality
- [ ] `create()` accepts `parent_task_id` parameter
- [ ] `create()` validates parent task exists before creating subtask
- [ ] `create()` inherits `queue_name` from parent if not specified
- [ ] `update()` accepts `parent_task_id` parameter
- [ ] `update()` validates new parent task exists
- [ ] `update()` prevents circular references (task can't be its own ancestor)
- [ ] `delete()` handles subtasks appropriately (CASCADE or warning)

### New Methods
- [ ] `getSubtasks(parentId, recursive)` returns immediate children
- [ ] `getSubtasks(parentId, recursive=true)` returns all descendants
- [ ] `getWithSubtasks(id, recursive)` returns task with subtasks embedded
- [ ] `getTaskPath(id)` returns ancestor chain from root to task
- [ ] `getTopLevelTasks()` returns tasks with `parent_task_id = NULL`

### Enhanced Methods
- [ ] `list()` accepts `parent_task_id` filter
- [ ] `list()` accepts `exclude_subtasks` flag to filter out subtasks
- [ ] `get()` includes subtask count when `includeRelations=true`

### Validation
- [ ] Prevent setting task as its own parent
- [ ] Prevent circular references (A → B → C → A)
- [ ] Validate parent exists before assignment
- [ ] Handle edge cases gracefully

## Technical Details

### Method Signatures

```typescript
export class TaskService {
  
  // Enhanced create
  create(params: CreateTaskParams): ParsedTask {
    // If parent_task_id provided:
    // 1. Validate parent exists
    // 2. Inherit queue_name if not specified
    // 3. Create with parent reference
  }
  
  // Enhanced update
  update(id: number, updates: UpdateTaskParams): ParsedTask {
    // If parent_task_id changed:
    // 1. Validate new parent exists
    // 2. Check for circular references
    // 3. Update parent reference
  }
  
  // Get immediate subtasks
  getSubtasks(parentId: number, recursive = false): ParsedTask[] {
    if (!recursive) {
      // SELECT * FROM tasks WHERE parent_task_id = ?
    } else {
      // WITH RECURSIVE ... query all descendants
    }
  }
  
  // Get task with subtasks
  getWithSubtasks(id: number, recursive = false): TaskWithSubtasks {
    const task = this.get(id);
    const subtasks = this.getSubtasks(id, recursive);
    return { ...task, subtasks, subtask_count: subtasks.length };
  }
  
  // Get ancestor path
  getTaskPath(id: number): ParsedTask[] {
    // WITH RECURSIVE ... query ancestors
    // Return ordered from root to leaf
  }
  
  // Get top-level tasks
  getTopLevelTasks(filters?: TaskFilters): ParsedTask[] {
    // SELECT * FROM tasks WHERE parent_task_id IS NULL
  }
  
  // Prevent circular references
  private wouldCreateCycle(taskId: number, newParentId: number): boolean {
    // Check if newParentId is a descendant of taskId
    const descendants = this.getSubtasks(taskId, true);
    return descendants.some(t => t.id === newParentId);
  }
}
```

### SQL Queries

```sql
-- Get immediate subtasks
SELECT * FROM tasks 
WHERE parent_task_id = ? 
AND archived_at IS NULL
ORDER BY priority DESC, created_at ASC;

-- Get all descendants (recursive)
WITH RECURSIVE subtask_tree AS (
  -- Base case: immediate children
  SELECT * FROM tasks WHERE parent_task_id = ?
  UNION ALL
  -- Recursive case: children of children
  SELECT t.* 
  FROM tasks t
  INNER JOIN subtask_tree st ON t.parent_task_id = st.id
)
SELECT * FROM subtask_tree 
WHERE archived_at IS NULL
ORDER BY priority DESC, created_at ASC;

-- Get ancestor path (recursive)
WITH RECURSIVE ancestor_path AS (
  -- Base case: the task itself
  SELECT * FROM tasks WHERE id = ?
  UNION ALL
  -- Recursive case: parent of current
  SELECT t.*
  FROM tasks t
  INNER JOIN ancestor_path ap ON t.id = ap.parent_task_id
)
SELECT * FROM ancestor_path ORDER BY id ASC;

-- Get top-level tasks
SELECT * FROM tasks 
WHERE parent_task_id IS NULL 
AND archived_at IS NULL
ORDER BY priority DESC, created_at ASC;
```

### Circular Reference Detection

```typescript
private wouldCreateCycle(taskId: number, newParentId: number): boolean {
  if (taskId === newParentId) {
    return true; // Self-reference
  }
  
  // Check if newParentId is a descendant of taskId
  const descendants = this.getSubtasks(taskId, true);
  return descendants.some(t => t.id === newParentId);
}
```

## Testing Requirements

### Unit Tests
- [ ] Create task with valid parent_task_id
- [ ] Create task with invalid parent_task_id (error)
- [ ] Create subtask inherits parent's queue_name
- [ ] Create subtask with explicit queue_name (override)
- [ ] Update task to change parent
- [ ] Update task with circular reference (error)
- [ ] Update task to set self as parent (error)
- [ ] Delete parent deletes subtasks (CASCADE)
- [ ] Get immediate subtasks
- [ ] Get recursive subtasks (2+ levels)
- [ ] Get task with subtasks embedded
- [ ] Get ancestor path
- [ ] Get top-level tasks only
- [ ] List with parent_task_id filter
- [ ] List with exclude_subtasks flag

### Integration Tests
- [ ] Create 3-level hierarchy and query at each level
- [ ] Move subtask to different parent
- [ ] Archive parent but not subtasks
- [ ] Delete parent cascades to all descendants
- [ ] Prevent circular reference across multiple levels

### Edge Cases
- [ ] Task with 100+ subtasks performs adequately
- [ ] Recursive query with 10+ levels handles correctly
- [ ] NULL parent_task_id handled correctly
- [ ] Orphaned subtasks prevented by foreign key

## Performance Considerations
- Recursive queries can be expensive - consider depth limits
- Index on `parent_task_id` is critical for performance
- Consider caching ancestor paths for frequently accessed tasks
- Limit recursion depth to prevent infinite loops

## Migration from Existing Code
- No breaking changes to existing `create()` calls
- Existing tasks automatically have `parent_task_id = NULL`
- All existing functionality remains intact

## Dependencies
- Story 1: Database Schema and Type System Updates (MUST be complete)
- SQLite 3.8.3+ for recursive CTEs
- better-sqlite3 with transaction support

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All service methods implemented
- [ ] Circular reference prevention working
- [ ] All unit tests passing (15+ tests)
- [ ] All integration tests passing
- [ ] Code coverage >90%
- [ ] Code reviewed and approved
- [ ] Performance tests show acceptable query times
- [ ] No breaking changes to existing API

## Estimated Effort
**4-6 hours**

## Related Stories
- Story 1: Database Schema and Type System Updates (prerequisite)
- Story 3: Service Layer - Queues
- Story 4: MCP Tools - Subtasks

## Notes
- Recursive CTEs are well-supported in SQLite 3.8.3+
- Circular reference detection is O(n) where n = number of descendants
- Consider adding depth parameter to recursive queries for safety
- CASCADE delete is enforced at database level
- Queue inheritance is a convenience feature, not enforced
