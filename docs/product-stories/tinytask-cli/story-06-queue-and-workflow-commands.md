# Story 6: TinyTask CLI - Queue and Workflow Commands

## Overview
Implement queue management and high-level workflow commands (queue, signup, move) plus comment and link operations.

## User Story
As a CLI user, I want to manage my task queue and perform workflow operations so that I can efficiently claim tasks, transfer work, and manage task metadata.

## Acceptance Criteria
- [ ] `tinytask queue [agent]` displays agent queue
- [ ] `tinytask signup` claims next task
- [ ] `tinytask move <id> <agent>` transfers task
- [ ] `tinytask comment add/list/update/delete` commands work
- [ ] `tinytask link add/list/update/delete` commands work
- [ ] All commands respect output formatting
- [ ] Error handling for edge cases
- [ ] Integration tests pass

## Technical Details

### Queue Command
```typescript
// src/commands/queue.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createQueueCommand(program: Command): void {
  program
    .command('queue [agent]')
    .alias('q')
    .description('View task queue for an agent')
    .option('-s, --status <status>', 'Filter by status')
    .option('--mine', 'View my queue (uses default agent from config)')
    .action(async (agent: string | undefined, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        // Determine agent name
        let agentName = agent;
        if (options.mine || !agentName) {
          agentName = config.defaultAgent;
          if (!agentName) {
            console.error(chalk.red('Error: No agent specified and no default agent configured'));
            console.error(chalk.gray('Use: tinytask queue <agent-name>'));
            console.error(chalk.gray('Or: tinytask config set default-agent <name>'));
            process.exit(1);
          }
        }
        
        const client = await ensureConnected(config.url!);
        const queueData = await client.getMyQueue(agentName);
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: false }
        );
        
        console.log(formatter.format(queueData));
      } catch (error) {
        console.error(chalk.red('Error getting queue:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Signup Command
```typescript
// src/commands/signup.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createSignupCommand(program: Command): void {
  program
    .command('signup')
    .description('Sign up for next available task in your queue')
    .option('-a, --agent <name>', 'Agent name (defaults to config)')
    .action(async (options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const agentName = options.agent || config.defaultAgent;
        if (!agentName) {
          console.error(chalk.red('Error: No agent specified and no default agent configured'));
          console.error(chalk.gray('Use: tinytask signup --agent <name>'));
          console.error(chalk.gray('Or: tinytask config set default-agent <name>'));
          process.exit(1);
        }
        
        const client = await ensureConnected(config.url!);
        const task = await client.signupForTask(agentName);
        
        if (!task) {
          if (command.optsWithGlobals().json) {
            console.log('null');
          } else {
            console.log(chalk.yellow('No idle tasks available in your queue'));
          }
          return;
        }
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: true }
        );
        
        console.log(formatter.format(task));
        
        if (config.outputFormat === 'table') {
          console.log(chalk.green(`\n✓ Claimed task #${task.id}: ${task.title}`));
        }
      } catch (error) {
        console.error(chalk.red('Error signing up for task:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Move Command
```typescript
// src/commands/move.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createMoveCommand(program: Command): void {
  program
    .command('move <id> <to-agent>')
    .description('Transfer task to another agent')
    .option('-f, --from <agent>', 'Current agent (defaults to config)')
    .option('-m, --comment <text>', 'Handoff comment', 'Task transferred')
    .action(async (id: string, toAgent: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const fromAgent = options.from || config.defaultAgent;
        if (!fromAgent) {
          console.error(chalk.red('Error: No current agent specified and no default agent configured'));
          console.error(chalk.gray('Use: tinytask move <id> <to-agent> --from <current-agent>'));
          console.error(chalk.gray('Or: tinytask config set default-agent <name>'));
          process.exit(1);
        }
        
        const client = await ensureConnected(config.url!);
        const task = await client.moveTask(
          parseInt(id),
          fromAgent,
          toAgent,
          options.comment
        );
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: true }
        );
        
        console.log(formatter.format(task));
        
        if (config.outputFormat === 'table') {
          console.log(chalk.green(`\n✓ Task #${id} transferred from ${fromAgent} to ${toAgent}`));
        }
      } catch (error) {
        console.error(chalk.red('Error moving task:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Comment Commands
```typescript
// src/commands/comment.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createCommentCommands(program: Command): void {
  const comment = program
    .command('comment')
    .alias('c')
    .description('Comment operations');
  
  // Add comment
  comment
    .command('add <task-id> <content>')
    .description('Add a comment to a task')
    .option('--created-by <agent>', 'Comment author')
    .action(async (taskId: string, content: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        const result = await client.addComment(
          parseInt(taskId),
          content,
          options.createdBy || config.defaultAgent
        );
        
        if (command.optsWithGlobals().json) {
          const formatter = createFormatter('json', { color: false, verbose: false });
          console.log(formatter.format(result));
        } else {
          console.log(chalk.green(`✓ Comment added to task #${taskId}`));
        }
      } catch (error) {
        console.error(chalk.red('Error adding comment:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  
  // List comments
  comment
    .command('list <task-id>')
    .description('List all comments for a task')
    .action(async (taskId: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        const comments = await client.listComments(parseInt(taskId));
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: false }
        );
        
        console.log(formatter.format(comments));
      } catch (error) {
        console.error(chalk.red('Error listing comments:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  
  // Update comment
  comment
    .command('update <comment-id> <content>')
    .description('Update a comment')
    .action(async (commentId: string, content: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
        });
        
        const client = await ensureConnected(config.url!);
        await client.updateComment(parseInt(commentId), content);
        
        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Comment #${commentId} updated`));
        }
      } catch (error) {
        console.error(chalk.red('Error updating comment:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  
  // Delete comment
  comment
    .command('delete <comment-id>')
    .description('Delete a comment')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (commentId: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
        });
        
        const client = await ensureConnected(config.url!);
        await client.deleteComment(parseInt(commentId));
        
        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Comment #${commentId} deleted`));
        }
      } catch (error) {
        console.error(chalk.red('Error deleting comment:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

### Link Commands
```typescript
// src/commands/link.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createLinkCommands(program: Command): void {
  const link = program
    .command('link')
    .alias('l')
    .description('Link/artifact operations');
  
  // Add link
  link
    .command('add <task-id> <url>')
    .description('Add a link to a task')
    .option('-d, --description <text>', 'Link description')
    .option('--created-by <agent>', 'Link author')
    .action(async (taskId: string, url: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        const result = await client.addLink(
          parseInt(taskId),
          url,
          options.description,
          options.createdBy || config.defaultAgent
        );
        
        if (command.optsWithGlobals().json) {
          const formatter = createFormatter('json', { color: false, verbose: false });
          console.log(formatter.format(result));
        } else {
          console.log(chalk.green(`✓ Link added to task #${taskId}`));
        }
      } catch (error) {
        console.error(chalk.red('Error adding link:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  
  // List links
  link
    .command('list <task-id>')
    .description('List all links for a task')
    .action(async (taskId: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });
        
        const client = await ensureConnected(config.url!);
        const links = await client.listLinks(parseInt(taskId));
        
        const formatter = createFormatter(
          config.outputFormat,
          { color: config.colorOutput, verbose: false }
        );
        
        console.log(formatter.format(links));
      } catch (error) {
        console.error(chalk.red('Error listing links:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  
  // Update link
  link
    .command('update <link-id>')
    .description('Update a link')
    .option('--url <url>', 'New URL')
    .option('--description <text>', 'New description')
    .action(async (linkId: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
        });
        
        const updates: any = {};
        if (options.url) updates.url = options.url;
        if (options.description) updates.description = options.description;
        
        const client = await ensureConnected(config.url!);
        await client.updateLink(parseInt(linkId), updates);
        
        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Link #${linkId} updated`));
        }
      } catch (error) {
        console.error(chalk.red('Error updating link:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  
  // Delete link
  link
    .command('delete <link-id>')
    .description('Delete a link')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (linkId: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
        });
        
        const client = await ensureConnected(config.url!);
        await client.deleteLink(parseInt(linkId));
        
        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Link #${linkId} deleted`));
        }
      } catch (error) {
        console.error(chalk.red('Error deleting link:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
```

## Testing Requirements
```typescript
// tests/integration/workflow-commands.test.ts
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Workflow Commands', () => {
  it('should view queue', async () => {
    await execAsync('tinytask create "Queue Test" --assigned-to test-agent --json');
    
    const { stdout } = await execAsync('tinytask queue test-agent --json');
    const queue = JSON.parse(stdout);
    
    expect(queue.agent).toBe('test-agent');
    expect(queue.tasks).toBeDefined();
  });
  
  it('should signup for task', async () => {
    await execAsync('tinytask create "Signup Test" --assigned-to signup-agent --json');
    
    const { stdout } = await execAsync('tinytask signup --agent signup-agent --json');
    const task = JSON.parse(stdout);
    
    expect(task.status).toBe('working');
  });
  
  it('should move task between agents', async () => {
    const { stdout: createOut } = await execAsync(
      'tinytask create "Move Test" --assigned-to agent-a --json'
    );
    const task = JSON.parse(createOut);
    
    await execAsync(
      `tinytask move ${task.id} agent-b --from agent-a --comment "Transferring" --json`
    );
    
    const { stdout: getOut } = await execAsync(`tinytask get ${task.id} --json`);
    const updated = JSON.parse(getOut);
    
    expect(updated.assigned_to).toBe('agent-b');
  });
  
  it('should manage comments', async () => {
    const { stdout: createOut } = await execAsync('tinytask create "Comment Test" --json');
    const task = JSON.parse(createOut);
    
    // Add comment
    await execAsync(`tinytask comment add ${task.id} "Test comment" --json`);
    
    // List comments
    const { stdout: listOut } = await execAsync(`tinytask comment list ${task.id} --json`);
    const comments = JSON.parse(listOut);
    
    expect(comments.length).toBeGreaterThan(0);
  });
  
  it('should manage links', async () => {
    const { stdout: createOut } = await execAsync('tinytask create "Link Test" --json');
    const task = JSON.parse(createOut);
    
    // Add link
    await execAsync(`tinytask link add ${task.id} "http://example.com" --json`);
    
    // List links
    const { stdout: listOut } = await execAsync(`tinytask link list ${task.id} --json`);
    const links = JSON.parse(listOut);
    
    expect(links.length).toBeGreaterThan(0);
  });
});
```

## Definition of Done
- [ ] Queue command implemented
- [ ] Signup command implemented
- [ ] Move command implemented
- [ ] All comment commands work
- [ ] All link commands work
- [ ] Default agent configuration respected
- [ ] Error messages are helpful
- [ ] Integration tests pass
- [ ] Help text is clear

## Dependencies
- Story 1: Project Setup
- Story 2: MCP Client Integration
- Story 3: Configuration Management
- Story 4: Output Formatters
- Story 5: Task Commands

## Estimated Effort
6-8 hours

## Notes
- Queue command should default to user's configured agent
- Signup is the high-efficiency workflow command
- Move combines update + comment in atomic operation
- Consider adding bulk comment/link operations in future
