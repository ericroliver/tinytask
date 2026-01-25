# Database Migrations

## Overview

TinyTask MCP includes an automatic migration system to handle schema changes for existing databases. Migrations run automatically during database initialization, ensuring backward compatibility.

## Migration Strategy

The database uses a safe migration approach:

1. **Column Existence Check**: Before adding columns, the system checks if they already exist
2. **Non-destructive**: Migrations only add new columns/indexes, never remove or modify existing data
3. **Automatic Execution**: Migrations run on every server start during database initialization
4. **Idempotent**: Safe to run multiple times - no-op if changes already applied

## Current Migrations

### Subtasks and Queues (v2.0.0)

Adds support for hierarchical tasks and queue management:

- **`parent_task_id`**: INTEGER column for parent-child task relationships
  - Enables subtask functionality
  - NULL for top-level tasks
  - Foreign key reference to tasks(id)
  - Index created for query performance

- **`queue_name`**: TEXT column for queue-based task organization
  - Enables queue management
  - NULL for unqueued tasks
  - Multiple indexes for efficient queue queries

- **`previous_assigned_to`**: TEXT column for task handoff tracking
  - Tracks who previously owned a task
  - Used during task transfers between agents

### Task Blocking (v2.x.x)

Adds support for task blocking relationships:

- **`blocked_by_task_id`**: INTEGER column for blocking relationships
  - Enables task blocking functionality
  - NULL for unblocked tasks
  - Foreign key reference to tasks(id) with ON DELETE SET NULL
  - Index created for query performance
  - Blocking state computed at query time based on blocking task status

## Implementation

Migrations are implemented in [`src/db/client.ts`](../../src/db/client.ts:42):

```typescript
private runMigrations(): void {
  // Check column existence and add if missing
  if (!this.columnExists('tasks', 'parent_task_id')) {
    this.db.exec(`ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER;`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);`);
  }
  
  if (!this.columnExists('tasks', 'queue_name')) {
    this.db.exec(`ALTER TABLE tasks ADD COLUMN queue_name TEXT;`);
    // Create queue indexes...
  }
  
  if (!this.columnExists('tasks', 'previous_assigned_to')) {
    this.db.exec(`ALTER TABLE tasks ADD COLUMN previous_assigned_to TEXT;`);
  }
}
```

## Docker Deployment

When updating to a version with new migrations:

1. **Rebuild the Docker image**:
   ```bash
   docker compose build
   ```

2. **Restart the container**:
   ```bash
   docker compose up
   ```

3. **Migrations run automatically**: On startup, the database client checks for missing columns and adds them

## Data Persistence

- Database files are stored in Docker volumes
- Existing data is preserved during migrations
- New columns default to NULL for existing records

## Troubleshooting

### "no such column" Error

If you see errors like `no such column: parent_task_id`:

1. Ensure you've rebuilt the Docker image with the latest code
2. Check that the container is using the new image (not cached)
3. Force rebuild if needed: `docker compose build --no-cache`

### Migration Verification

To verify migrations have run:

1. Connect to the running container:
   ```bash
   docker compose exec tinytask-mcp sh
   ```

2. Check the database schema:
   ```bash
   sqlite3 /data/tinytask.db ".schema tasks"
   ```

3. Look for the new columns in the output

## Future Migrations

When adding new schema changes:

1. Add migration logic to [`runMigrations()`](../../src/db/client.ts:42)
2. Use column existence checks to ensure idempotency
3. Document the migration in this file
4. Test with both fresh and existing databases
