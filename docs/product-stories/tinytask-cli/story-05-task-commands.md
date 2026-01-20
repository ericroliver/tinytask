# Story 5: TinyTask CLI - Task Commands

## Overview
Implement all task-related commands (create, get, update, delete, list, archive) with proper argument parsing and output formatting.

## User Story
As a CLI user, I want to manage tasks from the command line so that I can create, view, update, and delete tasks without using a full MCP client.

## Acceptance Criteria
- [ ] `tinytask task create` command works with all options
- [ ] `tinytask task get <id>` displays task details
- [ ] `tinytask task update <id>` updates task fields
- [ ] `tinytask task delete <id>` deletes task
- [ ] `tinytask task list` lists tasks with filters
- [ ] `tinytask task archive <id>` archives task
- [ ] Convenience aliases work (tinytask create, tinytask ls)
- [ ] All output formats work (table, JSON, CSV, compact)
- [ ] Error handling for invalid inputs
- [ ] Integration tests pass

## Technical Details

### Task Create Command
```typescript
// src/commands/task/create.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskCreateCommand(program: Command): void {
  program
    .command('create <title>')
    .description('Create a new task')
    .option('-d, --description <text>', 'Task description')
    .option('-a, --assigned-to <agent>', 'Assign to agent')
    .option('-c, --created-by <agent>', 'Created by agent')
    .option('-p, --priority <number>', 'Priority (default: 0)', parseInt)
    .option('-s, --status <status>', 'Status (idle, working, complete)', 'idle')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .action(async (title: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        
        // Parse tags if provided
        const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined;
        
        // Create task
        const task = await client.createTask({
          title,
          description: options.description,
          assigned_to: options.assignedTo || config.defaultAgent,
          created_by: options.createdBy,
          priority: options.priority,
          status: options.status,
          tags,
        });
        
        // Format output
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: false }
        );
        
        console.log(formatter.format(task));
        
        if (config.outputFormat === 'table') {
          console.log(chalk.green(`✓ Task #${task.id} created`));
        }
      } catch (error) {
        console.error(chalk.red('Error creating task:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Task Get Command
```typescript
// src/commands/task/get.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskGetCommand(program: Command): void {
  program
    .command('get <id>')
    .description('Get task by ID')
    .action(async (id: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        const task = await client.getTask(parseInt(id));
        
        if (!task) {
          console.error(chalk.red(`Task #${id} not found`));
          process.exit(1);
        }
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: true }
        );
        
        console.log(formatter.format(task));
      } catch (error) {
        console.error(chalk.red('Error getting task:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Task Update Command
```typescript
// src/commands/task/update.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskUpdateCommand(program: Command): void {
  program
    .command('update <id>')
    .description('Update a task')
    .option('-t, --title <text>', 'Update title')
    .option('-d, --description <text>', 'Update description')
    .option('-s, --status <status>', 'Update status (idle, working, complete)')
    .option('-a, --assigned-to <agent>', 'Update assignee')
    .option('-p, --priority <number>', 'Update priority', parseInt)
    .option('--tags <tags>', 'Update tags (comma-separated)')
    .action(async (id: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        
        // Build update params
        const updates: any = { id: parseInt(id) };
        
        if (options.title) updates.title = options.title;
        if (options.description) updates.description = options.description;
        if (options.status) updates.status = options.status;
        if (options.assignedTo) updates.assigned_to = options.assignedTo;
        if (options.priority !== undefined) updates.priority = options.priority;
        if (options.tags) updates.tags = options.tags.split(',').map((t: string) => t.trim());
        
        const task = await client.updateTask(updates);
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: false }
        );
        
        console.log(formatter.format(task));
        
        if (config.outputFormat === 'table') {
          console.log(chalk.green(`✓ Task #${id} updated`));
        }
      } catch (error) {
        console.error(chalk.red('Error updating task:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Task List Command
```typescript
// src/commands/task/list.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskListCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('List tasks')
    .option('-a, --assigned-to <agent>', 'Filter by assignee')
    .option('-s, --status <status>', 'Filter by status (idle, working, complete)')
    .option('--include-archived', 'Include archived tasks')
    .option('--limit <number>', 'Limit number of results', parseInt)
    .option('--offset <number>', 'Offset for pagination', parseInt)
    .action(async (options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        
        const filters: any = {};
        if (options.assignedTo) filters.assigned_to = options.assignedTo;
        if (options.status) filters.status = options.status;
        if (options.includeArchived) filters.include_archived = true;
        if (options.limit) filters.limit = options.limit;
        if (options.offset) filters.offset = options.offset;
        
        const result = await client.listTasks(filters);
        
        // Handle different response formats
        const tasks = result.tasks || result;
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: false }
        );
        
        console.log(formatter.format(tasks));
        
        if (config.outputFormat === 'table' && result.count !== undefined) {
          console.log(chalk.gray(`\nTotal: ${result.count} task(s)`));
        }
      } catch (error) {
        console.error(chalk.red('Error listing tasks:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Task Delete Command
```typescript
// src/commands/task/delete.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskDeleteCommand(program: Command): void {
  program
    .command('delete <id>')
    .description('Delete a task')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
        });
        
        // TODO: Add confirmation prompt if not --yes
        if (!options.yes && !command.optsWithGlobals().json) {
          console.log(chalk.yellow('Warning: This will permanently delete the task.'));
          console.log(chalk.gray('Use --yes to skip this confirmation.'));
          // For now, just warn
        }
        
        const client = await ensureConnected(config.url!);
        await client.deleteTask(parseInt(id));
        
        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Task #${id} deleted`));
        }
      } catch (error) {
        console.error(chalk.red('Error deleting task:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Task Archive Command
```typescript
// src/commands/task/archive.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskArchiveCommand(program: Command): void {
  program
    .command('archive <id>')
    .description('Archive a task')
    .action(async (id: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        const task = await client.archiveTask(parseInt(id));
        
        if (command.optsWithGlobals().json) {
          const formatter = createFormatter('json', { color: false, verbose: false });
          console.log(formatter.format(task));
        } else {
          console.log(chalk.green(`✓ Task #${id} archived`));
        }
      } catch (error) {
        console.error(chalk.red('Error archiving task:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Task Command Registration
```typescript
// src/commands/task/index.ts
import { Command } from 'commander';
import { createTaskCreateCommand } from './create.js';
import { createTaskGetCommand } from './get.js';
import { createTaskUpdateCommand } from './update.js';
import { createTaskDeleteCommand } from './delete.js';
import { createTaskListCommand } from './list.js';
import { createTaskArchiveCommand } from './archive.js';

export function createTaskCommands(program: Command): void {
  const task = program
    .command('task')
    .alias('t')
    .description('Task operations');
  
  createTaskCreateCommand(task);
  createTaskGetCommand(task);
  createTaskUpdateCommand(task);
  createTaskDeleteCommand(task);
  createTaskListCommand(task);
  createTaskArchiveCommand(task);
}
```

## Testing Requirements
```typescript
// tests/integration/task-commands.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Task Commands', () => {
  beforeAll(async () => {
    // Ensure test server is running
    // Set TINYTASK_URL environment variable
  });
  
  it('should create task', async () => {
    const { stdout } = await execAsync('tinytask create "Test Task" --json');
    const task = JSON.parse(stdout);
    
    expect(task.title).toBe('Test Task');
    expect(task.id).toBeDefined();
  });
  
  it('should get task by ID', async () => {
    const { stdout: createOut } = await execAsync('tinytask create "Get Test" --json');
    const created = JSON.parse(createOut);
    
    const { stdout: getOut } = await execAsync(`tinytask get ${created.id} --json`);
    const task = JSON.parse(getOut);
    
    expect(task.id).toBe(created.id);
    expect(task.title).toBe('Get Test');
  });
  
  it('should update task', async () => {
    const { stdout: createOut } = await execAsync('tinytask create "Update Test" --json');
    const created = JSON.parse(createOut);
    
    await execAsync(`tinytask update ${created.id} --status working --json`);
    
    const { stdout: getOut } = await execAsync(`tinytask get ${created.id} --json`);
    const task = JSON.parse(getOut);
    
    expect(task.status).toBe('working');
  });
  
  it('should list tasks', async () => {
    await execAsync('tinytask create "List Test 1" --json');
    await execAsync('tinytask create "List Test 2" --json');
    
    const { stdout } = await execAsync('tinytask list --json');
    const result = JSON.parse(stdout);
    
    expect(Array.isArray(result) || Array.isArray(result.tasks)).toBe(true);
  });
  
  it('should delete task', async () => {
    const { stdout: createOut } = await execAsync('tinytask create "Delete Test" --json');
    const created = JSON.parse(createOut);
    
    await execAsync(`tinytask delete ${created.id} --yes`);
    
    // Verify deleted
    try {
      await execAsync(`tinytask get ${created.id} --json`);
      expect.fail('Should have thrown error');
    } catch (error) {
      // Expected
    }
  });
  
  it('should archive task', async () => {
    const { stdout: createOut } = await execAsync('tinytask create "Archive Test" --json');
    const created = JSON.parse(createOut);
    
    await execAsync(`tinytask archive ${created.id} --json`);
    
    const { stdout: getOut } = await execAsync(`tinytask get ${created.id} --json`);
    const task = JSON.parse(getOut);
    
    expect(task.archived_at).toBeDefined();
  });
});
```

## Definition of Done
- [ ] All task commands implemented
- [ ] Convenience aliases work (create, ls)
- [ ] All options parsed correctly
- [ ] Configuration properly loaded
- [ ] Output formatting works for all formats
- [ ] Error handling catches all edge cases
- [ ] Integration tests pass
- [ ] Help text is clear and accurate

## Dependencies
- Story 1: Project Setup
- Story 2: MCP Client Integration
- Story 3: Configuration Management
- Story 4: Output Formatters

## Estimated Effort
6-8 hours

## Notes
- Ensure proper error messages for connection failures
- Consider adding --dry-run flag for testing
- Consider pagination for large list results
- Future: Add task filtering by date ranges
