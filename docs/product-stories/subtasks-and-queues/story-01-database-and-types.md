# Story 1: Database Schema and Type System Updates

## Overview
Add database schema support for hierarchical tasks (subtasks) and queue management, along with corresponding TypeScript type definitions.

## User Story
**As a** TinyTask developer  
**I want** the database schema to support parent-child task relationships and queue assignments  
**So that** tasks can be organized hierarchically and grouped by team/functional area

## Business Value
- Enables task breakdown into manageable subtasks
- Supports team-based task organization
- Maintains backwards compatibility with existing data
- Provides foundation for all subsequent features

## Acceptance Criteria

### Database Schema
- [ ] `parent_task_id` column added to tasks table (INTEGER, nullable, foreign key to tasks.id)
- [ ] `queue_name` column added to tasks table (TEXT, nullable)
- [ ] Foreign key constraint on `parent_task_id` with CASCADE delete behavior
- [ ] Index created on `parent_task_id` for performance
- [ ] Index created on `queue_name` for performance
- [ ] Composite index created on `(queue_name, status)` for queue filtering
- [ ] Composite index created on `(queue_name, assigned_to)` for queue+agent filtering
- [ ] All existing tasks have NULL values for new columns
- [ ] Schema migration script created and tested

### TypeScript Types
- [ ] `Task` interface updated with `parent_task_id` and `queue_name` fields
- [ ] `CreateTaskInput` interface updated with optional `parent_task_id` and `queue_name`
- [ ] `UpdateTaskInput` interface updated with optional `parent_task_id` and `queue_name`
- [ ] `TaskWithSubtasks` interface created with subtasks array and count
- [ ] `QueueStats` interface created for queue statistics
- [ ] All type exports updated in index files
- [ ] Type definitions compile without errors

### Data Integrity
- [ ] Foreign key constraints enforced (SQLite PRAGMA foreign_keys = ON verified)
- [ ] CASCADE delete removes subtasks when parent deleted
- [ ] NULL parent_task_id represents top-level tasks
- [ ] NULL queue_name supported for backwards compatibility
- [ ] No data loss during migration

## Technical Details

### Schema Changes
```sql
-- Add new columns
ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN queue_name TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_queue_name ON tasks(queue_name);
CREATE INDEX IF NOT EXISTS idx_tasks_queue_status ON tasks(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_tasks_queue_assigned ON tasks(queue_name, assigned_to);
```

### Type Updates
```typescript
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'idle' | 'working' | 'complete';
  assigned_to: string | null;
  previous_assigned_to: string | null;
  created_by: string | null;
  priority: number;
  tags: string | null;
  parent_task_id: number | null;    // NEW
  queue_name: string | null;        // NEW
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface TaskWithSubtasks extends ParsedTask {
  subtasks?: ParsedTask[];
  subtask_count?: number;
}

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
  agents: string[];
}
```

## Testing Requirements

### Unit Tests
- [ ] Schema migration applies successfully to fresh database
- [ ] Schema migration applies successfully to database with existing data
- [ ] Foreign key constraint prevents invalid parent_task_id
- [ ] Cascade delete removes subtasks when parent deleted
- [ ] Indexes created and queryable
- [ ] Type definitions compile and validate correctly

### Integration Tests
- [ ] Existing tests pass with schema changes
- [ ] New columns accept NULL values
- [ ] New columns accept valid values
- [ ] Foreign key relationships work correctly

## Migration Strategy

### For Existing Databases
1. Run ALTER TABLE statements to add columns
2. Create indexes
3. Verify foreign_keys pragma is enabled
4. Test CASCADE delete behavior
5. No data modification required (all NULLs initially)

### Rollback Plan
- Schema changes are additive (nullable columns)
- Can be rolled back by dropping columns if needed
- No data at risk during migration

## Dependencies
- SQLite 3.8.3+ (for recursive CTEs in future stories)
- better-sqlite3 with foreign key support
- TypeScript 4.0+

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Schema migration script created and tested
- [ ] Type definitions updated and exported
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No breaking changes to existing functionality

## Estimated Effort
**2-3 hours**

## Related Stories
- Story 2: Service Layer - Subtasks
- Story 3: Service Layer - Queues
- Story 4: MCP Tools - Subtasks
- Story 5: MCP Tools - Queues

## Notes
- Nullable columns ensure backwards compatibility
- CASCADE delete is the default behavior (can be changed if needed)
- No validation on queue_name values (free-form text)
- Parent-child relationships can be N levels deep
