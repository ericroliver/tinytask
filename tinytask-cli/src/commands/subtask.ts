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
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

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
          const subtaskData = subtask as { id: number };
          console.log(chalk.green(`✓ Subtask #${subtaskData.id} created under task #${parent_id}`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error creating subtask:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // List subtasks
  subtask
    .command('list <parent-id>')
    .alias('ls')
    .description('List all subtasks for a parent task')
    .option('-r, --recursive', 'Include all nested subtasks')
    .option('--include-archived', 'Include archived subtasks')
    .action(async (parentId: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

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
      } catch (error) {
        console.error(
          chalk.red('Error listing subtasks:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Tree view
  subtask
    .command('tree <task-id>')
    .description('Show task hierarchy as a tree structure')
    .option('-r, --recursive', 'Show complete subtask tree')
    .action(async (taskId: string, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

        const task_id = parseInt(taskId, 10);
        if (isNaN(task_id)) {
          console.error(chalk.red('Error: Task ID must be a number'));
          process.exit(1);
        }

        const client = await ensureConnected(config.url);

        const taskTree = await client.getTaskWithSubtasks(task_id, options.recursive);

        // Use tree formatter for tree view
        const formatter = createFormatter('tree', {
          color: config.colorOutput,
          verbose: false,
        });

        console.log(formatter.format(taskTree));
      } catch (error) {
        console.error(
          chalk.red('Error getting task tree:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Move subtask
  subtask
    .command('move <subtask-id> [new-parent-id]')
    .description('Move subtask to a different parent or make it top-level')
    .action(async (subtaskId: string, newParentId: string | undefined, options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
          outputFormat: command.optsWithGlobals().json ? 'json' : undefined,
        });

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

        const subtask_id = parseInt(subtaskId, 10);
        const new_parent_id = newParentId ? parseInt(newParentId, 10) : undefined;

        if (isNaN(subtask_id)) {
          console.error(chalk.red('Error: Subtask ID must be a number'));
          process.exit(1);
        }

        if (newParentId && (new_parent_id === undefined || isNaN(new_parent_id))) {
          console.error(chalk.red('Error: New parent ID must be a number'));
          process.exit(1);
        }

        const client = await ensureConnected(config.url);

        await client.moveSubtask(subtask_id, new_parent_id);

        if (new_parent_id) {
          console.log(chalk.green(`✓ Subtask #${subtask_id} moved to parent #${new_parent_id}`));
        } else {
          console.log(chalk.green(`✓ Subtask #${subtask_id} made top-level task`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error moving subtask:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
