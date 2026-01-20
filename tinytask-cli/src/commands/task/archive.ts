import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';

export function createTaskArchiveCommand(program: Command): void {
  program
    .command('archive <id>')
    .description('Archive a task')
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
        const task = await client.archiveTask(parseInt(id));

        if (command.optsWithGlobals().json) {
          const formatter = createFormatter('json', { color: false, verbose: false });
          console.log(formatter.format(task));
        } else {
          console.log(chalk.green(`✓ Task #${id} archived`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error archiving task:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
