# TinyTask CLI

Command-line client for TinyTask MCP server.

## Installation

### Local Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Link for global usage
npm link

# Test installation
tinytask --version
tinytask --help
```

## Building Standalone Executables

TinyTask CLI can be packaged into standalone executables for distribution without requiring Node.js installation.

### Package for All Platforms

```bash
npm run package
```

This will generate platform-specific executables in `dist/binaries/`:
- `tinytask-linux` - Linux x64
- `tinytask-macos` - macOS x64
- `tinytask-win.exe` - Windows x64

### Custom Packaging

You can also run pkg directly with custom targets:

```bash
# Build only for specific platform
npx pkg . --targets node18-linux-x64 --output dist/binaries/tinytask

# Build for different Node.js version
npx pkg . --targets node20-macos-x64,node20-win-x64 --output dist/binaries/tinytask
```

### Distribution

The generated executables are self-contained and can be distributed as-is. Users can run them directly without installing Node.js:

```bash
# Linux/macOS
./tinytask-macos --version
./tinytask-macos task list

# Windows
tinytask-win.exe --version
tinytask-win.exe task list
```

### Package Configuration

The packaging configuration is defined in [`package.json`](package.json:27):
- **Entry Point**: `dist/index.js` (built from TypeScript sources)
- **Targets**: Node.js 18 for Linux x64, macOS x64, Windows x64
- **Assets**: All JavaScript files in `dist/` are bundled
- **Output**: `dist/binaries/` directory

## Configuration

TinyTask CLI supports multiple configuration sources with the following precedence (highest to lowest):

1. CLI flags (e.g., `--url`)
2. Environment variables (e.g., `TINYTASK_URL`)
3. Active profile in config file
4. Config file defaults
5. Built-in defaults

### Initialize Configuration

```bash
tinytask config init
```

### Configuration File

Create `~/.tinytaskrc` or use other supported formats (`.tinytask.json`, `package.json#tinytask`).

Example configuration:

```json
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
    "prod": {
      "url": "https://prod.example.com/mcp",
      "defaultAgent": "prod-agent"
    }
  },
  "activeProfile": "dev"
}
```

### Environment Variables

- `TINYTASK_URL` - Server URL
- `TINYTASK_AGENT` - Default agent name
- `TINYTASK_FORMAT` - Output format (table, json, csv, compact)
- `TINYTASK_NO_COLOR` - Disable colors (set to 'true')
- `TINYTASK_TIMEOUT` - Connection timeout in milliseconds

## Usage

### Global Options

All commands support these global options:

- `--url <url>` - TinyTask server URL
- `--json` - Output as JSON
- `--no-color` - Disable colored output
- `--verbose` - Enable verbose logging
- `--profile <profile>` - Use specific configuration profile

### Task Commands

#### Create Task

```bash
tinytask task create "Task title"
tinytask task create "Task title" -d "Description" -a alice -p 5
tinytask task create "Task title" --assigned-to bob --priority 8 --tags "bug,urgent"
```

#### Get Task

```bash
tinytask task get 1
tinytask task get 1 --json
```

#### Update Task

```bash
tinytask task update 1 --status working
tinytask task update 1 --title "New title" --priority 9
tinytask task update 1 --assigned-to charlie --tags "feature,ui"
```

#### List Tasks

```bash
tinytask task list
tinytask task ls
tinytask task list --assigned-to alice
tinytask task list --status working --limit 10
tinytask task list --include-archived
```

#### Delete Task

```bash
tinytask task delete 1
tinytask task delete 1 --yes
```

#### Archive Task

```bash
tinytask task archive 1
```

### Queue and Workflow Commands

#### View Queue

```bash
tinytask queue alice
tinytask queue --mine
tinytask q alice
```

#### Signup for Task

```bash
tinytask signup
tinytask signup --agent alice
```

#### Move Task

```bash
tinytask move 1 bob
tinytask move 1 bob --from alice
tinytask move 1 bob --comment "Transferring to Bob"
```

### Comment Commands

#### Add Comment

```bash
tinytask comment add 1 "This is a comment"
tinytask c add 1 "Comment text" --created-by alice
```

#### List Comments

```bash
tinytask comment list 1
tinytask c list 1 --json
```

#### Update Comment

```bash
tinytask comment update 10 "Updated comment text"
```

#### Delete Comment

```bash
tinytask comment delete 10
tinytask c delete 10 --yes
```

### Link Commands

#### Add Link

```bash
tinytask link add 1 "https://github.com/user/repo/pull/123"
tinytask l add 1 "https://docs.example.com" -d "Documentation"
```

#### List Links

```bash
tinytask link list 1
tinytask l list 1 --json
```

#### Update Link

```bash
tinytask link update 5 --url "https://new-url.com"
tinytask l update 5 --description "New description"
```

#### Delete Link

```bash
tinytask link delete 5
tinytask l delete 5 --yes
```

### Configuration Commands

#### Initialize Config

```bash
tinytask config init
tinytask config init --force
```

#### Show Config

```bash
tinytask config show
```

#### Set Config Value

```bash
tinytask config set url http://localhost:3000/mcp
tinytask config set defaultAgent alice
tinytask config set outputFormat json
```

#### Get Config Value

```bash
tinytask config get url
tinytask config get defaultAgent
```

#### Profile Management

```bash
# Add profile
tinytask config profile add staging --url https://staging.example.com/mcp --default-agent staging-bot

# List profiles
tinytask config profile list

# Use profile
tinytask config profile use staging

# Remove profile
tinytask config profile remove staging
```

## Output Formats

### Table Format (Default)

Human-readable table output with colors:

```bash
tinytask task list
```

### JSON Format

Machine-parseable JSON:

```bash
tinytask task list --json
tinytask task get 1 --json
```

### CSV Format

Spreadsheet-compatible CSV:

```bash
tinytask task list --output csv > tasks.csv
```

### Compact Format

One-line summary per task:

```bash
tinytask task list --output compact
```

## Examples

### Complete Workflow

```bash
# Create a new task
tinytask create "Implement feature X" -d "Add the new feature" -a alice -p 7

# View your queue
tinytask queue alice

# Claim next task
tinytask signup --agent alice

# Update task status
tinytask update 1 --status working

# Add a comment
tinytask comment add 1 "Started working on this"

# Add a link
tinytask link add 1 "https://github.com/org/repo/pull/42"

# Complete the task
tinytask update 1 --status complete

# Archive completed task
tinytask archive 1
```

### Scripting Example

```bash
#!/bin/bash
# Get all idle tasks assigned to alice in JSON format
TASKS=$(tinytask list --assigned-to alice --status idle --json)

# Process each task
echo "$TASKS" | jq -r '.[] | .id' | while read task_id; do
  echo "Processing task $task_id"
  tinytask comment add "$task_id" "Auto-processed by script"
done
```

## Development

```bash
# Run in watch mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Clean build directory
npm run clean
```

## Project Structure

```
tinytask-cli/
├── src/
│   ├── index.ts              # Entry point with shebang
│   ├── cli.ts                # Main CLI setup
│   ├── version.ts            # Version constant
│   ├── client/
│   │   ├── mcp-client.ts     # MCP client wrapper
│   │   └── connection.ts     # Connection singleton
│   ├── commands/
│   │   ├── config.ts         # Config commands
│   │   ├── queue.ts          # Queue command
│   │   ├── signup.ts         # Signup command
│   │   ├── move.ts           # Move command
│   │   ├── comment.ts        # Comment commands
│   │   ├── link.ts           # Link commands
│   │   └── task/
│   │       ├── index.ts      # Task command registration
│   │       ├── create.ts     # Create task
│   │       ├── get.ts        # Get task
│   │       ├── update.ts     # Update task
│   │       ├── delete.ts     # Delete task
│   │       ├── list.ts       # List tasks
│   │       └── archive.ts    # Archive task
│   ├── config/
│   │   ├── schema.ts         # Zod schemas
│   │   └── loader.ts         # Config loading logic
│   ├── formatters/
│   │   ├── types.ts          # Formatter interface
│   │   ├── table.ts          # Table formatter
│   │   ├── json.ts           # JSON formatter
│   │   ├── csv.ts            # CSV formatter
│   │   ├── compact.ts        # Compact formatter
│   │   └── index.ts          # Formatter factory
│   └── utils/
│       └── errors.ts         # Error handling
├── tests/
│   ├── cli.test.ts           # CLI tests
│   └── unit/
│       ├── client/
│       ├── config/
│       └── formatters/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## License

ISC
