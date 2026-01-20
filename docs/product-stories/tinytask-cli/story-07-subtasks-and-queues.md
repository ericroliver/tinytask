# Story 7: Subtasks and Queues Support

## Overview

Update TinyTask CLI to support the new subtasks and queues features implemented in the MCP server. This includes enhancing existing commands, adding new command groups, and updating formatters to display hierarchical and queue-based data.

## Prerequisites

- TinyTask MCP server v2.x with subtasks and queues support
- Existing CLI codebase with task, queue, comment, and link commands

## Goals

1. ✅ All new MCP tools accessible via CLI commands
2. ✅ Enhanced existing commands support new parameters
3. ✅ Backwards compatibility maintained
4. ✅ User-friendly command structure
5. ✅ Comprehensive error handling and help text

## User Stories

### As a developer, I want to:
- Create subtasks under parent tasks to break down complex work
- View task hierarchies in a tree structure
- Organize tasks into team queues (dev, product, qa)
- View queue statistics to understand workload distribution
- Filter and search tasks by queue and parent relationships

### As a product manager, I want to:
- Create epic tasks with subtasks for sprint planning
- Move subtasks between parents as priorities change
- View all tasks in the product queue
- Identify unassigned work in my queue

### As a QA engineer, I want to:
- See all tasks in the QA queue
- Track which tasks have testing subtasks
- Move tasks between dev and QA queues

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLI Layer                        │
│  (argument parsing, validation, user interaction)   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                 Command Layer                       │
│  - subtask.ts (new)                                 │
│  - queue.ts (enhanced)                              │
│  - task/create.ts (enhanced)                        │
│  - task/update.ts (enhanced)                        │
│  - task/list.ts (enhanced)                          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│               MCP Client Layer                      │
│  - Type definitions                                 │
│  - Subtask methods (4 new)                          │
│  - Queue methods (7 new)                            │
│  - Enhanced task methods                            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              Formatter Layer                        │
│  - table.ts (enhanced)                              │
│  - tree.ts (new)                                    │
│  - stats.ts (new)                                   │
│  - json.ts (unchanged)                              │
└─────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Task 1: MCP Client Updates

**File**: `tinytask-cli/src/client/mcp-client.ts`

**Effort**: 3-4 hours

#### 1.1 Type Definitions

Add/update interfaces:

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
  parent_task_id?: number;      // NEW
  queue_name?: string;           // NEW
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
  parent_task_id?: number;       // NEW
  queue_name?: string;            // NEW
}

// Enhanced TaskFilters
export interface TaskFilters {
  assigned_to?: string;
  status?: 'idle' | 'working' | 'complete';
  include_archived?: boolean;
  limit?: number;
  offset?: number;
  queue_name?: string;            // NEW
  parent_task_id?: number;        // NEW
  exclude_subtasks?: boolean;     // NEW
}

// NEW: Subtask interfaces
export interface CreateSubtaskParams {
  parent_task_id: number;
  title: string;
  description?: string;
  assigned_to?: string;
  priority?: number;
  tags?: string[];
  queue_name?: string;
}

export interface GetSubtasksParams {
  parent_task_id: number;
  recursive?: boolean;
  include_archived?: boolean;
}

// NEW: Queue interfaces
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

#### 1.2 Subtask Methods

```typescript
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
    arguments: { 
      subtask_id: subtaskId, 
      new_parent_id: newParentId 
    },
  });
  return this.parseResult(result);
}
```

#### 1.3 Queue Methods

```typescript
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

**Acceptance Criteria**:
- ✅ All type definitions added
- ✅ All 4 subtask methods implemented
- ✅ All 7 queue methods implemented
- ✅ Type safety maintained
- ✅ Error handling consistent with existing patterns

---

### Task 2: Subtask Commands

**File**: `tinytask-cli/src/commands/subtask.ts` (new)

**Effort**: 4-5 hours

Create comprehensive subtask command group with four subcommands.

#### 2.1 Command Structure

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createSubtaskCommands(program: Command): void {
  const subtask = program
    .command('subtask')
    .alias('st')
    .description('Manage task hierarchies and subtasks');

  // Create subtask
  subtask
    .command('create <parent-id> <title>')
    .description('Create a new subtask under a parent task')
    .option('-d, --description <text>', 'Subtask description')
    .option('-a, --assigned-to <agent>', 'Assign to agent')
    .option('-p, --priority <number>', 'Priority (default: 0)', parseInt)
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-q, --queue <name>', 'Override queue from parent')
    .action(async (parentId: string, title: string, options, command) => {
      // Implementation
    });

  // List subtasks
  subtask
    .command('list <parent-id>')
    .alias('ls')
    .description('List all subtasks for a parent task')
    .option('-r, --recursive', 'Include all nested subtasks')
    .option('--include-archived', 'Include archived subtasks')
    .action(async (parentId: string, options, command) => {
      // Implementation
    });

  // Tree view
  subtask
    .command('tree <task-id>')
    .description('Show task hierarchy as a tree structure')
    .option('-r, --recursive', 'Show complete subtask tree')
    .action(async (taskId: string, options, command) => {
      // Implementation
    });

  // Move subtask
  subtask
    .command('move <subtask-id> [new-parent-id]')
    .description('Move subtask to a different parent or make it top-level')
    .action(async (subtaskId: string, newParentId: string | undefined, options, command) => {
      // Implementation
    });
}
```

#### 2.2 Implementation Details

**Create Subtask**:
```typescript
const config = await loadConfig({
  url: command.optsWithGlobals().url,
  outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
});

const parent_id = parseInt(parentId, 10);
if (isNaN(parent_id)) {
  console.error(chalk.red('Error: Parent ID must be a number'));
  process.exit(1);
}

const client = await ensureConnected(config.url);

const tags = options.tags
  ? options.tags.split(',').map((t: string) => t.trim())
  : undefined;

const subtask = await client.createSubtask({
  parent_task_id: parent_id,
  title,
  description: options.description,
  assigned_to: options.assignedTo || config.defaultAgent,
  priority: options.priority,
  tags,
  queue_name: options.queue,
});

const formatter = createFormatter(config.outputFormat, {
  color: config.colorOutput,
  verbose: false,
});

console.log(formatter.format(subtask));

if (config.outputFormat === 'table') {
  console.log(chalk.green(`✓ Subtask #${subtask.id} created under task #${parent_id}`));
}
```

**List Subtasks**:
```typescript
const parent_id = parseInt(parentId, 10);
if (isNaN(parent_id)) {
  console.error(chalk.red('Error: Parent ID must be a number'));
  process.exit(1);
}

const client = await ensureConnected(config.url);

const subtasks = await client.getSubtasks({
  parent_task_id: parent_id,
  recursive: options.recursive,
  include_archived: options.includeArchived,
});

const formatter = createFormatter(config.outputFormat, {
  color: config.colorOutput,
  verbose: false,
});

console.log(formatter.format(subtasks));
```

**Tree View**:
```typescript
const task_id = parseInt(taskId, 10);
if (isNaN(task_id)) {
  console.error(chalk.red('Error: Task ID must be a number'));
  process.exit(1);
}

const client = await ensureConnected(config.url);

const taskTree = await client.getTaskWithSubtasks(task_id, options.recursive);

// Use tree formatter
const formatter = createFormatter('tree', {
  color: config.colorOutput,
  verbose: false,
});

console.log(formatter.format(taskTree));
```

**Move Subtask**:
```typescript
const subtask_id = parseInt(subtaskId, 10);
const new_parent_id = newParentId ? parseInt(newParentId, 10) : undefined;

if (isNaN(subtask_id)) {
  console.error(chalk.red('Error: Subtask ID must be a number'));
  process.exit(1);
}

if (newParentId && isNaN(new_parent_id!)) {
  console.error(chalk.red('Error: New parent ID must be a number'));
  process.exit(1);
}

const client = await ensureConnected(config.url);

const result = await client.moveSubtask(subtask_id, new_parent_id);

if (new_parent_id) {
  console.log(chalk.green(`✓ Subtask #${subtask_id} moved to parent #${new_parent_id}`));
} else {
  console.log(chalk.green(`✓ Subtask #${subtask_id} made top-level task`));
}
```

**Acceptance Criteria**:
- ✅ Four subcommands implemented (create, list, tree, move)
- ✅ All options parsed correctly
- ✅ Input validation (numeric IDs, required fields)
- ✅ Error handling with helpful messages
- ✅ Success confirmation messages
- ✅ Respects output format configuration

---

### Task 3: Enhanced Queue Commands

**File**: `tinytask-cli/src/commands/queue.ts`

**Effort**: 5-6 hours

Transform from single command to comprehensive queue management command group while maintaining backwards compatibility.

#### 3.1 Backwards Compatible Command Structure

```typescript
export function createQueueCommands(program: Command): void {
  const queue = program
    .command('queue [agent]')
    .alias('q')
    .description('Manage task queues');

  // Handle backwards compatibility for 'tinytask queue <agent>'
  queue.action(async (agent: string | undefined, options, command) => {
    // If no subcommand, treat as 'view'
    if (agent && !command.args.includes('list') && !command.args.includes('stats')) {
      return viewAgentQueueAction(agent, options, command);
    }
  });

  // Subcommands...
}
```

#### 3.2 Subcommands

**View Agent Queue** (existing - enhanced):
```typescript
queue
  .command('view [agent]')
  .description('View task queue for an agent')
  .option('--mine', 'View my queue (uses default agent)')
  .option('-s, --status <status>', 'Filter by status')
  .action(viewAgentQueueAction);
```

**List All Queues** (new):
```typescript
queue
  .command('list')
  .alias('ls')
  .description('List all queue names currently in use')
  .action(async (options, command) => {
    const config = await loadConfig({
      url: command.optsWithGlobals().url,
      outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
    });

    const client = await ensureConnected(config.url);
    const queues = await client.listQueues();

    if (config.outputFormat === 'json') {
      console.log(JSON.stringify(queues, null, 2));
    } else {
      console.log(chalk.bold('Active Queues:'));
      queues.forEach((queue: { name: string; task_count: number }) => {
        console.log(`  ${chalk.cyan(queue.name)} (${queue.task_count} tasks)`);
      });
    }
  });
```

**Queue Statistics** (new):
```typescript
queue
  .command('stats <queue-name>')
  .description('Get statistics for a queue')
  .action(async (queueName: string, options, command) => {
    const config = await loadConfig({
      url: command.optsWithGlobals().url,
      outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
    });

    const client = await ensureConnected(config.url);
    const stats = await client.getQueueStats(queueName);

    const formatter = createFormatter(
      config.outputFormat === 'json' ? 'json' : 'stats',
      { color: config.colorOutput, verbose: false }
    );

    console.log(formatter.format(stats));
  });
```

**Queue Tasks** (new):
```typescript
queue
  .command('tasks <queue-name>')
  .description('Get all tasks in a queue')
  .option('-a, --assigned-to <agent>', 'Filter by assignee')
  .option('-s, --status <status>', 'Filter by status')
  .option('--exclude-subtasks', 'Exclude subtasks from results')
  .option('--include-archived', 'Include archived tasks')
  .option('--limit <number>', 'Maximum results', parseInt)
  .option('--offset <number>', 'Pagination offset', parseInt)
  .action(async (queueName: string, options, command) => {
    const config = await loadConfig({
      url: command.optsWithGlobals().url,
      outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
    });

    const client = await ensureConnected(config.url);
    const tasks = await client.getQueueTasks({
      queue_name: queueName,
      assigned_to: options.assignedTo,
      status: options.status,
      exclude_subtasks: options.excludeSubtasks,
      include_archived: options.includeArchived,
      limit: options.limit,
      offset: options.offset,
    });

    const formatter = createFormatter(config.outputFormat, {
      color: config.colorOutput,
      verbose: false,
    });

    console.log(formatter.format(tasks));
  });
```

**Add to Queue, Remove from Queue, Move Queue, Clear Queue**:
```typescript
queue
  .command('add <task-id> <queue-name>')
  .description('Add a task to a queue')
  .action(async (taskId: string, queueName: string, options, command) => {
    const task_id = parseInt(taskId, 10);
    if (isNaN(task_id)) {
      console.error(chalk.red('Error: Task ID must be a number'));
      process.exit(1);
    }

    const config = await loadConfig({ url: command.optsWithGlobals().url });
    const client = await ensureConnected(config.url);
    
    await client.addTaskToQueue(task_id, queueName);
    console.log(chalk.green(`✓ Task #${task_id} added to queue '${queueName}'`));
  });

queue
  .command('remove <task-id>')
  .description('Remove a task from its queue')
  .action(async (taskId: string, options, command) => {
    const task_id = parseInt(taskId, 10);
    if (isNaN(task_id)) {
      console.error(chalk.red('Error: Task ID must be a number'));
      process.exit(1);
    }

    const config = await loadConfig({ url: command.optsWithGlobals().url });
    const client = await ensureConnected(config.url);
    
    await client.removeTaskFromQueue(task_id);
    console.log(chalk.green(`✓ Task #${task_id} removed from queue`));
  });

queue
  .command('move <task-id> <new-queue>')
  .description('Move a task to a different queue')
  .action(async (taskId: string, newQueue: string, options, command) => {
    const task_id = parseInt(taskId, 10);
    if (isNaN(task_id)) {
      console.error(chalk.red('Error: Task ID must be a number'));
      process.exit(1);
    }

    const config = await loadConfig({ url: command.optsWithGlobals().url });
    const client = await ensureConnected(config.url);
    
    await client.moveTaskToQueue(task_id, newQueue);
    console.log(chalk.green(`✓ Task #${task_id} moved to queue '${newQueue}'`));
  });

queue
  .command('clear <queue-name>')
  .description('Remove all tasks from a queue')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (queueName: string, options, command) => {
    if (!options.yes) {
      // Prompt for confirmation
      console.log(chalk.yellow(`Warning: This will remove all tasks from queue '${queueName}'`));
      console.log(chalk.gray('Use --yes to skip this confirmation'));
      process.exit(1);
    }

    const config = await loadConfig({ url: command.optsWithGlobals().url });
    const client = await ensureConnected(config.url);
    
    await client.clearQueue(queueName);
    console.log(chalk.green(`✓ Queue '${queueName}' cleared`));
  });
```

**Acceptance Criteria**:
- ✅ Eight queue subcommands implemented
- ✅ Backwards compatibility maintained (`tinytask queue <agent>`)
- ✅ All filters and options working
- ✅ Confirmation prompts for destructive operations
- ✅ Helpful error messages
- ✅ Success confirmations

---

### Task 4: Enhanced Task Commands

**Files**: `task/create.ts`, `task/update.ts`, `task/list.ts`

**Effort**: 2-3 hours

#### 4.1 Enhanced Create

```typescript
// Add options
.option('--parent <id>', 'Parent task ID (creates subtask)', parseInt)
.option('--queue <name>', 'Queue name (dev, product, qa, etc.)')

// In action:
const task = await client.createTask({
  title,
  description: options.description,
  assigned_to: options.assignedTo || config.defaultAgent,
  created_by: options.createdBy,
  priority: options.priority,
  status: options.status,
  tags,
  parent_task_id: options.parent,  // NEW
  queue_name: options.queue,        // NEW
});
```

#### 4.2 Enhanced Update

```typescript
// Add options
.option('--parent <id>', 'New parent task ID', parseInt)
.option('--queue <name>', 'New queue name')

// In action:
const updates = {
  id,
  title: options.title,
  description: options.description,
  status: options.status,
  assigned_to: options.assignedTo,
  priority: options.priority,
  tags,
  parent_task_id: options.parent,   // NEW
  queue_name: options.queue,         // NEW
};
```

#### 4.3 Enhanced List

```typescript
// Add options
.option('--queue <name>', 'Filter by queue name')
.option('--parent <id>', 'Filter by parent task ID', parseInt)
.option('--exclude-subtasks', 'Only show top-level tasks')

// In action:
const tasks = await client.listTasks({
  assigned_to: options.assignedTo,
  status: options.status,
  include_archived: options.includeArchived,
  limit: options.limit,
  offset: options.offset,
  queue_name: options.queue,             // NEW
  parent_task_id: options.parent,        // NEW
  exclude_subtasks: options.excludeSubtasks, // NEW
});
```

**Acceptance Criteria**:
- ✅ New options added to all three commands
- ✅ Options passed to client methods
- ✅ Backwards compatibility maintained
- ✅ Help text updated

---

### Task 5: Formatter Enhancements

**Files**: `formatters/table.ts`, `formatters/tree.ts` (new), `formatters/stats.ts` (new)

**Effort**: 3-4 hours

#### 5.1 Enhanced Table Formatter

```typescript
// Detect if queue/parent columns needed
const hasQueue = Array.isArray(data) && data.some((item) => item.queue_name);
const hasParent = Array.isArray(data) && data.some((item) => item.parent_task_id);

// Build column list dynamically
const columns = [
  { key: 'id', label: 'ID', width: 5 },
  { key: 'title', label: 'Title', width: 30 },
  ...(hasQueue ? [{ key: 'queue_name', label: 'Queue', width: 10 }] : []),
  ...(hasParent ? [{ key: 'parent_task_id', label: 'Parent', width: 8 }] : []),
  { key: 'assigned_to', label: 'Assigned', width: 12 },
  { key: 'status', label: 'Status', width: 10 },
  { key: 'priority', label: 'Priority', width: 8 },
];

// Render with conditional columns
```

#### 5.2 Tree Formatter (New)

```typescript
export function formatTree(data: unknown, options: FormatterOptions): string {
  const task = data as TaskWithSubtasks;
  return formatTaskTree(task, '', true, options.color);
}

function formatTaskTree(
  task: TaskWithSubtasks, 
  indent: string, 
  isLast: boolean,
  useColor: boolean
): string {
  const prefix = isLast ? '└── ' : '├── ';
  const childIndent = indent + (isLast ? '    ' : '│   ');
  
  const statusColor = getStatusColor(task.status);
  const status = useColor ? chalk[statusColor](task.status) : task.status;
  const assignee = task.assigned_to || 'unassigned';
  const queue = task.queue_name ? `[${task.queue_name}]` : '';
  
  let output = `${indent}${prefix}Task #${task.id}: ${task.title} ${queue} (${assignee}) ${status}\n`;
  
  if (task.subtasks && task.subtasks.length > 0) {
    task.subtasks.forEach((subtask, index) => {
      const isLastChild = index === task.subtasks!.length - 1;
      output += formatTaskTree(subtask, childIndent, isLastChild, useColor);
    });
  }
  
  return output;
}
```

#### 5.3 Stats Formatter (New)

```typescript
export function formatStats(data: unknown, options: FormatterOptions): string {
  const stats = data as QueueStats;
  
  if (options.format === 'json') {
    return JSON.stringify(stats, null, 2);
  }
  
  const title = options.color 
    ? chalk.bold.cyan(`Queue: ${stats.queue_name}`) 
    : `Queue: ${stats.queue_name}`;
  
  const lines = [
    title,
    '─'.repeat(50),
    `Total Tasks:     ${stats.total}`,
    `  Idle:          ${colorize(stats.by_status.idle, 'yellow', options.color)}`,
    `  Working:       ${colorize(stats.by_status.working, 'blue', options.color)}`,
    `  Complete:      ${colorize(stats.by_status.complete, 'green', options.color)}`,
    '',
    'Assignment:',
    `  Assigned:      ${stats.assigned}`,
    `  Unassigned:    ${stats.unassigned}`,
    '',
    `Agents:          ${stats.agents.join(', ')}`,
  ];
  
  return lines.join('\n');
}
```

**Acceptance Criteria**:
- ✅ Table formatter handles queue/parent columns
- ✅ Tree formatter displays hierarchies correctly
- ✅ Stats formatter shows formatted statistics
- ✅ Color support in all formatters
- ✅ JSON output option for all formatters

---

### Task 6: CLI Registration

**File**: `tinytask-cli/src/cli.ts`

**Effort**: 30 minutes

```typescript
import { createSubtaskCommands } from './commands/subtask.js';  // NEW

// ...

// Task commands (existing)
createTaskCommands(program);

// Subtask commands (NEW)
createSubtaskCommands(program);

// Queue commands (ENHANCED)
createQueueCommands(program);

// Other commands...
```

**Acceptance Criteria**:
- ✅ Subtask commands registered
- ✅ All commands accessible via CLI
- ✅ Help text displays correctly

---

### Task 7: Testing

**Files**: Tests in `tests/`

**Effort**: 3-4 hours

#### 7.1 Client Tests

```typescript
// tests/unit/client/mcp-client.test.ts
describe('Subtask Methods', () => {
  it('should create subtask');
  it('should get subtasks');
  it('should get task with subtasks');
  it('should move subtask');
});

describe('Queue Methods', () => {
  it('should list queues');
  it('should get queue stats');
  it('should add task to queue');
  it('should remove task from queue');
  it('should move task between queues');
  it('should get queue tasks');
  it('should clear queue');
});
```

#### 7.2 Formatter Tests

```typescript
// tests/unit/formatters/tree.test.ts
describe('Tree Formatter', () => {
  it('should format single task');
  it('should format task with children');
  it('should format deeply nested tree');
  it('should handle color option');
});

// tests/unit/formatters/stats.test.ts
describe('Stats Formatter', () => {
  it('should format queue statistics');
  it('should handle JSON output');
  it('should handle color option');
});
```

**Acceptance Criteria**:
- ✅ All new client methods tested
- ✅ All formatters tested
- ✅ Edge cases covered
- ✅ Tests passing

---

### Task 8: Documentation

**Files**: `tinytask-cli/README.md`

**Effort**: 2-3 hours

Update README with:
- Subtask command examples
- Queue management examples
- New workflow scenarios
- Updated command reference

**Example Additions**:

```markdown
### Subtask Commands

#### Create Subtask
\`\`\`bash
tinytask subtask create 5 "Design schema" -a alice
tinytask st create 5 "Write tests" -d "Unit tests" -p 3
\`\`\`

#### List Subtasks
\`\`\`bash
tinytask subtask list 5
tinytask subtask list 5 --recursive
\`\`\`

#### View Task Tree
\`\`\`bash
tinytask subtask tree 5
tinytask st tree 5 --recursive
\`\`\`

### Queue Management

#### List Queues
\`\`\`bash
tinytask queue list
\`\`\`

#### Queue Statistics
\`\`\`bash
tinytask queue stats dev
\`\`\`

#### View Queue Tasks
\`\`\`bash
tinytask queue tasks dev
tinytask queue tasks qa --status idle
\`\`\`

### Workflows

#### Create Task Hierarchy
\`\`\`bash
# Create epic
tinytask task create "User Auth" --queue dev -a alice

# Create subtasks
tinytask subtask create 1 "Design schema" -a bob
tinytask subtask create 1 "Implement API" -a alice
tinytask subtask create 1 "Write tests" -a charlie

# View hierarchy
tinytask subtask tree 1
\`\`\`

#### Sprint Planning
\`\`\`bash
# See all dev tasks
tinytask queue tasks dev

# Check stats
tinytask queue stats dev

# Assign work
tinytask task update 5 --assigned-to alice
\`\`\`
```

**Acceptance Criteria**:
- ✅ All new commands documented
- ✅ Examples provided
- ✅ Workflows illustrated
- ✅ Help text comprehensive

---

## Acceptance Criteria (Overall)

### Functionality
- ✅ All 11 new MCP tools accessible via CLI
- ✅ All enhanced parameters supported
- ✅ Backwards compatibility maintained
- ✅ Help text comprehensive and accurate

### Code Quality
- ✅ TypeScript compilation succeeds
- ✅ ESLint passes with no warnings
- ✅ All tests pass
- ✅ Code coverage >90%

### User Experience
- ✅ Commands are intuitive and discoverable
- ✅ Error messages are helpful
- ✅ Success confirmations provided
- ✅ Output is well-formatted

### Documentation
- ✅ README updated with examples
- ✅ All commands have help text
- ✅ Workflows documented
- ✅ Migration guide provided

## Testing Strategy

### Manual Testing Checklist

```bash
# Subtasks
✅ Create subtask
✅ List subtasks (shallow)
✅ List subtasks (recursive)
✅ View task tree
✅ Move subtask to new parent
✅ Move subtask to top-level

# Queues
✅ List all queues
✅ Get queue statistics
✅ View queue tasks
✅ Add task to queue
✅ Remove task from queue
✅ Move task between queues
✅ Clear queue

# Enhanced task commands
✅ Create task with queue
✅ Create task with parent
✅ Update task queue
✅ Update task parent
✅ List tasks filtered by queue
✅ List tasks filtered by parent
✅ List tasks excluding subtasks

# Backwards compatibility
✅ tinytask queue <agent>
✅ tinytask task create <title>
✅ tinytask task list
✅ All existing workflows
```

### Integration Testing

Run against live MCP server:
1. Create task hierarchy (parent + 3 subtasks)
2. Organize tasks into multiple queues
3. Move tasks between queues
4. View statistics for each queue
5. Filter and search by various criteria

## Deployment Notes

### Version Requirements
- MCP Server: v2.0.0+ (with subtasks and queues)
- Node.js: 18+
- NPM: 8+

### Migration from v1.x
No migration needed - all existing commands work unchanged.

### Breaking Changes
None - fully backwards compatible.

## Future Enhancements

Potential additions not in current scope:
- Interactive subtask creation
- Bulk queue operations
- Queue templates
- Progress tracking for hierarchies
- Watch mode for queues
- Export/import capabilities

## Related Documentation

- [Subtasks and Queues Overview](../subtasks-and-queues/README.md)
- [CLI Architecture](../../technical/tinytask-cli-subtasks-queues-architecture.md)
- [MCP Implementation](../../technical/subtasks-and-queues-implementation-plan.md)

## Story Summary

**Estimated Total Effort**: 20-26 hours

**Key Deliverables**:
- Enhanced MCP client (~160 lines added)
- New subtask commands (~250 lines)
- Enhanced queue commands (~290 lines added)
- Enhanced task commands (~35 lines added)
- New formatters (~180 lines)
- Comprehensive tests
- Updated documentation

**Success Criteria**: All new MCP server features accessible via intuitive CLI commands with full backwards compatibility.
