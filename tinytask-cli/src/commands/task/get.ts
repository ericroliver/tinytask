import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../../client/connection.js';
import { createFormatter } from '../../formatters/index.js';
import { loadConfig } from '../../config/loader.js';
import { takeLast } from '../../utils/comments.js';

export function createTaskGetCommand(program: Command): void {
  program
    .command('get <id>')
    .description('Get task by ID')
    .option(
      '--include-comments [n]',
      'Include comments (optionally only the last N, e.g. --include-comments 5). Comments are omitted by default.',
      parseInt
    )
    .action(async (id: string, options, command) => {
      try {
        const includeComments = options.includeComments as boolean | number | undefined;

        if (
          typeof includeComments === 'number' &&
          (!Number.isInteger(includeComments) || includeComments < 0)
        ) {
          console.error(
            chalk.red(
              `Error: Invalid --include-comments value '${includeComments}'. Expected a non-negative integer.`
            )
          );
          process.exit(1);
        }

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
        const task = (await client.getTask(parseInt(id))) as Record<string, unknown> | null;

        if (!task) {
          console.error(chalk.red(`Task #${id} not found`));
          process.exit(1);
        }

        // Prune comments client-side to keep agent context small.
        // Comments are omitted unless --include-comments is given;
        // with a value N, only the last N comments are included.
        if (includeComments === undefined) {
          delete task.comments;
        } else if (typeof includeComments === 'number') {
          task.comments = takeLast(task.comments, includeComments);
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
