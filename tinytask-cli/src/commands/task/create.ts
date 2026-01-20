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

        if (!config.url) {
          console.error(chalk.red('Error: No server URL configured. Use --url or configure a profile.'));
          process.exit(1);
        }

        const client = await ensureConnected(config.url);

        // Parse tags if provided
        const tags = options.tags
          ? options.tags.split(',').map((t: string) => t.trim())
          : undefined;

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
        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: false,
        });

        console.log(formatter.format(task));

        if (config.outputFormat === 'table') {
          console.log(chalk.green(`✓ Task #${(task as Record<string, unknown>).id} created`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error creating task:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
