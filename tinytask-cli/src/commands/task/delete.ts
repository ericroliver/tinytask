import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { ensureConnected } from '../../client/connection.js';
import { loadConfig } from '../../config/loader.js';

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

export function createTaskDeleteCommand(program: Command): void {
  program
    .command('delete <id>')
    .description('Delete a task')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, options, command) => {
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

        // Prompt for confirmation if not --yes and not in JSON mode
        if (!options.yes && !command.optsWithGlobals().json) {
          console.log(chalk.yellow('⚠️  Warning: This will permanently delete the task.'));
          const confirmed = await promptConfirmation(chalk.cyan('Are you sure? (y/N): '));

          if (!confirmed) {
            console.log(chalk.gray('Deletion cancelled.'));
            process.exit(0);
          }
        }

        const client = await ensureConnected(config.url);
        await client.deleteTask(parseInt(id));

        if (!command.optsWithGlobals().json) {
          console.log(chalk.green(`✓ Task #${id} deleted`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error deleting task:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
