import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskGetCommand(program: Command): void {
  program
    .command('get <id>')
    .description('Get task by ID')
    .action(async (id: string, _options, command) => {
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
        const task = await client.getTask(parseInt(id));

        if (!task) {
          console.error(chalk.red(`Task #${id} not found`));
          process.exit(1);
        }

        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: true,
        });

        console.log(formatter.format(task));
      } catch (error) {
        console.error(
          chalk.red('Error getting task:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
