# Story 3: Service Layer

## Title
Implement business logic services for tasks, comments, and links

## Description
As a developer, I need to implement service classes that handle business logic for tasks, comments, and links so that the MCP tools have clean, reusable methods to work with.

## User Story
**As a** developer  
**I want to** create service classes with business logic  
**So that** MCP tools can perform operations without dealing with raw SQL

## Acceptance Criteria

### Must Have
- [ ] TaskService with CRUD methods (create, get, update, delete, list)
- [ ] TaskService.getQueue() method for agent queue queries
- [ ] CommentService with CRUD methods
- [ ] LinkService with CRUD methods
- [ ] Automatic timestamp management (created_at, updated_at)
- [ ] Input validation for all methods
- [ ] Proper error handling with descriptive messages
- [ ] Status validation (idle, working, complete)

### Should Have
- [ ] Type definitions for all service method parameters and returns
- [ ] TaskService.archive() method for soft delete
- [ ] Unit tests for each service method
- [ ] Validation for foreign key references

### Could Have
- [ ] Service-level caching for frequently accessed data
- [ ] Batch operations support

## Technical Details

### TaskService Interface
```typescript
// src/services/task-service.ts
export class TaskService {
  constructor(private db: DatabaseClient);
  
  // Create new task
  create(params: CreateTaskParams): Task;
  
  // Get task by ID with comments and links
  get(id: number, includeRelations?: boolean): Task | null;
  
  // Update task fields
  update(id: number, updates: Partial<Task>): Task;
  
  // Delete task (hard delete)
  delete(id: number): void;
  
  // List tasks with filtering
  list(filters: TaskFilters): Task[];
  
  // Get agent's queue (assigned open tasks)
  getQueue(agentName: string): Task[];
  
  // Archive task (soft delete)
  archive(id: number): Task;
}

interface CreateTaskParams {
  title: string;
  description?: string;
  assigned_to?: string;
  created_by?: string;
  priority?: number;
  tags?: string[];
}

interface TaskFilters {
  assigned_to?: string;
  status?: TaskStatus;
  include_archived?: boolean;
  limit?: number;
  offset?: number;
}

type TaskStatus = 'idle' | 'working' | 'complete';
```

### CommentService Interface
```typescript
// src/services/comment-service.ts
export class CommentService {
  constructor(private db: DatabaseClient);
  
  create(taskId: number, content: string, createdBy?: string): Comment;
  get(id: number): Comment | null;
  update(id: number, content: string): Comment;
  delete(id: number): void;
  listByTask(taskId: number): Comment[];
}
```

### LinkService Interface
```typescript
// src/services/link-service.ts
export class LinkService {
  constructor(private db: DatabaseClient);
  
  create(taskId: number, url: string, description?: string, createdBy?: string): Link;
  get(id: number): Link | null;
  update(id: number, updates: Partial<Link>): Link;
  delete(id: number): void;
  listByTask(taskId: number): Link[];
}
```

### Type Definitions
```typescript
// src/types/index.ts
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  priority: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  comments?: Comment[];
  links?: Link[];
}

export interface Comment {
  id: number;
  task_id: number;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: number;
  task_id: number;
  url: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}
```

### Validation Examples
```typescript
// Status validation
if (!['idle', 'working', 'complete'].includes(status)) {
  throw new Error(`Invalid status: ${status}`);
}

// Task exists validation
const task = this.db.queryOne('SELECT id FROM tasks WHERE id = ?', [taskId]);
if (!task) {
  throw new Error(`Task not found: ${taskId}`);
}

// Title required validation
if (!title || title.trim().length === 0) {
  throw new Error('Task title is required');
}
```

## Dependencies
- Story 2: Database Layer (needs DatabaseClient)

## Subtasks
1. [ ] Create src/types/index.ts with all type definitions
2. [ ] Create src/services/task-service.ts
3. [ ] Implement TaskService.create() with validation
4. [ ] Implement TaskService.get() with optional relations
5. [ ] Implement TaskService.update() with timestamp management
6. [ ] Implement TaskService.delete()
7. [ ] Implement TaskService.list() with filters
8. [ ] Implement TaskService.getQueue() for agent queries
9. [ ] Implement TaskService.archive()
10. [ ] Create src/services/comment-service.ts with all methods
11. [ ] Create src/services/link-service.ts with all methods
12. [ ] Add input validation to all methods
13. [ ] Add error handling to all methods
14. [ ] Write unit tests for services
15. [ ] Test with database integration

## Testing
- [ ] Can create task with all fields
- [ ] Can create task with minimal fields (title only)
- [ ] Can retrieve task by ID
- [ ] Can retrieve task with comments and links
- [ ] Can update task fields
- [ ] Can delete task
- [ ] Can list tasks with filters
- [ ] Can get agent queue (only open tasks)
- [ ] Can archive task (sets archived_at)
- [ ] Validation catches invalid status
- [ ] Validation catches missing required fields
- [ ] Errors provide clear messages
- [ ] Comments and links CRUD works
- [ ] Foreign key validation works

## Definition of Done
- All acceptance criteria met
- All three service classes implemented
- Type definitions complete
- Validation working
- Error handling in place
- Tests passing
- Code committed

## Estimated Effort
**8-12 hours**

## Priority
**P0 - Critical** (Blocks Stories 4-5)

## Labels
`services`, `business-logic`, `validation`, `phase-3`

## Notes
- Keep services focused on business logic, not data access details
- Services should handle validation before database operations
- Error messages should be clear for debugging agents
- Consider what data agents will need - include related data where useful
