# Database Schema Changes for Task Blocking

## Current Tasks Table
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('idle', 'working', 'complete')),
    assigned_to TEXT,
    previous_assigned_to TEXT,
    created_by TEXT,
    priority INTEGER DEFAULT 0,
    tags TEXT,
    parent_task_id INTEGER,
    queue_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```
## Proposed Change
Add a nullable foreign key `blocked_by_task_id` referencing the same table.
```sql
ALTER TABLE tasks ADD COLUMN blocked_by_task_id INTEGER;
ALTER TABLE tasks ADD CONSTRAINT fk_blocked_by FOREIGN KEY (blocked_by_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
```
* `ON DELETE SET NULL` ensures that if a blocking task is removed, dependent tasks are unblocked.
* The column is nullable to allow tasks without blockers.

## Migration Strategy
1. **Add Column** – Use `ALTER TABLE` to add the column.
2. **Create Index** – Add an index on `blocked_by_task_id` for efficient lookups.
3. **Data Migration** – No data migration needed; existing rows will have `NULL`.
4. **Rollback Plan** – If needed, drop the column via a new migration that recreates the table without it.

## Impact on Application Layer
* Update TypeScript `Task` interface to include `blockedByTaskId?: number | null`.
* Update CRUD services to read/write this field.
* Add business logic for status transitions (see service layer section).

## Testing
* Integration tests will verify that closing a blocker clears `blockedByTaskId` on dependents and reopening restores it.
* Edge cases: self‑blocking, circular references should be rejected.
