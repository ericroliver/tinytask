import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createLinkCommands(program: Command): void {
  const link = program.command('link').alias('l').description('Link/artifact operations');

  // Add link
  link
    .command('add <task-id> <url>')
    .description('Add a link to a task')
    .option('-d, --description <text>', 'Link description')
    .option('--created-by <agent>', 'Link author')
    .action(async (taskId: string, url: string, options, command) => {
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
        const result = await client.addLink(
          parseInt(taskId),
          url,
          options.description,
          options.createdBy || config.defaultAgent
        );

        if (command.optsWithGlobals().json) {
          const formatter = createFormatter('json', { color: false, verbose: false });
          console.log(formatter.format(result));
        } else {
          console.log(chalk.green(`✓ Link added to task #${taskId}`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error adding link:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // List links
  link
    .command('list <task-id>')
    .description('List all links for a task')
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
        const links = await client.listLinks(parseInt(taskId));

        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: false,
        });

        console.log(formatter.format(links));
      } catch (error) {
        console.error(
          chalk.red('Error listing links:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Update link
  link
    .command('update <link-id>')
    .description('Update a link')
    .option('--url <url>', 'New URL')
    .option('--description <text>', 'New description')
    .action(async (linkId: string, options, command) => {
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

        const updates: Record<string, unknown> = {};
        if (options.url) updates.url = options.url;
        if (options.description) updates.description = options.description;

        const client = await ensureConnected(config.url);
        await client.updateLink(parseInt(linkId), updates);

        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Link #${linkId} updated`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error updating link:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Delete link
  link
    .command('delete <link-id>')
    .description('Delete a link')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (linkId: string, _options, command) => {
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
        await client.deleteLink(parseInt(linkId));

        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Link #${linkId} deleted`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error deleting link:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
