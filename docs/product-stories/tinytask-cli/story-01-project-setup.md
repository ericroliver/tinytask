# Story 1: TinyTask CLI - Project Setup

## Overview
Initialize the TinyTask CLI project with TypeScript, build tooling, and basic command structure.

## User Story
As a developer, I want a well-structured CLI project foundation so that I can build reliable command-line tools that integrate with TinyTask.

## Acceptance Criteria
- [ ] New `tinytask-cli` package initialized with TypeScript
- [ ] Build system configured with tsup
- [ ] CLI entry point created with proper shebang
- [ ] Commander.js integrated for command parsing
- [ ] Basic `--version` and `--help` commands work
- [ ] ESLint and Prettier configured
- [ ] Vitest configured for testing
- [ ] Package can be installed locally via `npm link`
- [ ] Basic README with installation instructions

## Technical Details

### Project Structure
```
tinytask-cli/
├── src/
│   ├── index.ts              # Entry point with shebang
│   ├── cli.ts                # Main CLI setup
│   └── version.ts            # Version constant
├── tests/
│   └── cli.test.ts           # Basic CLI tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── .eslintrc.json
├── .prettierrc
└── README.md
```

### Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.2",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.3",
    "cosmiconfig": "^9.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Entry Point Implementation
```typescript
// src/index.ts
#!/usr/bin/env node

import { createCLI } from './cli.js';
import { handleError } from './utils/errors.js';

async function main() {
  try {
    const cli = createCLI();
    await cli.parseAsync(process.argv);
  } catch (error) {
    handleError(error as Error);
  }
}

main();
```

### Basic CLI Setup
```typescript
// src/cli.ts
import { Command } from 'commander';
import { version } from './version.js';

export function createCLI(): Command {
  const program = new Command();
  
  program
    .name('tinytask')
    .description('TinyTask CLI - Command-line task management')
    .version(version);
  
  // Global options
  program
    .option('--url <url>', 'TinyTask server URL')
    .option('--json', 'Output as JSON')
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Enable verbose logging');
  
  // Placeholder command for testing
  program
    .command('ping')
    .description('Test CLI installation')
    .action(() => {
      console.log('TinyTask CLI is working!');
    });
  
  return program;
}
```

### Build Configuration
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
});
```

### Package Configuration
```json
{
  "name": "tinytask-cli",
  "version": "0.1.0",
  "description": "Command-line client for TinyTask MCP server",
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "tinytask": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["tinytask", "cli", "mcp", "task-management"],
  "license": "ISC"
}
```

## Testing Requirements
```typescript
// tests/cli.test.ts
import { describe, it, expect } from 'vitest';
import { createCLI } from '../src/cli.js';

describe('CLI', () => {
  it('should create CLI program', () => {
    const cli = createCLI();
    expect(cli.name()).toBe('tinytask');
  });
  
  it('should have version command', () => {
    const cli = createCLI();
    const commands = cli.commands.map(c => c.name());
    expect(commands).toContain('version');
  });
  
  it('should have help command', () => {
    const cli = createCLI();
    const commands = cli.commands.map(c => c.name());
    expect(commands).toContain('help');
  });
});
```

## Installation & Verification
```bash
# Create project
mkdir tinytask-cli
cd tinytask-cli
npm init -y

# Install dependencies
npm install

# Build
npm run build

# Link for local testing
npm link

# Test
tinytask --version
tinytask --help
tinytask ping
```

## Definition of Done
- [ ] Project builds successfully without errors
- [ ] `npm run build` produces dist/index.js with correct shebang
- [ ] `npm link` allows global installation
- [ ] `tinytask --version` shows version number
- [ ] `tinytask --help` shows help text
- [ ] `tinytask ping` executes successfully
- [ ] All tests pass
- [ ] Linting passes
- [ ] Code is formatted

## Dependencies
None - this is the foundation story.

## Estimated Effort
1-2 hours

## Notes
- Follow same project structure conventions as tinytask-mcp
- Use TypeScript strict mode
- Ensure proper ESM configuration (type: "module")
- Test global installation early to catch path/permission issues
