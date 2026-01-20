import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createMoveCommand(program: Command): void {
  program
    .command('move <id> <to-agent>')
    .description('Transfer task to another agent')
    .option('-f, --from <agent>', 'Current agent (defaults to config)')
    .option('-m, --comment <text>', 'Handoff comment', 'Task transferred')
    .action(async (id: string, toAgent: string, options, command) => {
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

        const fromAgent = options.from || config.defaultAgent;
        if (!fromAgent) {
          console.error(
            chalk.red('Error: No current agent specified and no default agent configured')
          );
          console.error(chalk.gray('Use: tinytask move <id> <to-agent> --from <current-agent>'));
          console.error(chalk.gray('Or: tinytask config set defaultAgent <name>'));
          process.exit(1);
        }

        const client = await ensureConnected(config.url);
        const task = await client.moveTask(parseInt(id), fromAgent, toAgent, options.comment);

        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: true,
        });

        console.log(formatter.format(task));

        if (config.outputFormat === 'table') {
          console.log(chalk.green(`\n✓ Task #${id} transferred from ${fromAgent} to ${toAgent}`));
        }
      } catch (error) {
        console.error(
          chalk.red('Error moving task:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
