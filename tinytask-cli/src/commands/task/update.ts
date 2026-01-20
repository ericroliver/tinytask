import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';
import { UpdateTaskParams } from '../../client/mcp-client.js';

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

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

        const client = await ensureConnected(config.url);

        // Build update params
        const updates: UpdateTaskParams = { id: parseInt(id) };

        if (options.title) updates.title = options.title;
        if (options.description) updates.description = options.description;
        if (options.status) updates.status = options.status;
        if (options.assignedTo) updates.assigned_to = options.assignedTo;
        if (options.priority !== undefined) updates.priority = options.priority;
        if (options.tags)
          updates.tags = options.tags.split(',').map((t: string) => t.trim());

        const task = await client.updateTask(updates);

        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: false,
        });

        console.log(formatter.format(task));

        if (config.outputFormat === 'table') {
          console.log(chalk.green(`✓ Task #${id} updated`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error updating task:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
