# TinyTask CLI - Subtasks and Queues Architecture

## Overview

This document details the technical architecture for updating the TinyTask CLI to support subtasks and queue management features introduced in the MCP server.

## Architecture Principles

### 1. Maintain Existing Patterns
- Follow existing command structure and patterns
- Use established client wrapper pattern
- Leverage existing formatter infrastructure
- Maintain backwards compatibility

### 2. User Experience Focus
- Intuitive command structure
- Consistent option naming
- Clear help text and examples
- Graceful error handling

### 3. Code Organization
- Single responsibility per file
- Reusable components
- Type-safe interfaces
- Comprehensive testing

## Component Architecture

### Layer 1: MCP Client (`src/client/mcp-client.ts`)

**Purpose**: Wrapper around MCP SDK client providing type-safe methods

**Current State**:
- Handles connection lifecycle
- Wraps MCP tool calls
- Parses and validates responses
- ~290 lines

**Required Changes**:
1. **Type Definition Updates**
   - Extend `CreateTaskParams` with `parent_task_id`, `queue_name`
   - Extend `UpdateTaskParams` with `parent_task_id`, `queue_name`
   - Extend `TaskFilters` with `queue_name`, `parent_task_id`, `exclude_subtasks`
   - Add `CreateSubtaskParams` interface
   - Add `GetSubtasksParams` interface
   - Add `QueueFilters` interface

2. **New Methods - Subtasks** (4 methods)
   - `createSubtask(params: CreateSubtaskParams): Promise<unknown>`
   - `getSubtasks(params: GetSubtasksParams): Promise<unknown>`
   - `getTaskWithSubtasks(taskId: number, recursive?: boolean): Promise<unknown>`
   - `moveSubtask(subtaskId: number, newParentId?: number): Promise<unknown>`

3. **New Methods - Queues** (7 methods)
   - `listQueues(): Promise<unknown>`
   - `getQueueStats(queueName: string): Promise<unknown>`
   - `addTaskToQueue(taskId: number, queueName: string): Promise<unknown>`
   - `removeTaskFromQueue(taskId: number): Promise<unknown>`
   - `moveTaskToQueue(taskId: number, newQueueName: string): Promise<unknown>`
   - `getQueueTasks(filters: QueueFilters): Promise<unknown>`
   - `clearQueue(queueName: string): Promise<void>`

**Estimated Size**: ~450 lines (+160 lines)

### Layer 2: Commands

#### 2.1 New: Subtask Commands (`src/commands/subtask.ts`)

**Structure**:
```typescript
export function createSubtaskCommands(program: Command): void {
  const subtask = program
    .command('subtask')
    .alias('st')
    .description('Manage task hierarchies and subtasks');

  // Create subtask
  subtask
    .command('create <parent-id> <title>')
    .description('Create a new subtask')
    .option('-d, --description <text>', 'Subtask description')
    .option('-a, --assigned-to <agent>', 'Assign to agent')
    .option('-p, --priority <number>', 'Priority', parseInt)
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-q, --queue <name>', 'Override queue from parent')
    .action(createSubtaskAction);

  // List subtasks
  subtask
    .command('list <parent-id>')
    .alias('ls')
    .description('List subtasks for a parent task')
    .option('-r, --recursive', 'Include nested subtasks')
    .option('--include-archived', 'Include archived subtasks')
    .action(listSubtasksAction);

  // Tree view
  subtask
    .command('tree <task-id>')
    .description('Show task hierarchy as tree')
    .option('-r, --recursive', 'Show full tree')
    .action(treeViewAction);

  // Move subtask
  subtask
    .command('move <subtask-id> [new-parent-id]')
    .description('Move subtask to different parent or make top-level')
    .action(moveSubtaskAction);
}
```

**Action Handlers**:
- `createSubtaskAction`: Parse options, call `client.createSubtask()`, format output
- `listSubtasksAction`: Call `client.getSubtasks()`, format as table/json
- `treeViewAction`: Call `client.getTaskWithSubtasks()`, format as tree
- `moveSubtaskAction`: Call `client.moveSubtask()`, confirm success

**Estimated Size**: ~250 lines

#### 2.2 Enhanced: Queue Commands (`src/commands/queue.ts`)

**Current**: Single command for viewing agent's queue (~60 lines)

**New Structure**:
```typescript
export function createQueueCommands(program: Command): void {
  const queue = program
    .command('queue')
    .alias('q')
    .description('Manage task queues');

  // EXISTING: View agent's queue
  queue
    .command('view [agent]')
    .description('View task queue for an agent')
    .option('--mine', 'View my queue')
    .option('-s, --status <status>', 'Filter by status')
    .action(viewAgentQueueAction);

  // Make 'view' the default subcommand
  // So 'tinytask queue alice' still works
  queue.action((agent: string | undefined, options, command) => {
    // If agent provided without subcommand, route to view
    if (agent && !command.args.length) {
      viewAgentQueueAction(agent, options, command);
    }
  });

  // NEW: List all queues
  queue
    .command('list')
    .alias('ls')
    .description('List all queue names')
    .action(listQueuesAction);

  // NEW: Queue statistics
  queue
    .command('stats <queue-name>')
    .description('Get statistics for a queue')
    .action(queueStatsAction);

  // NEW: Queue tasks
  queue
    .command('tasks <queue-name>')
    .description('Get all tasks in a queue')
    .option('-a, --assigned-to <agent>', 'Filter by assignee')
    .option('-s, --status <status>', 'Filter by status')
    .option('--exclude-subtasks', 'Exclude subtasks')
    .option('--include-archived', 'Include archived tasks')
    .option('--limit <number>', 'Max results', parseInt)
    .option('--offset <number>', 'Pagination offset', parseInt)
    .action(queueTasksAction);

  // NEW: Add task to queue
  queue
    .command('add <task-id> <queue-name>')
    .description('Add task to a queue')
    .action(addToQueueAction);

  // NEW: Remove task from queue
  queue
    .command('remove <task-id>')
    .description('Remove task from its queue')
    .action(removeFromQueueAction);

  // NEW: Move task between queues
  queue
    .command('move <task-id> <new-queue>')
    .description('Move task to different queue')
    .action(moveQueueAction);

  // NEW: Clear queue
  queue
    .command('clear <queue-name>')
    .description('Remove all tasks from queue')
    .option('-y, --yes', 'Skip confirmation')
    .action(clearQueueAction);
}
```

**Action Handlers**:
- `viewAgentQueueAction`: Existing logic (keep)
- `listQueuesAction`: Call `client.listQueues()`, format output
- `queueStatsAction`: Call `client.getQueueStats()`, format stats
- `queueTasksAction`: Call `client.getQueueTasks()`, format as table
- `addToQueueAction`: Call `client.addTaskToQueue()`, confirm
- `removeFromQueueAction`: Call `client.removeTaskFromQueue()`, confirm
- `moveQueueAction`: Call `client.moveTaskToQueue()`, confirm
- `clearQueueAction`: Prompt confirmation, call `client.clearQueue()`

**Estimated Size**: ~350 lines (+290 lines)

**Backwards Compatibility Strategy**:
```bash
# These all work (existing behavior):
tinytask queue alice
tinytask queue --mine
tinytask q alice

# New subcommand style:
tinytask queue view alice
tinytask queue list
tinytask queue stats dev
```

#### 2.3 Enhanced: Task Commands

**File**: `src/commands/task/create.ts`

**Changes**:
```typescript
// Add options
.option('--parent <id>', 'Parent task ID (creates subtask)', parseInt)
.option('--queue <name>', 'Queue name')

// In action handler:
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

**Estimated Change**: +10 lines

**File**: `src/commands/task/update.ts`

**Changes**:
```typescript
// Add options
.option('--parent <id>', 'New parent task ID', parseInt)
.option('--queue <name>', 'New queue name')

// In action handler:
const updates: UpdateTaskParams = {
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

**Estimated Change**: +10 lines

**File**: `src/commands/task/list.ts`

**Changes**:
```typescript
// Add options
.option('--queue <name>', 'Filter by queue name')
.option('--parent <id>', 'Filter by parent task ID', parseInt)
.option('--exclude-subtasks', 'Exclude subtasks from results')

// In action handler:
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

**Estimated Change**: +15 lines

### Layer 3: Formatters

#### 3.1 Enhanced: Table Formatter (`src/formatters/table.ts`)

**Current**: Displays standard task fields in table

**Changes**:
1. Add `queue_name` column (conditionally)
2. Add `parent_task_id` column (conditionally)
3. Auto-detect when these fields are present
4. Adjust column widths dynamically

**Logic**:
```typescript
// Detect if queue or parent columns needed
const hasQueue = Array.isArray(data) && data.some((item) => item.queue_name);
const hasParent = Array.isArray(data) && data.some((item) => item.parent_task_id);

// Define columns based on data
const columns = [
  'id',
  'title',
  ...(hasQueue ? ['queue_name'] : []),
  ...(hasParent ? ['parent_task_id'] : []),
  'assigned_to',
  'status',
  'priority',
];
```

**Estimated Change**: +30 lines

#### 3.2 New: Tree Formatter (`src/formatters/tree.ts`)

**Purpose**: Display hierarchical task relationships

**Algorithm**:
```typescript
function formatTree(task: TaskWithSubtasks, indent = '', isLast = true): string {
  const prefix = isLast ? '└── ' : '├── ';
  const childIndent = indent + (isLast ? '    ' : '│   ');
  
  let output = indent + prefix + formatTaskLine(task) + '\n';
  
  if (task.subtasks && task.subtasks.length > 0) {
    task.subtasks.forEach((subtask, index) => {
      const isLastChild = index === task.subtasks.length - 1;
      output += formatTree(subtask, childIndent, isLastChild);
    });
  }
  
  return output;
}

function formatTaskLine(task: TaskWithSubtasks): string {
  const status = colorizeStatus(task.status);
  const assignee = task.assigned_to || 'unassigned';
  const queue = task.queue_name ? `[${task.queue_name}]` : '';
  
  return `Task #${task.id}: ${task.title} ${queue} (${assignee}) ${status}`;
}
```

**Example Output**:
```
Task #1: User Authentication [dev] (alice) working
├── Task #2: Design schema [dev] (bob) idle
│   └── Task #5: Create ERD [dev] (alice) idle
├── Task #3: Implement API [dev] (alice) working
└── Task #4: Write tests [qa] (charlie) idle
```

**Estimated Size**: ~100 lines

#### 3.3 New: Stats Formatter (`src/formatters/stats.ts`)

**Purpose**: Format queue statistics

**Structure**:
```typescript
export function formatQueueStats(stats: QueueStats, options: FormatterOptions): string {
  if (options.format === 'json') {
    return JSON.stringify(stats, null, 2);
  }
  
  const { color } = options;
  const title = color ? chalk.bold.cyan(`Queue: ${stats.queue_name}`) : `Queue: ${stats.queue_name}`;
  
  return `
${title}
${'─'.repeat(50)}
Total Tasks:     ${stats.total}
  Idle:          ${colorize(stats.by_status.idle, 'yellow', color)}
  Working:       ${colorize(stats.by_status.working, 'blue', color)}
  Complete:      ${colorize(stats.by_status.complete, 'green', color)}

Assignment:
  Assigned:      ${stats.assigned}
  Unassigned:    ${stats.unassigned}

Agents:          ${stats.agents.join(', ')}
  `.trim();
}
```

**Estimated Size**: ~80 lines

### Layer 4: CLI Registration (`src/cli.ts`)

**Changes**:
```typescript
import { createSubtaskCommands } from './commands/subtask.js';  // NEW
import { createQueueCommands } from './commands/queue.js';      // UPDATED

// ...

// Task commands (existing)
createTaskCommands(program);

// Subtask commands (NEW)
createSubtaskCommands(program);

// Queue commands (ENHANCED - now full command group)
createQueueCommands(program);

// Other workflow commands
createSignupCommand(program);
createMoveCommand(program);
```

**Estimated Change**: +5 lines

## Data Flow

### Example: Create Subtask

```
CLI Input: tinytask subtask create 5 "Design schema" -a alice

↓ Parse arguments and options

Command Handler (subtask.ts)
├── Load config
├── Ensure MCP connection
└── Call client.createSubtask({
      parent_task_id: 5,
      title: "Design schema",
      assigned_to: "alice"
    })

↓ MCP call

MCP Client (mcp-client.ts)
├── Validate connection
├── Call client.callTool('create_subtask', params)
└── Parse response

↓ Format result

Formatter (table.ts or json.ts)
└── Format task object for display

↓ Output

Console: Display formatted task
```

### Example: Queue Statistics

```
CLI Input: tinytask queue stats dev

↓ Parse arguments

Command Handler (queue.ts - queueStatsAction)
├── Load config
├── Ensure MCP connection
└── Call client.getQueueStats('dev')

↓ MCP call

MCP Client (mcp-client.ts)
├── Validate connection
├── Call client.callTool('get_queue_stats', { queue_name: 'dev' })
└── Parse response

↓ Format stats

Stats Formatter (stats.ts)
└── Format statistics with labels and colors

↓ Output

Console: Display formatted statistics
```

## Error Handling

### Connection Errors
```typescript
try {
  await client.connect();
} catch (error) {
  console.error(chalk.red('Connection Error:'));
  console.error(chalk.gray(`  Unable to connect to ${config.url}`));
  console.error(chalk.gray(`  ${error.message}`));
  console.error(chalk.yellow('\nTips:'));
  console.error(chalk.gray('  - Check if server is running'));
  console.error(chalk.gray('  - Verify URL in config: tinytask config get url'));
  process.exit(1);
}
```

### Validation Errors
```typescript
if (!parent_task_id) {
  console.error(chalk.red('Error: Parent task ID is required'));
  console.error(chalk.gray('Usage: tinytask subtask create <parent-id> <title>'));
  process.exit(1);
}

if (isNaN(parent_task_id)) {
  console.error(chalk.red('Error: Parent task ID must be a number'));
  process.exit(1);
}
```

### Server Errors
```typescript
try {
  const result = await client.createSubtask(params);
  // ...
} catch (error) {
  if (error.message.includes('Parent task not found')) {
    console.error(chalk.red(`Error: Parent task #${params.parent_task_id} not found`));
    console.error(chalk.gray('Hint: Use "tinytask task get <id>" to verify task exists'));
  } else if (error.message.includes('circular reference')) {
    console.error(chalk.red('Error: Cannot create circular task hierarchy'));
    console.error(chalk.gray('A task cannot be its own ancestor'));
  } else {
    console.error(chalk.red('Error:'), error.message);
  }
  process.exit(1);
}
```

## Testing Strategy

### Unit Tests

**Test File**: `tests/unit/client/mcp-client.test.ts`

New test suites:
```typescript
describe('TinyTaskClient - Subtasks', () => {
  it('should create subtask with correct parameters');
  it('should get subtasks for parent');
  it('should get task with subtasks recursively');
  it('should move subtask to new parent');
});

describe('TinyTaskClient - Queues', () => {
  it('should list all queues');
  it('should get queue statistics');
  it('should add task to queue');
  it('should remove task from queue');
  it('should move task between queues');
  it('should get queue tasks with filters');
  it('should clear queue');
});
```

### Integration Tests

**Test File**: `tests/integration/subtasks-and-queues.test.ts`

Test scenarios:
- Create task hierarchy (parent + multiple subtasks)
- List subtasks and verify filtering
- Move subtask and verify parent change
- Create tasks in different queues
- Get queue statistics and verify counts
- Move tasks between queues
- Filter queue tasks by various criteria

### Command Tests

**Test File**: `tests/commands/subtask.test.ts`, `tests/commands/queue.test.ts`

Test command parsing and validation:
- Argument parsing
- Option handling
- Error messages
- Help text display

## File Size Estimates

| File | Current | New | Change |
|------|---------|-----|--------|
| `mcp-client.ts` | 293 | 450 | +160 |
| `queue.ts` | 60 | 350 | +290 |
| `subtask.ts` | 0 | 250 | +250 |
| `task/create.ts` | 66 | 76 | +10 |
| `task/update.ts` | 75 | 85 | +10 |
| `task/list.ts` | 80 | 95 | +15 |
| `table.ts` | 120 | 150 | +30 |
| `tree.ts` | 0 | 100 | +100 |
| `stats.ts` | 0 | 80 | +80 |
| `cli.ts` | 51 | 56 | +5 |
| **Total** | ~745 | ~1,692 | **+947** |

Plus test files: ~500-700 lines

## Dependencies

### Existing (No Changes)
- `commander` - CLI framework
- `chalk` - Terminal colors
- `@modelcontextprotocol/sdk` - MCP client
- `cosmiconfig` - Configuration loading
- `zod` - Runtime validation

### No New Dependencies Required
All features can be implemented with existing dependencies.

## Backwards Compatibility

### Command Compatibility Matrix

| Command | Before | After | Compatible |
|---------|--------|-------|------------|
| `tinytask queue alice` | Works | Works | ✅ Yes |
| `tinytask q alice` | Works | Works | ✅ Yes |
| `tinytask queue --mine` | Works | Works | ✅ Yes |
| `tinytask task create "X"` | Works | Works | ✅ Yes |
| `tinytask task list` | Works | Works | ✅ Yes |
| All other commands | Works | Works | ✅ Yes |

### Output Compatibility

- Table formatter gracefully handles missing queue/parent fields
- JSON formatter outputs all fields (backward compatible)
- CSV formatter includes new columns only when data present
- Compact formatter shows queue/parent when available

## Deployment Considerations

### Version Compatibility
- CLI v2.x requires MCP server v2.x (with subtasks/queues)
- CLI v2.x works with server v1.x (features gracefully unavailable)
- CLI v1.x works with server v2.x (doesn't use new features)

### Migration Path
1. Deploy MCP server v2.x
2. Update CLI to v2.x
3. Existing scripts/commands continue to work
4. New features available immediately

### Configuration Changes
No configuration changes required. All new features are accessed via new commands or new options.

## Performance Considerations

### Client-Side
- No significant performance impact
- Tree formatter handles up to ~1000 tasks efficiently
- Recursive queries may be slower for deep hierarchies (server-side)

### Caching
- Consider caching queue list (changes infrequently)
- Could cache task hierarchies for tree display
- Not implemented in initial version (YAGNI)

## Security Considerations

### Input Validation
- All numeric IDs validated (parseInt with NaN check)
- Queue names validated (no special characters)
- Task titles validated (length limits)
- Command injection prevented by MCP client layer

### Authorization
- No CLI-side authorization (handled by MCP server)
- CLI passes agent name from config/options
- Server enforces permissions

## Documentation Updates

### README.md Updates
- Add subtask command examples
- Add queue management examples
- Update workflow examples
- Add tree view examples

### Help Text
- Comprehensive help for each command
- Examples in help text
- Clear option descriptions
- Error message improvements

## Future Enhancements

### Potential Additions (Not in Current Scope)
1. **Interactive Mode**: `tinytask subtask create --interactive`
2. **Bulk Operations**: `tinytask queue move --all <source> <dest>`
3. **Queue Templates**: Predefined queue configurations
4. **Progress Indicators**: Show completion % for task hierarchies
5. **Export/Import**: Export queue data to files
6. **Watch Mode**: Real-time queue monitoring
7. **Filters DSL**: Advanced filtering syntax

### Technical Debt
- Consider switching to TypeScript strict mode
- Add more comprehensive error types
- Consider command middleware pattern
- Implement command-level testing framework

## Success Metrics

### Code Quality
- ✅ All TypeScript compilation passes
- ✅ All ESLint checks pass
- ✅ All tests pass with >90% coverage
- ✅ No console warnings or errors

### Functionality
- ✅ All 11 new MCP tools accessible
- ✅ All enhanced parameters supported
- ✅ Backwards compatibility maintained
- ✅ Help text comprehensive

### User Experience
- ✅ Commands are intuitive
- ✅ Error messages are helpful
- ✅ Output is readable and informative
- ✅ Examples in documentation work

## Implementation Order

1. **MCP Client Types and Methods** (Foundation)
2. **Enhanced Task Commands** (Build on existing)
3. **Subtask Commands** (New feature)
4. **Queue Commands** (Complex refactor)
5. **Formatters** (Display layer)
6. **Testing** (Validation)
7. **Documentation** (User-facing)

This order minimizes rework and allows testing at each stage.
