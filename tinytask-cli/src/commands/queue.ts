import { Command } from 'commander';
import chalk from 'chalk';
import { ensureConnected } from '../client/connection.js';
import { createFormatter } from '../formatters/index.js';
import { loadConfig } from '../config/loader.js';

export function createQueueCommand(program: Command): void {
  program
    .command('queue [agent]')
    .alias('q')
    .description('View task queue for an agent')
    .option('-s, --status <status>', 'Filter by status')
    .option('--mine', 'View my queue (uses default agent from config)')
    .action(async (agent: string | undefined, options, command) => {
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

        // Determine agent name
        let agentName = agent;
        if (options.mine || !agentName) {
          agentName = config.defaultAgent;
          if (!agentName) {
            console.error(
              chalk.red('Error: No agent specified and no default agent configured')
            );
            console.error(chalk.gray('Use: tinytask queue <agent-name>'));
            console.error(chalk.gray('Or: tinytask config set defaultAgent <name>'));
            process.exit(1);
          }
        }

        const client = await ensureConnected(config.url);
        const queueData = await client.getMyQueue(agentName);

        const formatter = createFormatter(config.outputFormat, {
          color: config.colorOutput,
          verbose: false,
        });

        console.log(formatter.format(queueData));
      } catch (error) {
        console.error(
          chalk.red('Error getting queue:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
