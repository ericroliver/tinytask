# Story 2: Database Layer

## Title
Implement SQLite database layer with schema and client

## Description
As a developer, I need to implement the database layer with SQLite so that the application can persist task, comment, and link data.

## User Story
**As a** developer  
**I want to** create the database schema and client wrapper  
**So that** the application can store and retrieve task data persistently

## Acceptance Criteria

### Must Have
- [ ] schema.sql file with all 4 table definitions (tasks, comments, links, task_history)
- [ ] Database client module that wraps better-sqlite3
- [ ] Database initialization creates tables if they don't exist
- [ ] WAL mode enabled for better concurrency
- [ ] Foreign key constraints enabled
- [ ] Proper indexes created on query paths
- [ ] Connection management (open/close)
- [ ] Error handling for database operations

### Should Have
- [ ] Database client as singleton pattern
- [ ] Prepared statements for common queries
- [ ] Transaction support methods

### Could Have
- [ ] Database migration framework
- [ ] Query logging in debug mode
- [ ] Connection pooling (future PostgreSQL)

## Technical Details

### schema.sql
```sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('idle', 'working', 'complete')),
    assigned_to TEXT,
    created_by TEXT,
    priority INTEGER DEFAULT 0,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived_at);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);

-- Links table
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_links_task_id ON links(task_id);

-- Task history table (optional, for audit trail)
CREATE TABLE IF NOT EXISTS task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_task_id ON task_history(task_id);
```

### Database Client Interface
```typescript
// src/db/client.ts
export class DatabaseClient {
  private db: Database.Database;
  
  constructor(dbPath: string);
  
  // Initialize database
  initialize(): void;
  
  // Execute query
  query<T>(sql: string, params?: any[]): T[];
  
  // Execute single query
  queryOne<T>(sql: string, params?: any[]): T | null;
  
  // Execute write operation
  execute(sql: string, params?: any[]): Database.RunResult;
  
  // Transaction support
  transaction<T>(callback: () => T): T;
  
  // Close connection
  close(): void;
}
```

### Configuration
```typescript
// src/db/init.ts
export function initializeDatabase(dbPath: string): DatabaseClient {
  const client = new DatabaseClient(dbPath);
  
  // Enable WAL mode
  client.execute('PRAGMA journal_mode = WAL');
  
  // Enable foreign keys
  client.execute('PRAGMA foreign_keys = ON');
  
  // Set synchronous mode
  client.execute('PRAGMA synchronous = NORMAL');
  
  // Run schema
  const schema = fs.readFileSync('./schema.sql', 'utf-8');
  client.execute(schema);
  
  return client;
}
```

## Dependencies
- Story 1: Project Setup (needs better-sqlite3 installed)

## Subtasks
1. [ ] Create src/db/schema.sql with all table definitions
2. [ ] Create src/db/client.ts with DatabaseClient class
3. [ ] Implement connection management
4. [ ] Implement query methods (query, queryOne, execute)
5. [ ] Implement transaction support
6. [ ] Create src/db/init.ts with initialization logic
7. [ ] Enable WAL mode and pragmas
8. [ ] Add error handling and logging
9. [ ] Create simple test script to verify database creation
10. [ ] Test CRUD operations manually

## Testing
- [ ] Database file is created on first run
- [ ] All tables are created with correct schema
- [ ] Indexes are created
- [ ] Foreign key constraints work (cascade delete)
- [ ] WAL mode is enabled
- [ ] Can insert, update, query, delete records
- [ ] Transactions rollback on error
- [ ] Multiple connections work (WAL mode)

## Definition of Done
- All acceptance criteria met
- schema.sql complete with all tables
- DatabaseClient fully implemented
- Initialization logic working
- Error handling in place
- Manual tests pass
- Code committed

## Estimated Effort
**4-6 hours**

## Priority
**P0 - Critical** (Blocks Stories 3-10)

## Labels
`database`, `sqlite`, `infrastructure`, `phase-2`

## Notes
- Keep database client simple - don't over-engineer
- Focus on getting CRUD operations working
- WAL mode is critical for multi-agent concurrency
- Error messages should be clear for debugging
