# TinyTask CLI - Subtasks and Queues Update Plan

## Overview

This document outlines the required updates to the TinyTask CLI to support the newly implemented subtasks and queues features in the MCP server.

## Background

The TinyTask MCP server has been enhanced with:
- **Subtasks**: Hierarchical task relationships (parent-child structure)
- **Queue Management**: Team-level queue organization (dev, product, qa, etc.)

The CLI needs to be updated to expose these features to users through intuitive command-line interfaces.

## Current State Analysis

### Existing CLI Commands
- **Task Management**: create, get, update, delete, archive, list
- **Agent Queue**: `queue [agent]` - view agent's assigned tasks
- **Workflow**: signup, move
- **Metadata**: comment, link operations
- **Configuration**: config management

### MCP Server Capabilities (New/Enhanced)

#### New Tools
1. **Subtask Tools**:
   - `create_subtask` - Create subtask under parent
   - `get_subtasks` - Get subtasks for parent
   - `get_task_with_subtasks` - Get task with subtask tree
   - `move_subtask` - Move subtask to different parent

2. **Queue Tools**:
   - `list_queues` - List all queue names
   - `get_queue_stats` - Get queue statistics
   - `add_task_to_queue` - Add task to queue
   - `remove_task_from_queue` - Remove task from queue
   - `move_task_to_queue` - Move task between queues
   - `get_queue_tasks` - Get all tasks in queue
   - `clear_queue` - Remove all tasks from queue

#### Enhanced Tools
- `create_task`: Added `parent_task_id`, `queue_name`
- `update_task`: Added `parent_task_id`, `queue_name`
- `list_tasks`: Added `queue_name`, `parent_task_id`, `exclude_subtasks` filters

## Implementation Plan

### Phase 1: MCP Client Updates

**File**: `tinytask-cli/src/client/mcp-client.ts`

#### 1.1 Update Type Definitions

```typescript
// Enhanced CreateTaskParams
export interface CreateTaskParams {
  title: string;
  description?: string;
  assigned_to?: string;
  created_by?: string;
  priority?: number;
  tags?: string[];
  status?: 'idle' | 'working' | 'complete';
  parent_task_id?: number;      // NEW: Create as subtask
  queue_name?: string;           // NEW: Assign to queue
}

// Enhanced UpdateTaskParams
export interface UpdateTaskParams {
  id: number;
  title?: string;
  description?: string;
  status?: 'idle' | 'working' | 'complete';
  assigned_to?: string;
  priority?: number;
  tags?: string[];
  parent_task_id?: number;       // NEW: Change parent
  queue_name?: string;            // NEW: Change queue
}

// Enhanced TaskFilters
export interface TaskFilters {
  assigned_to?: string;
  status?: 'idle' | 'working' | 'complete';
  include_archived?: boolean;
  limit?: number;
  offset?: number;
  queue_name?: string;            // NEW: Filter by queue
  parent_task_id?: number;        // NEW: Filter by parent
  exclude_subtasks?: boolean;     // NEW: Exclude subtasks
}

// New: CreateSubtaskParams
export interface CreateSubtaskParams {
  parent_task_id: number;
  title: string;
  description?: string;
  assigned_to?: string;
  priority?: number;
  tags?: string[];
  queue_name?: string;
}

// New: GetSubtasksParams
export interface GetSubtasksParams {
  parent_task_id: number;
  recursive?: boolean;
  include_archived?: boolean;
}

// New: QueueFilters
export interface QueueFilters {
  queue_name: string;
  assigned_to?: string;
  status?: 'idle' | 'working' | 'complete';
  parent_task_id?: number;
  exclude_subtasks?: boolean;
  include_archived?: boolean;
  limit?: number;
  offset?: number;
}
```

#### 1.2 Add Subtask Methods

```typescript
// Subtask Operations
async createSubtask(params: CreateSubtaskParams): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'create_subtask',
    arguments: params,
  });
  return this.parseResult(result);
}

async getSubtasks(params: GetSubtasksParams): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'get_subtasks',
    arguments: params,
  });
  return this.parseResult(result);
}

async getTaskWithSubtasks(taskId: number, recursive = false): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'get_task_with_subtasks',
    arguments: { task_id: taskId, recursive },
  });
  return this.parseResult(result);
}

async moveSubtask(subtaskId: number, newParentId?: number): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'move_subtask',
    arguments: { subtask_id: subtaskId, new_parent_id: newParentId },
  });
  return this.parseResult(result);
}
```

#### 1.3 Add Queue Methods

```typescript
// Queue Operations
async listQueues(): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'list_queues',
    arguments: {},
  });
  return this.parseResult(result);
}

async getQueueStats(queueName: string): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'get_queue_stats',
    arguments: { queue_name: queueName },
  });
  return this.parseResult(result);
}

async addTaskToQueue(taskId: number, queueName: string): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'add_task_to_queue',
    arguments: { task_id: taskId, queue_name: queueName },
  });
  return this.parseResult(result);
}

async removeTaskFromQueue(taskId: number): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'remove_task_from_queue',
    arguments: { task_id: taskId },
  });
  return this.parseResult(result);
}

async moveTaskToQueue(taskId: number, newQueueName: string): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'move_task_to_queue',
    arguments: { task_id: taskId, new_queue_name: newQueueName },
  });
  return this.parseResult(result);
}

async getQueueTasks(filters: QueueFilters): Promise<unknown> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'get_queue_tasks',
    arguments: filters,
  });
  return this.parseResult(result);
}

async clearQueue(queueName: string): Promise<void> {
  this.ensureConnected();
  const result = await this.client.callTool({
    name: 'clear_queue',
    arguments: { queue_name: queueName },
  });
  this.parseResult(result, true);
}
```

### Phase 2: New Subtask Commands

**File**: `tinytask-cli/src/commands/subtask.ts`

Create comprehensive subtask management commands:

```bash
# Create subtask
tinytask subtask create <parent-id> <title>
tinytask subtask create 5 "Design database schema" -d "Create ERD" -a alice

# List subtasks
tinytask subtask list <parent-id>
tinytask subtask list 5                    # Direct children only
tinytask subtask list 5 --recursive        # All descendants
tinytask subtask list 5 --include-archived

# View task with subtask tree
tinytask subtask tree <task-id>
tinytask subtask tree 5                    # Show hierarchy
tinytask subtask tree 5 --recursive        # Full tree

# Move subtask to different parent
tinytask subtask move <subtask-id> <new-parent-id>
tinytask subtask move 10 5                 # Move to new parent
tinytask subtask move 10                   # Make top-level (no parent)

# Aliases
tinytask st create <parent-id> <title>
tinytask st list <parent-id>
tinytask st tree <task-id>
tinytask st move <subtask-id> [new-parent-id]
```

### Phase 3: Enhanced Queue Commands

**File**: `tinytask-cli/src/commands/queue.ts`

Transform from single command to command group:

```bash
# Existing - View agent's queue (KEEP)
tinytask queue <agent>
tinytask queue alice
tinytask queue --mine

# NEW - List all queues
tinytask queue list
tinytask queue ls

# NEW - Queue statistics
tinytask queue stats <queue-name>
tinytask queue stats dev
tinytask queue stats qa --json

# NEW - View tasks in queue
tinytask queue tasks <queue-name>
tinytask queue tasks dev                   # All tasks in dev queue
tinytask queue tasks dev --status idle     # Only idle tasks
tinytask queue tasks dev --assigned-to alice
tinytask queue tasks dev --exclude-subtasks

# NEW - Add task to queue
tinytask queue add <task-id> <queue-name>
tinytask queue add 5 dev

# NEW - Remove task from queue
tinytask queue remove <task-id>
tinytask queue remove 5

# NEW - Move task between queues
tinytask queue move <task-id> <new-queue>
tinytask queue move 5 qa

# NEW - Clear queue
tinytask queue clear <queue-name>
tinytask queue clear dev --yes
```

### Phase 4: Enhanced Task Commands

#### 4.1 Enhanced `task create`

**File**: `tinytask-cli/src/commands/task/create.ts`

```bash
# Add new options
tinytask task create <title> \
  --parent <id>        # Create as subtask
  --queue <name>       # Assign to queue

# Examples
tinytask task create "Implement feature X" --queue dev
tinytask task create "Write tests" --parent 5 --assigned-to alice
tinytask task create "Bug fix" --queue qa --priority 8
```

#### 4.2 Enhanced `task update`

**File**: `tinytask-cli/src/commands/task/update.ts`

```bash
# Add new options
tinytask task update <id> \
  --parent <id>        # Change parent
  --queue <name>       # Change queue

# Examples
tinytask task update 10 --queue qa
tinytask task update 10 --parent 5
tinytask task update 10 --parent null      # Make top-level
```

#### 4.3 Enhanced `task list`

**File**: `tinytask-cli/src/commands/task/list.ts`

```bash
# Add new options
tinytask task list \
  --queue <name>           # Filter by queue
  --parent <id>            # Filter by parent
  --exclude-subtasks       # Only top-level tasks

# Examples
tinytask task list --queue dev
tinytask task list --queue dev --status working
tinytask task list --parent 5
tinytask task list --exclude-subtasks
tinytask task list --queue qa --assigned-to alice
```

### Phase 5: Formatter Enhancements

**Files**: `tinytask-cli/src/formatters/*.ts`

#### 5.1 Table Formatter Updates

Add columns for queue_name and parent_task_id when present:

```
ID  Title                Queue   Parent  Assigned  Status   Priority
1   User Authentication  dev     -       alice     working  5
2   Design schema        dev     1       bob       idle     3
3   Write tests         qa      1       charlie   idle     2
```

#### 5.2 Tree Formatter (New)

Create hierarchical display for subtasks:

```
Task #1: User Authentication [dev] (alice)
├── Task #2: Design schema (bob)
│   └── Task #5: Create ERD (alice)
├── Task #3: Write tests (charlie)
└── Task #4: Deploy (unassigned)
```

#### 5.3 Queue Stats Formatter (New)

Format queue statistics:

```
Queue: dev
─────────────────────────
Total Tasks:     12
  Idle:          5
  Working:       4
  Complete:      3

Assignment:
  Assigned:      10
  Unassigned:    2

Agents:          alice, bob, charlie
```

### Phase 6: CLI Structure Updates

**File**: `tinytask-cli/src/cli.ts`

Register new command groups:

```typescript
import { createSubtaskCommands } from './commands/subtask.js';
import { createQueueCommands } from './commands/queue.js'; // Enhanced

// ...

// Subtask commands (NEW)
createSubtaskCommands(program);

// Queue commands (ENHANCED - now a command group)
createQueueCommands(program);
```

## Implementation Stories

### Story 1: MCP Client Updates
**Effort**: 3-4 hours  
**Files**: `mcp-client.ts`

- Update type definitions
- Add subtask methods
- Add queue methods
- Update existing method signatures

### Story 2: Subtask Commands
**Effort**: 4-5 hours  
**Files**: New `commands/subtask.ts`

- Implement create subtask command
- Implement list subtasks command
- Implement tree view command
- Implement move subtask command
- Add aliases and help text

### Story 3: Enhanced Queue Commands
**Effort**: 5-6 hours  
**Files**: `commands/queue.ts`

- Refactor to command group structure
- Keep existing agent queue command
- Add list queues command
- Add queue stats command
- Add queue tasks command
- Add queue management commands (add/remove/move/clear)

### Story 4: Enhanced Task Commands
**Effort**: 2-3 hours  
**Files**: `commands/task/*.ts`

- Add parent and queue options to create
- Add parent and queue options to update
- Add queue and parent filters to list
- Add exclude-subtasks option to list

### Story 5: Formatter Enhancements
**Effort**: 3-4 hours  
**Files**: `formatters/*.ts`

- Update table formatter for new fields
- Create tree formatter for hierarchies
- Create stats formatter for queue stats
- Update compact formatter

### Story 6: Testing and Documentation
**Effort**: 3-4 hours  
**Files**: `tests/`, `README.md`

- Add unit tests for new client methods
- Add integration tests for commands
- Update README with new command examples
- Update CLI help text

## Total Effort Estimate

**20-26 hours** across all stories

## Command Summary

### New Commands (9)
1. `tinytask subtask create <parent-id> <title>` - Create subtask
2. `tinytask subtask list <parent-id>` - List subtasks
3. `tinytask subtask tree <task-id>` - Show task hierarchy
4. `tinytask subtask move <subtask-id> [new-parent]` - Move subtask
5. `tinytask queue list` - List all queues
6. `tinytask queue stats <queue>` - Queue statistics
7. `tinytask queue tasks <queue>` - Tasks in queue
8. `tinytask queue add/remove/move/clear` - Queue management

### Enhanced Commands (3)
1. `tinytask task create` - Add `--parent`, `--queue`
2. `tinytask task update` - Add `--parent`, `--queue`
3. `tinytask task list` - Add `--queue`, `--parent`, `--exclude-subtasks`

### Unchanged Commands
- All comment commands
- All link commands
- All config commands
- signup, move commands

## Example Workflows

### Create Task Hierarchy
```bash
# Create parent task in dev queue
tinytask task create "User Authentication" --queue dev -a alice

# Create subtasks
tinytask subtask create 1 "Design schema" -a bob
tinytask subtask create 1 "Implement API" -a alice
tinytask subtask create 1 "Write tests" -a charlie

# View hierarchy
tinytask subtask tree 1

# Move subtask to different parent
tinytask subtask move 4 2
```

### Queue Management
```bash
# View all queues
tinytask queue list

# Check dev queue stats
tinytask queue stats dev

# See unassigned tasks in QA
tinytask queue tasks qa --status idle

# Move task between queues
tinytask queue move 5 qa

# Add existing task to queue
tinytask queue add 10 dev
```

### Sprint Planning
```bash
# See all dev tasks
tinytask queue tasks dev --exclude-subtasks

# Filter by status
tinytask queue tasks dev --status idle

# View specific agent's queue in dev
tinytask queue tasks dev --assigned-to alice

# Assign unassigned work
tinytask task update 5 --assigned-to bob
```

## Backwards Compatibility

All existing commands remain functional:
- `tinytask task create` works without new options
- `tinytask queue <agent>` continues to work
- Existing formatters handle missing queue/parent fields gracefully
- No breaking changes to command syntax

## Success Criteria

- ✅ All new MCP tools accessible via CLI
- ✅ Enhanced tools support new parameters
- ✅ Backwards compatibility maintained
- ✅ Comprehensive help text and examples
- ✅ Unit and integration tests passing
- ✅ Documentation updated
- ✅ User-friendly error messages

## Related Documentation

- [Subtasks and Queues Implementation](../subtasks-and-queues/README.md)
- [Technical Implementation Plan](../../technical/subtasks-and-queues-implementation-plan.md)
- [TinyTask CLI PRD](../../product/tinytask-cli-prd.md)
