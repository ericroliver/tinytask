import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createCommentCommands(program: Command): void {
  const comment = program.command('comment').alias('c').description('Comment operations');

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

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

        const client = await ensureConnected(config.url);
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
        console.error(
          chalk.red('Error adding comment:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // List comments
  comment
    .command('list <task-id>')
    .description('List all comments for a task')
    .action(async (taskId: string, _options, command) => {
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
        const comments = await client.listComments(parseInt(taskId));

        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: false,
        });

        console.log(formatter.format(comments));
      } catch (error) {
        console.error(
          chalk.red('Error listing comments:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Update comment
  comment
    .command('update <comment-id> <content>')
    .description('Update a comment')
    .action(async (commentId: string, content: string, _options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
        });

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

        const client = await ensureConnected(config.url);
        await client.updateComment(parseInt(commentId), content);

        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Comment #${commentId} updated`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error updating comment:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Delete comment
  comment
    .command('delete <comment-id>')
    .description('Delete a comment')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (commentId: string, _options, command) => {
      try {
        const config = await loadConfig({
          url: command.optsWithGlobals().url,
        });

        if (!config.url) {
          console.error(
            chalk.red('Error: No server URL configured. Use --url or configure a profile.')
          );
          process.exit(1);
        }

        const client = await ensureConnected(config.url);
        await client.deleteComment(parseInt(commentId));

        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Comment #${commentId} deleted`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error deleting comment:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
