import { Command } from 'commander';
import { loadConfig, saveConfig, initConfig, getConfigPath } from '../config/loader.js';
import chalk from 'chalk';
import fs from 'fs/promises';

export function createConfigCommands(program: Command): void {
  const config = program.command('config').description('Manage CLI configuration');

  // Initialize config
  config
    .command('init')
    .description('Initialize configuration file')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      const configPath = getConfigPath();

      if (!options.force) {
        try {
          await fs.access(configPath);
          console.error(chalk.red('Configuration file already exists. Use --force to overwrite.'));
          process.exit(1);
        } catch {
          // File doesn't exist, proceed
        }
      }

      const newConfig = await initConfig();
      console.log(chalk.green('✓ Configuration initialized at:'), configPath);
      console.log(chalk.gray(JSON.stringify(newConfig, null, 2)));
    });

  // Show current config
  config
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      try {
        const currentConfig = await loadConfig({});
        console.log(chalk.cyan('Current Configuration:'));
        console.log(JSON.stringify(currentConfig, null, 2));
        console.log();
        console.log(chalk.gray('Config file:'), getConfigPath());
      } catch (error) {
        console.error(
          chalk.red('Error loading configuration:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Set config value
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string) => {
      try {
        const currentConfig = await loadConfig({});

        // Update the config
        (currentConfig as Record<string, unknown>)[key] = value;

        await saveConfig(currentConfig);
        console.log(chalk.green('✓ Configuration updated'));
        console.log(`${key} = ${value}`);
      } catch (error) {
        console.error(
          chalk.red('Error updating configuration:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Get config value
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key: string) => {
      try {
        const currentConfig = await loadConfig({});
        const value = (currentConfig as Record<string, unknown>)[key];

        if (value === undefined) {
          console.error(chalk.red(`Configuration key '${key}' not found`));
          process.exit(1);
        }

        console.log(value);
      } catch (error) {
        console.error(
          chalk.red('Error reading configuration:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Profile management
  const profile = config.command('profile').description('Manage configuration profiles');

  profile
    .command('add')
    .description('Add a new profile')
    .requiredOption('-n, --name <name>', 'Profile name')
    .requiredOption('-u, --server-url <url>', 'TinyTask server URL')
    .option('--default-agent <agent>', 'Default agent name')
    .action(async (options) => {
      try {
        const currentConfig = await loadConfig({});

        if (!currentConfig.profiles) {
          currentConfig.profiles = {};
        }

        currentConfig.profiles[options.name] = {
          url: options.serverUrl,
          defaultAgent: options.defaultAgent,
        };

        await saveConfig(currentConfig);
        console.log(chalk.green(`✓ Profile '${options.name}' added`));
      } catch (error) {
        console.error(
          chalk.red('Error adding profile:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  profile
    .command('list')
    .description('List all profiles')
    .action(async () => {
      try {
        const currentConfig = await loadConfig({});

        if (!currentConfig.profiles || Object.keys(currentConfig.profiles).length === 0) {
          console.log(chalk.yellow('No profiles configured'));
          return;
        }

        console.log(chalk.cyan('Configured Profiles:'));
        for (const [name, prof] of Object.entries(currentConfig.profiles)) {
          const active = name === currentConfig.activeProfile ? chalk.green(' (active)') : '';
          console.log(`  ${chalk.bold(name)}${active}`);
          console.log(`    URL: ${prof.url}`);
          if (prof.defaultAgent) {
            console.log(`    Default Agent: ${prof.defaultAgent}`);
          }
        }
      } catch (error) {
        console.error(
          chalk.red('Error listing profiles:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  profile
    .command('use <name>')
    .description('Set active profile')
    .action(async (name: string) => {
      try {
        const currentConfig = await loadConfig({});

        if (!currentConfig.profiles?.[name]) {
          console.error(chalk.red(`Profile '${name}' not found`));
          process.exit(1);
        }

        currentConfig.activeProfile = name;
        await saveConfig(currentConfig);
        console.log(chalk.green(`✓ Active profile set to '${name}'`));
      } catch (error) {
        console.error(
          chalk.red('Error setting profile:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  profile
    .command('remove <name>')
    .description('Remove a profile')
    .action(async (name: string) => {
      try {
        const currentConfig = await loadConfig({});

        if (!currentConfig.profiles?.[name]) {
          console.error(chalk.red(`Profile '${name}' not found`));
          process.exit(1);
        }

        delete currentConfig.profiles[name];

        if (currentConfig.activeProfile === name) {
          delete currentConfig.activeProfile;
        }

        await saveConfig(currentConfig);
        console.log(chalk.green(`✓ Profile '${name}' removed`));
      } catch (error) {
        console.error(
          chalk.red('Error removing profile:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
