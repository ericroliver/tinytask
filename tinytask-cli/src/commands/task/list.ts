import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';
import { TaskFilters } from '../../client/mcp-client.js';

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

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

        const client = await ensureConnected(config.url);

        const filters: TaskFilters = {};
        if (options.assignedTo) filters.assigned_to = options.assignedTo;
        if (options.status) filters.status = options.status;
        if (options.includeArchived) filters.include_archived = true;
        if (options.limit) filters.limit = options.limit;
        if (options.offset) filters.offset = options.offset;

        const result = await client.listTasks(filters);

        // Handle different response formats
        const response = result as Record<string, unknown>;
        const tasks = response.tasks || result;

        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: false,
        });

        console.log(formatter.format(tasks));

        if (config.outputFormat === 'table' && response.count !== undefined) {
          console.log(chalk.gray(`\nTotal: ${response.count} task(s)`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error listing tasks:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
