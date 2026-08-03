import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';
import { resolveContent } from '../utils/stdin.js';

export function createCommentCommands(program: Command): void {
  const comment = program.command('comment').alias('c').description('Comment operations');

  // Add comment
  comment
    .command('add <task-id> [content]')
    .description('Add a comment to a task')
    .option('--created-by <agent>', 'Comment author')
    .option('--stdin', 'Read comment content from stdin instead of positional argument')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  # Short content as positional argument',
        '  tinytask comment add 800 "Fix applied to login.ts"',
        '',
        '  # Long/multi-line content via stdin (avoids shell issues with backticks, $, etc.)',
        "  tinytask comment add 800 --stdin --created-by my-agent <<'EOF'",
        '  ## Re-Review',
        "  Code uses `hostname`, `resources` — fields that don't exist.",
        '  EOF',
        '',
        '  # Pipe content directly',
        '  echo "Comment with `backticks`" | tinytask comment add 800 --stdin',
        '',
        "  # Always use --stdin with a quoted heredoc (<<'EOF') for content containing",
        '  # backticks, $, or other shell metacharacters to prevent command substitution.',
      ].join('\n')
    )
    .action(async (taskId: string, content: string | undefined, options, command) => {
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

        // Resolve content: use stdin if --stdin flag is set, otherwise use positional arg
        const resolvedContent = await resolveContent(options.stdin, content);

        if (!resolvedContent) {
          console.error(
            chalk.red(
              'Error: Comment content is required. Provide it as an argument or use --stdin.'
            )
          );
          process.exit(1);
        }

        const client = await ensureConnected(config.url);
        const result = await client.addComment(
          parseInt(taskId),
          resolvedContent,
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
    .command('update <comment-id> [content]')
    .description('Update a comment')
    .option('--stdin', 'Read comment content from stdin instead of positional argument')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  # Short content as positional argument',
        '  tinytask comment update 5 "Updated: fix verified"',
        '',
        '  # Long/multi-line content via stdin',
        "  tinytask comment update 5 --stdin <<'EOF'",
        '  ## Updated Review',
        '  Fixed `hostname` field — now uses proper config.',
        '  EOF',
        '',
        '  # Always use --stdin with a quoted heredoc for content containing',
        '  # backticks, $, or other shell metacharacters to prevent command substitution.',
      ].join('\n')
    )
    .action(async (commentId: string, content: string | undefined, options, command) => {
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

        // Resolve content: use stdin if --stdin flag is set, otherwise use positional arg
        const resolvedContent = await resolveContent(options.stdin, content);

        if (!resolvedContent) {
          console.error(
            chalk.red(
              'Error: Comment content is required. Provide it as an argument or use --stdin.'
            )
          );
          process.exit(1);
        }

        const client = await ensureConnected(config.url);
        await client.updateComment(parseInt(commentId), resolvedContent);

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
