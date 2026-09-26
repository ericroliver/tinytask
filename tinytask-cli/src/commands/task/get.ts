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
    .option('--no-comments', 'Omit comments (description and metadata only)')
    .option('--last-comment <n>', 'Include only the last N comments', parseInt)
    .action(async (id: string, options, command) => {
      try {
        if (
          options.lastComment !== undefined &&
          (!Number.isInteger(options.lastComment) || options.lastComment < 0)
        ) {
          console.error(
            chalk.red(
              `Error: Invalid --last-comment value '${options.lastComment}'. Expected a non-negative integer.`
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
        // Commander maps `--no-comments` to `comments` (default true; false when passed).
        if (options.comments === false) {
          delete task.comments;
        } else if (options.lastComment !== undefined) {
          task.comments = takeLast(task.comments, options.lastComment);
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
