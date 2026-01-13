import { cosmiconfig } from 'cosmiconfig';
import { ConfigSchema, Config, DEFAULT_CONFIG } from './schema.js';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

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
    config.outputFormat = process.env.TINYTASK_FORMAT as 'table' | 'json' | 'csv' | 'compact';
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
    config.outputFormat = options.outputFormat as 'table' | 'json' | 'csv' | 'compact';
  }

  // Validate final configuration
  return ConfigSchema.parse(config);
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.tinytaskrc.json');
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
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
