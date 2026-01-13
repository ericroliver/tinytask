# Story 3: TinyTask CLI - Configuration Management

## Overview
Implement configuration system that loads settings from multiple sources (files, environment variables, CLI flags) with proper precedence.

## User Story
As a CLI user, I want flexible configuration options so that I can easily switch between different TinyTask servers and customize my CLI experience.

## Acceptance Criteria
- [ ] Configuration schema defined with Zod
- [ ] Configuration loader using cosmiconfig
- [ ] Support for `.tinytaskrc`, `.tinytask.json`, and `package.json#tinytask`
- [ ] Environment variable overrides work
- [ ] CLI flag overrides work (highest priority)
- [ ] Profile support for multiple servers
- [ ] `tinytask config` command group implemented
- [ ] Config validation with helpful error messages

## Technical Details

### Configuration Schema
```typescript
// src/config/schema.ts
import { z } from 'zod';

export const ProfileSchema = z.object({
  url: z.string().url(),
  defaultAgent: z.string().optional(),
});

export const ConfigSchema = z.object({
  url: z.string().url().optional(),
  defaultAgent: z.string().optional(),
  outputFormat: z.enum(['table', 'json', 'csv', 'compact']).default('table'),
  colorOutput: z.boolean().default(true),
  timeout: z.number().default(30000),
  profiles: z.record(ProfileSchema).optional(),
  activeProfile: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

export const DEFAULT_CONFIG: Config = {
  outputFormat: 'table',
  colorOutput: true,
  timeout: 30000,
};
```

### Configuration Loader
```typescript
// src/config/loader.ts
import { cosmiconfig } from 'cosmiconfig';
import { ConfigSchema, Config, DEFAULT_CONFIG } from './schema.js';
import path from 'path';
import os from 'os';

const explorer = cosmiconfig('tinytask');

export async function loadConfig(options: {
  profile?: string;
  url?: string;
  outputFormat?: string;
}): Promise<Config> {
  // Start with defaults
  let config: Config = { ...DEFAULT_CONFIG };
  
  // Load from config file
  try {
    const result = await explorer.search();
    if (result?.config) {
      config = { ...config, ...result.config };
    }
  } catch (error) {
    // Config file is optional, continue with defaults
  }
  
  // Apply profile if specified
  if (options.profile) {
    if (!config.profiles?.[options.profile]) {
      throw new Error(`Profile '${options.profile}' not found in configuration`);
    }
    config = { ...config, ...config.profiles[options.profile] };
    config.activeProfile = options.profile;
  } else if (config.activeProfile && config.profiles?.[config.activeProfile]) {
    // Use active profile from config file
    config = { ...config, ...config.profiles[config.activeProfile] };
  }
  
  // Environment variable overrides
  if (process.env.TINYTASK_URL) {
    config.url = process.env.TINYTASK_URL;
  }
  if (process.env.TINYTASK_AGENT) {
    config.defaultAgent = process.env.TINYTASK_AGENT;
  }
  if (process.env.TINYTASK_FORMAT) {
    config.outputFormat = process.env.TINYTASK_FORMAT as any;
  }
  if (process.env.TINYTASK_NO_COLOR === 'true') {
    config.colorOutput = false;
  }
  if (process.env.TINYTASK_TIMEOUT) {
    config.timeout = parseInt(process.env.TINYTASK_TIMEOUT);
  }
  
  // CLI option overrides (highest priority)
  if (options.url) {
    config.url = options.url;
  }
  if (options.outputFormat) {
    config.outputFormat = options.outputFormat as any;
  }
  
  // Validate final configuration
  return ConfigSchema.parse(config);
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.tinytask', 'config.json');
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  
  const fs = await import('fs/promises');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function initConfig(): Promise<Config> {
  const defaultConfig: Config = {
    ...DEFAULT_CONFIG,
    url: 'http://localhost:3000/mcp',
  };
  
  await saveConfig(defaultConfig);
  return defaultConfig;
}
```

### Config Commands
```typescript
// src/commands/config.ts
import { Command } from 'commander';
import { loadConfig, saveConfig, initConfig, getConfigPath } from '../config/loader.js';
import { Config } from '../config/schema.js';
import chalk from 'chalk';

export function createConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('Manage CLI configuration');
  
  // Initialize config
  config
    .command('init')
    .description('Initialize configuration file')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      const configPath = getConfigPath();
      
      if (!options.force) {
        const fs = await import('fs/promises');
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
        console.error(chalk.red('Error loading configuration:'), error);
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
        (currentConfig as any)[key] = value;
        
        await saveConfig(currentConfig);
        console.log(chalk.green('✓ Configuration updated'));
        console.log(`${key} = ${value}`);
      } catch (error) {
        console.error(chalk.red('Error updating configuration:'), error);
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
        const value = (currentConfig as any)[key];
        
        if (value === undefined) {
          console.error(chalk.red(`Configuration key '${key}' not found`));
          process.exit(1);
        }
        
        console.log(value);
      } catch (error) {
        console.error(chalk.red('Error reading configuration:'), error);
        process.exit(1);
      }
    });
  
  // Profile management
  const profile = config
    .command('profile')
    .description('Manage configuration profiles');
  
  profile
    .command('add <name>')
    .description('Add a new profile')
    .requiredOption('--url <url>', 'TinyTask server URL')
    .option('--default-agent <agent>', 'Default agent name')
    .action(async (name: string, options) => {
      try {
        const currentConfig = await loadConfig({});
        
        if (!currentConfig.profiles) {
          currentConfig.profiles = {};
        }
        
        currentConfig.profiles[name] = {
          url: options.url,
          defaultAgent: options.defaultAgent,
        };
        
        await saveConfig(currentConfig);
        console.log(chalk.green(`✓ Profile '${name}' added`));
      } catch (error) {
        console.error(chalk.red('Error adding profile:'), error);
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
        console.error(chalk.red('Error listing profiles:'), error);
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
        console.error(chalk.red('Error setting profile:'), error);
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
        console.error(chalk.red('Error removing profile:'), error);
        process.exit(1);
      }
    });
}
```

## Testing Requirements
```typescript
// tests/unit/config/loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, saveConfig, initConfig } from '../../../src/config/loader.js';
import { DEFAULT_CONFIG } from '../../../src/config/schema.js';

describe('Configuration Loader', () => {
  it('should load default config when no file exists', async () => {
    const config = await loadConfig({});
    expect(config.outputFormat).toBe('table');
    expect(config.colorOutput).toBe(true);
  });
  
  it('should apply CLI options as overrides', async () => {
    const config = await loadConfig({
      url: 'http://custom:3000/mcp',
      outputFormat: 'json',
    });
    
    expect(config.url).toBe('http://custom:3000/mcp');
    expect(config.outputFormat).toBe('json');
  });
  
  it('should load profile when specified', async () => {
    // Test with mock config file
  });
  
  it('should apply environment variable overrides', async () => {
    process.env.TINYTASK_URL = 'http://env:3000/mcp';
    const config = await loadConfig({});
    expect(config.url).toBe('http://env:3000/mcp');
    delete process.env.TINYTASK_URL;
  });
});
```

## Example Configuration Files

### JSON format
```json
// ~/.tinytaskrc
{
  "url": "http://localhost:3000/mcp",
  "defaultAgent": "myname",
  "outputFormat": "table",
  "colorOutput": true,
  "profiles": {
    "dev": {
      "url": "http://localhost:3000/mcp",
      "defaultAgent": "dev-agent"
    },
    "staging": {
      "url": "https://staging.example.com/mcp",
      "defaultAgent": "staging-agent"
    },
    "prod": {
      "url": "https://prod.example.com/mcp",
      "defaultAgent": "prod-agent"
    }
  },
  "activeProfile": "dev"
}
```

## Configuration Precedence (lowest to highest)
1. Default values
2. Config file (`~/.tinytaskrc`)
3. Active profile in config file
4. Environment variables
5. CLI options

## Definition of Done
- [ ] Configuration schema defined and validated
- [ ] Configuration loader implemented with all sources
- [ ] All config commands work correctly
- [ ] Profile management implemented
- [ ] Configuration precedence works as specified
- [ ] Unit tests pass
- [ ] Configuration validation provides helpful errors
- [ ] Documentation for configuration options

## Dependencies
- Story 1: Project Setup

## Estimated Effort
4-6 hours

## Notes
- Configuration should fail fast with clear error messages
- Invalid configuration should show which file/source caused the issue
- Consider providing config migration tool for future breaking changes
