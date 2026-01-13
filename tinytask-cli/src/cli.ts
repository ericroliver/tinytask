import { Command } from 'commander';
import { version } from './version.js';
import { createConfigCommands } from './commands/config.js';
import { createTaskCommands } from './commands/task/index.js';
import { createQueueCommand } from './commands/queue.js';
import { createSignupCommand } from './commands/signup.js';
import { createMoveCommand } from './commands/move.js';
import { createCommentCommands } from './commands/comment.js';
import { createLinkCommands } from './commands/link.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('tinytask')
    .description('TinyTask CLI - Command-line task management')
    .version(version);

  // Global options
  program
    .option('--url <url>', 'TinyTask server URL')
    .option('--json', 'Output as JSON')
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Enable verbose logging')
    .option('--profile <profile>', 'Configuration profile to use');

  // Config commands
  createConfigCommands(program);

  // Task commands
  createTaskCommands(program);

  // Workflow commands
  createQueueCommand(program);
  createSignupCommand(program);
  createMoveCommand(program);

  // Comment and link commands
  createCommentCommands(program);
  createLinkCommands(program);

  // Placeholder command for testing
  program
    .command('ping')
    .description('Test CLI installation')
    .action(() => {
      console.log('TinyTask CLI is working!');
    });

  return program;
}
