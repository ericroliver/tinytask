# CLI Command Reference

> **Prerequisite:** Read [00-Foundation.md](./00-Foundation.md) for core concepts, data model, roles, and queue rules.
> **Scope:** Complete syntax reference for every `tinytask` CLI command, including options, aliases, examples, and output formats.

---

## 1. Overview

The `tinytask` CLI is a command-line interface for the TinyTask task management system. It communicates with a TinyTask MCP server over HTTP and provides commands for creating, updating, listing, and managing tasks, subtasks, queues, comments, links, and configuration.

### 1.1 Installation & Setup

The CLI binary is typically available at `/enigma-home/bin/tinytask` and should be on your `PATH`.

#### First-Time Initialization

```bash
tinytask config init
```

This creates a configuration file at `~/.tinytaskrc.json` with default settings. Use `--force` to overwrite an existing config:

```bash
tinytask config init --force
```

#### Set Server URL

```bash
tinytask config set url http://your-server:3000/mcp
```

#### Set Default Agent

```bash
tinytask config set defaultAgent tko-sword
```

### 1.2 Global Options

All commands accept these global options. They can be placed before or after the subcommand.

| Option | Description |
|---|---|
| `--url <url>` | Override the TinyTask server URL for this invocation |
| `--json` | Output results as JSON (shorthand for `--output json`) |
| `--no-color` | Disable colored output |
| `--verbose` | Enable verbose logging |
| `--profile <profile>` | Use a specific configuration profile |

**Example:**

```bash
tinytask --url http://staging:3000/mcp --json task list
tinytask task list --profile staging
```

### 1.3 Environment Variables

The CLI reads these environment variables. CLI options take priority over environment variables, which take priority over config file values.

| Variable | Description |
|---|---|
| `TINYTASK_URL` | Server URL |
| `TINYTASK_AGENT` | Default agent name |
| `TINYTASK_FORMAT` | Output format (`table`, `json`, `csv`, `compact`) |
| `TINYTASK_NO_COLOR` | Set to `true` to disable color |
| `TINYTASK_TIMEOUT` | Request timeout in milliseconds |

### 1.4 Configuration File

The config file is at `~/.tinytaskrc.json`. Structure:

```json
{
  "url": "http://localhost:3000/mcp",
  "defaultAgent": "tko-sword",
  "outputFormat": "table",
  "colorOutput": true,
  "timeout": 30000,
  "profiles": {
    "staging": {
      "url": "https://staging.example.com/mcp",
      "defaultAgent": "staging-bot"
    }
  },
  "activeProfile": "staging"
}
```

**Precedence (highest to lowest):**

1. CLI flags (`--url`, `--json`, etc.)
2. Environment variables (`TINYTASK_URL`, etc.)
3. Active profile values
4. Base config file values
5. Built-in defaults

---

## 2. Task Commands

Command group: `tinytask task` (alias: `tinytask t`)

### 2.1 Create Task

```bash
tinytask task create <title>
```

**Options:**

| Option | Short | Type | Default | Description |
|---|---|---|---|---|
| `--description <text>` | `-d` | string | — | Task description |
| `--assigned-to <agent>` | `-a` | string | `defaultAgent` from config | Agent to assign the task to |
| `--created-by <agent>` | `-c` | string | — | Agent who created the task |
| `--priority <number>` | `-p` | integer | `0` | Task priority |
| `--tags <tags>` | `-t` | string | — | Comma-separated tag list |
| `--parent <id>` | — | integer | — | Parent task ID (creates as subtask) |
| `--queue <name>` | `-q` | string | — | Queue to assign the task to |

**Examples:**

```bash
# Create a basic task
tinytask task create "Implement pagination on task list endpoint"

# Create with full options
tinytask task create "Fix login redirect bug" \
  -d "Users are redirected to dashboard even when unauthenticated" \
  --assigned-to tko-sword \
  --priority 8 \
  --tags "bug,auth,api" \
  --queue ready-for-development

# Create as subtask
tinytask task create "Write unit tests" --parent 5 --assigned-to tko-sword

# Create with creator specified
tinytask task create "Research SQLite WAL mode" \
  -d "Investigate performance impact of WAL mode" \
  --created-by tko-shield \
  --assigned-to tko-sword \
  --tags "research,database"
```

### 2.2 Get Task

```bash
tinytask task get <id>
```

Retrieves a single task by its numeric ID. In table mode, displays the task with verbose detail.

**Examples:**

```bash
tinytask task get 5
tinytask task get 5 --json
```

### 2.3 Update Task

```bash
tinytask task update <id> [options]
```

Updates one or more fields on an existing task. Only specified options are applied.

**Options:**

| Option | Short | Type | Description |
|---|---|---|---|
| `--title <text>` | `-t` | string | Update the task title |
| `--description <text>` | `-d` | string | Update the task description |
| `--status <status>` | `-s` | string | Update status (`idle`, `working`, `complete`) |
| `--assigned-to <agent>` | `-a` | string | Update the assignee |
| `--priority <number>` | `-p` | integer | Update priority |
| `--tags <tags>` | — | string | Update tags (comma-separated, replaces existing) |
| `--parent <id>` | — | string | Change parent task ID. Use `null` to make top-level. |
| `--queue <name>` | `-q` | string | Change queue assignment |

**Examples:**

```bash
# Start working on a task
tinytask task update 5 --status working

# Reassign and change queue
tinytask task update 5 --assigned-to tko-shield --queue ready-for-testing

# Update priority and tags
tinytask task update 5 --priority 9 --tags "urgent,api"

# Make a subtask top-level
tinytask task update 10 --parent null

# Change parent
tinytask task update 10 --parent 5

# Finish work and hand off
tinytask task update 5 --status idle --queue ready-for-qa --assigned-to tko-shield
```

### 2.4 List Tasks

```bash
tinytask task list [options]
```

**Aliases:** `tinytask task ls`

**Options:**

| Option | Short | Type | Description |
|---|---|---|---|
| `--assigned-to <agent>` | `-a` | string | Filter by assignee |
| `--status <status>` | `-s` | string | Filter by status (`idle`, `working`, `complete`) |
| `--queue <name>` | `-q` | string | Filter by queue name |
| `--parent <id>` | — | integer | Filter by parent task ID |
| `--exclude-subtasks` | — | flag | Exclude subtasks from results |
| `--include-archived` | — | flag | Include archived tasks |
| `--limit <number>` | — | integer | Limit number of results |
| `--offset <number>` | — | integer | Offset for pagination |

**Examples:**

```bash
# List all tasks
tinytask task list

# List tasks assigned to an agent
tinytask task list --assigned-to tko-sword

# Filter by status
tinytask task list --status working

# Filter by queue
tinytask task list --queue ready-for-development

# List top-level tasks only (exclude subtasks)
tinytask task list --exclude-subtasks

# Include archived tasks
tinytask task list --include-archived

# Pagination
tinytask task list --limit 10 --offset 20

# Combined filters with JSON output
tinytask task list --assigned-to tko-sword --status idle --json
```

### 2.5 Archive Task

```bash
tinytask task archive <id>
```

Archives a task (soft-delete). The task is hidden from default list views but remains in the database with an `archived_at` timestamp.

**Examples:**

```bash
tinytask task archive 5
tinytask task archive 5 --json
```

### 2.6 Delete Task

```bash
tinytask task delete <id> [options]
```

Permanently deletes a task. Prompts for confirmation unless `--yes` is provided.

**Options:**

| Option | Short | Description |
|---|---|---|
| `--yes` | `-y` | Skip confirmation prompt |

**Examples:**

```bash
# Interactive (prompts for confirmation)
tinytask task delete 5

# Skip confirmation
tinytask task delete 5 --yes
```

---

## 3. Subtask Commands

Command group: `tinytask subtask` (alias: `tinytask st`)

### 3.1 Create Subtask

```bash
tinytask subtask create <parent-id> <title> [options]
```

Creates a new subtask under the specified parent task. The subtask inherits the parent's queue unless `--queue` is specified.

**Options:**

| Option | Short | Type | Description |
|---|---|---|---|
| `--description <text>` | `-d` | string | Subtask description |
| `--assigned-to <agent>` | `-a` | string | Agent to assign the subtask to (defaults to `defaultAgent`) |
| `--priority <number>` | `-p` | integer | Priority (default: `0`) |
| `--tags <tags>` | `-t` | string | Comma-separated tags |
| `--queue <name>` | `-q` | string | Override queue (defaults to parent's queue) |

**Examples:**

```bash
# Basic subtask creation
tinytask subtask create 5 "Design database schema"

# Full options
tinytask subtask create 5 "Write integration tests" \
  -d "Integration tests for the new endpoint" \
  -a tko-sword \
  -p 7 \
  --tags "testing,api" \
  --queue ready-for-development
```

### 3.2 List Subtasks

```bash
tinytask subtask list <parent-id> [options]
```

**Aliases:** `tinytask subtask ls <parent-id>`

**Options:**

| Option | Short | Description |
|---|---|---|
| `--recursive` | `-r` | Include all nested subtasks (descendants at every level) |
| `--include-archived` | — | Include archived subtasks |

**Examples:**

```bash
# List direct subtasks
tinytask subtask list 5

# List all nested subtasks recursively
tinytask subtask list 5 --recursive

# Include archived subtasks
tinytask subtask list 5 --recursive --include-archived
```

### 3.3 Task Tree

```bash
tinytask subtask tree <task-id> [options]
```

Displays a task and all its descendants as a hierarchical tree.

**Options:**

| Option | Short | Description |
|---|---|---|
| `--recursive` | `-r` | Show complete subtask tree (all levels) |

**Example Output:**

```
Task #5: User Authentication [dev] (alice)
├── Task #10: Design schema (bob)
│   └── Task #15: Create ERD (alice)
├── Task #11: Write tests (charlie)
└── Task #12: Deploy (unassigned)
```

**Examples:**

```bash
tinytask subtask tree 5
tinytask subtask tree 5 --recursive
```

### 3.4 Move Subtask

```bash
tinytask subtask move <subtask-id> [new-parent-id]
```

Moves a subtask to a different parent, or makes it a top-level task if no new parent is specified.

**Examples:**

```bash
# Move to a different parent
tinytask subtask move 10 5

# Make top-level (remove parent relationship)
tinytask subtask move 10
```

---

## 4. Queue Commands

Command group: `tinytask queue` (alias: `tinytask q`)

### 4.1 View Agent Queue

```bash
tinytask queue view [agent] [options]
```

Displays all tasks assigned to an agent, organized by queue.

**Options:**

| Option | Short | Description |
|---|---|---|
| `--status <status>` | `-s` | Filter by status |
| `--mine` | — | View your own queue (uses `defaultAgent` from config) |

**Examples:**

```bash
# View a specific agent's queue
tinytask queue view tko-sword

# View your own queue (uses defaultAgent)
tinytask queue view --mine

# Filter by status
tinytask queue view tko-sword --status idle
```

### 4.2 List All Queues

```bash
tinytask queue list
```

**Aliases:** `tinytask queue ls`

Lists all queue names known to the server.

**Example:**

```bash
tinytask queue list
tinytask queue ls --json
```

### 4.3 Queue Statistics

```bash
tinytask queue stats <queue-name>
```

Displays statistics for a specific queue, including task counts by status, assignment breakdown, and assigned agents.

**Example Output (table format):**

```
Queue: dev
─────────────────────────
Total Tasks:     12
  Idle:          5
  Working:       4
  Complete:      3

Assignment:
  Assigned:      10
  Unassigned:    2

Agents:          alice, bob, charlie
```

**Examples:**

```bash
tinytask queue stats ready-for-development
tinytask queue stats ready-for-qa --json
```

### 4.4 View Tasks in Queue

```bash
tinytask queue tasks <queue-name> [options]
```

Lists all tasks in a specific queue with optional filters.

**Options:**

| Option | Short | Type | Description |
|---|---|---|---|
| `--status <status>` | `-s` | string | Filter by status (`idle`, `working`, `complete`) |
| `--assigned-to <agent>` | `-a` | string | Filter by assigned agent |
| `--exclude-subtasks` | — | flag | Exclude subtasks from results |
| `--include-archived` | — | flag | Include archived tasks |
| `--limit <number>` | `-l` | integer | Limit number of results |
| `--offset <number>` | `-o` | integer | Offset for pagination |

**Examples:**

```bash
# All tasks in a queue
tinytask queue tasks ready-for-development

# Filter by status
tinytask queue tasks ready-for-qa --status idle

# Filter by assignee
tinytask queue tasks ready-for-development --assigned-to tko-sword

# Exclude subtasks
tinytask queue tasks ready-for-development --exclude-subtasks

# Pagination
tinytask queue tasks ready-for-development --limit 5 --offset 10
```

### 4.5 Add Task to Queue

```bash
tinytask queue add <task-id> <queue-name>
```

Assigns a task to a queue. If the task is already in a different queue, it will be moved.

**Example:**

```bash
tinytask queue add 5 ready-for-development
```

### 4.6 Remove Task from Queue

```bash
tinytask queue remove <task-id>
```

Removes a task from its current queue. The task remains in the system but is unassigned to any queue.

**Example:**

```bash
tinytask queue remove 5
```

### 4.7 Move Task Between Queues

```bash
tinytask queue move <task-id> <new-queue>
```

Moves a task from its current queue to a new queue. This is the primary command for queue transitions (e.g., `ready-for-development` → `ready-for-qa`).

**Example:**

```bash
tinytask queue move 5 ready-for-qa
tinytask queue move 5 ready-for-testing
```

### 4.8 Clear Queue

```bash
tinytask queue clear <queue-name> [options]
```

Removes all tasks from a queue. Requires `--yes` to confirm; without it, displays a warning and exits without modifying.

**Options:**

| Option | Short | Description |
|---|---|---|
| `--yes` | `-y` | Skip confirmation and clear the queue |

**Examples:**

```bash
# Without --yes: shows warning, does not clear
tinytask queue clear blocked

# With --yes: clears all tasks from the queue
tinytask queue clear blocked --yes
```

---

## 5. Agent Workflow Commands

### 5.1 Signup for Task

```bash
tinytask signup [options]
```

Claims the next available idle task from the agent's queue. The task's status is set to `working` and it is assigned to the requesting agent. Returns `null` / "No idle tasks available" if no tasks are waiting.

**Options:**

| Option | Short | Description |
|---|---|---|
| `--agent <name>` | `-a` | Agent name (defaults to `defaultAgent` from config) |

**Examples:**

```bash
# Signup using defaultAgent from config
tinytask signup

# Specify agent explicitly
tinytask signup --agent tko-sword

# JSON output
tinytask signup --json
```

### 5.2 Move Task Between Agents

```bash
tinytask move <id> <to-agent> [options]
```

Transfers a task from one agent to another. Automatically adds a comment to the task documenting the transfer.

**Options:**

| Option | Short | Type | Default | Description |
|---|---|---|---|---|
| `--from <agent>` | `-f` | string | `defaultAgent` from config | Current agent (source) |
| `--comment <text>` | `-m` | string | `"Task transferred"` | Handoff comment added to the task |

**Examples:**

```bash
# Transfer to another agent
tinytask move 5 tko-shield

# Specify source agent and custom comment
tinytask move 5 tko-shield --from tko-sword --comment "Transferring for QA review"

# Using default agent from config
tinytask move 5 tko-shield -m "Handing off for testing"
```

---

## 6. Comment Commands

Command group: `tinytask comment` (alias: `tinytask c`)

### 6.1 Add Comment

```bash
tinytask comment add <task-id> <content> [options]
```

**Aliases:** `tinytask c add <task-id> <content>`

**Options:**

| Option | Description |
|---|---|
| `--created-by <agent>` | Comment author (defaults to `defaultAgent` from config) |

**Examples:**

```bash
# Add a comment (uses defaultAgent as author)
tinytask comment add 5 "Started working on this task"

# Specify author explicitly
tinytask comment add 5 "Found the root cause: missing null check" --created-by tko-sword

# Add a handoff comment
tinytask c add 5 "Work complete, handing off to QA for verification" --created-by tko-sword
```

### 6.2 List Comments

```bash
tinytask comment list <task-id>
```

**Aliases:** `tinytask c list <task-id>`

**Examples:**

```bash
tinytask comment list 5
tinytask c list 5 --json
```

### 6.3 Update Comment

```bash
tinytask comment update <comment-id> <content>
```

**Examples:**

```bash
tinytask comment update 10 "Updated: the fix also requires a migration script"
```

### 6.4 Delete Comment

```bash
tinytask comment delete <comment-id> [options]
```

**Aliases:** `tinytask c delete <comment-id>`

**Options:**

| Option | Short | Description |
|---|---|---|
| `--yes` | `-y` | Skip confirmation (note: the current implementation does not prompt; the flag is accepted for future use) |

**Examples:**

```bash
tinytask comment delete 10
tinytask c delete 10 --yes
```

---

## 7. Link Commands

Command group: `tinytask link` (alias: `tinytask l`)

### 7.1 Add Link

```bash
tinytask link add <task-id> <url> [options]
```

**Aliases:** `tinytask l add <task-id> <url>`

**Options:**

| Option | Short | Description |
|---|---|---|
| `--description <text>` | `-d` | Link description |
| `--created-by <agent>` | — | Link author (defaults to `defaultAgent` from config) |

**Examples:**

```bash
# Add a PR link
tinytask link add 5 "https://github.com/org/repo/pull/123" \
  -d "Fixes the pagination bug" \
  --created-by tko-sword

# Add a documentation link
tinytask link add 5 "https://docs.example.com/api-spec" -d "API specification"
```

### 7.2 List Links

```bash
tinytask link list <task-id>
```

**Aliases:** `tinytask l list <task-id>`

**Examples:**

```bash
tinytask link list 5
tinytask l list 5 --json
```

### 7.3 Update Link

```bash
tinytask link update <link-id> [options]
```

**Options:**

| Option | Description |
|---|---|
| `--url <url>` | New URL |
| `--description <text>` | New description |

**Examples:**

```bash
tinytask link update 5 --url "https://github.com/org/repo/pull/124"
tinytask link update 5 --description "Updated PR link"
```

### 7.4 Delete Link

```bash
tinytask link delete <link-id> [options]
```

**Aliases:** `tinytask l delete <link-id>`

**Options:**

| Option | Short | Description |
|---|---|---|
| `--yes` | `-y` | Skip confirmation (accepted for compatibility; the current implementation deletes immediately) |

**Examples:**

```bash
tinytask link delete 5
tinytask l delete 5 --yes
```

---

## 8. Configuration Commands

Command group: `tinytask config`

### 8.1 Initialize Config

```bash
tinytask config init [options]
```

Creates a new configuration file at `~/.tinytaskrc.json` with default values.

**Options:**

| Option | Short | Description |
|---|---|---|
| `--force` | `-f` | Overwrite an existing configuration file |

**Examples:**

```bash
tinytask config init
tinytask config init --force
```

### 8.2 Show Config

```bash
tinytask config show
```

Displays the current configuration, including the config file path.

**Example:**

```bash
tinytask config show
```

### 8.3 Set Config Value

```bash
tinytask config set <key> <value>
```

Sets a configuration key to a value. Common keys:

| Key | Description |
|---|---|
| `url` | Server URL |
| `defaultAgent` | Default agent name |
| `outputFormat` | Output format (`table`, `json`, `csv`, `compact`) |
| `colorOutput` | Enable/disable color (`true`/`false`) |
| `timeout` | Request timeout in milliseconds |

**Examples:**

```bash
tinytask config set url http://localhost:3000/mcp
tinytask config set defaultAgent tko-sword
tinytask config set outputFormat json
tinytask config set colorOutput false
```

### 8.4 Get Config Value

```bash
tinytask config get <key>
```

**Examples:**

```bash
tinytask config get url
tinytask config get defaultAgent
```

### 8.5 Profile Management

Command group: `tinytask config profile`

Profiles allow switching between different TinyTask server environments (e.g., local, staging, production).

#### Add Profile

```bash
tinytask config profile add [options]
```

**Required Options:**

| Option | Short | Description |
|---|---|---|
| `--name <name>` | `-n` | Profile name |
| `--server-url <url>` | `-u` | TinyTask server URL |

**Optional Options:**

| Option | Description |
|---|---|
| `--default-agent <agent>` | Default agent name for this profile |

**Example:**

```bash
tinytask config profile add \
  --name staging \
  --server-url https://staging.example.com/mcp \
  --default-agent staging-bot
```

#### List Profiles

```bash
tinytask config profile list
```

Lists all configured profiles, marking the active one.

**Example:**

```bash
tinytask config profile list
```

#### Use Profile

```bash
tinytask config profile use <name>
```

Sets the active profile. All subsequent commands will use this profile's server URL and default agent.

**Example:**

```bash
tinytask config profile use staging
```

#### Remove Profile

```bash
tinytask config profile remove <name>
```

Removes a profile from configuration. If the removed profile was active, the active profile is unset.

**Example:**

```bash
tinytask config profile remove staging
```

---

## 9. Utility Commands

### 9.1 Ping

```bash
tinytask ping
```

Tests that the CLI is installed and working. Prints "TinyTask CLI is working!" — does not connect to a server.

**Example:**

```bash
tinytask ping
```

### 9.2 Version

```bash
tinytask --version
tinytask -V
```

Prints the CLI version.

---

## 10. Output Formats

The CLI supports multiple output formats. Use `--json` as a global flag, or set the format permanently with `tinytask config set outputFormat <format>`.

### 10.1 Table (Default)

Human-readable table output with colors. Best for interactive terminal use.

```bash
tinytask task list
tinytask task get 5
```

### 10.2 JSON

Machine-parseable JSON. Best for scripting and piping to tools like `jq`.

```bash
tinytask task list --json
tinytask task get 5 --json
tinytask task list --json | jq -r '.[] | .id'
```

### 10.3 CSV

Spreadsheet-compatible CSV output.

```bash
tinytask config set outputFormat csv
tinytask task list
```

To pipe to a file:

```bash
tinytask task list > tasks.csv
```

> **Note:** CSV format is available via config (`outputFormat: "csv"`) or the `TINYTASK_FORMAT=csv` environment variable. There is no `--csv` CLI flag. Use `--json` for one-off scripting.

### 10.4 Compact

One-line summary per task. Useful for quick scanning of many tasks.

```bash
tinytask config set outputFormat compact
tinytask task list
```

> **Note:** Compact format is available via config (`outputFormat: "compact"`) or the `TINYTASK_FORMAT=compact` environment variable. There is no `--compact` CLI flag.

### 10.5 Tree

Hierarchical tree display for subtask structures. Used automatically by `tinytask subtask tree`.

```bash
tinytask subtask tree 5
tinytask subtask tree 5 --recursive
```

### 10.6 Stats

Formatted statistics display for queue metrics. Used automatically by `tinytask queue stats`.

```bash
tinytask queue stats ready-for-development
```

---

## 11. Common Workflows

### 11.1 Complete Development Cycle

```bash
# 1. Create a task
tinytask task create "Implement feature X" \
  -d "Add new feature with API endpoint" \
  -a tko-sword \
  -p 7 \
  --tags "feature,api" \
  --queue ready-for-development

# 2. Pick up the task
tinytask signup --agent tko-sword

# 3. Mark as working
tinytask task update 5 --status working

# 4. Add progress comment
tinytask comment add 5 "Started implementation. API design in progress."

# 5. Add a PR link
tinytask link add 5 "https://github.com/org/repo/pull/42" -d "Implementation PR"

# 6. Finish work — set idle and hand off to QA
tinytask task update 5 --status idle
tinytask queue move 5 ready-for-qa
tinytask task update 5 --assigned-to tko-shield
tinytask comment add 5 "Implementation complete. Ready for QA review."
```

### 11.2 Defect Fix Cycle

```bash
# 1. Tester files a defect
tinytask task create "Login fails with special characters in password" \
  -d "Passwords containing <, >, & cause 500 error" \
  -a tko-sword \
  -p 9 \
  --tags "bug,auth,urgent" \
  --queue ready-for-development

# 2. Developer picks up, fixes, and hands back
tinytask signup --agent tko-sword
tinytask task update 10 --status working
tinytask comment add 10 "Root cause: unescaped SQL input. Fixed with parameterized query."
tinytask task update 10 --status idle
tinytask queue move 10 ready-for-testing
tinytask move 10 tko-shield -m "Fix complete, please verify"

# 3. Tester verifies
tinytask signup --agent tko-shield
tinytask comment add 10 "Verified fix — special characters now work correctly."
tinytask task update 10 --status complete
```

### 11.3 Scripting Example

```bash
#!/bin/bash
# Get all idle tasks assigned to tko-sword in JSON format
TASKS=$(tinytask task list --assigned-to tko-sword --status idle --json)

# Process each task
echo "$TASKS" | jq -r '.[] | .id' | while read task_id; do
  echo "Processing task $task_id"
  tinytask comment add "$task_id" "Auto-processed by script" --created-by tko-sword
done
```

### 11.4 Subtask Decomposition

```bash
# Create parent task
tinytask task create "Refactor authentication module" \
  -d "Split monolithic auth into separate concerns" \
  -a tko-sword \
  -p 8 \
  --tags "refactor,auth" \
  --queue ready-for-development

# Decompose into subtasks
tinytask subtask create 5 "Extract token validation logic" -d "Move JWT validation to separate module"
tinytask subtask create 5 "Update middleware chain" -d "Adjust Express middleware to use new auth module"
tinytask subtask create 5 "Write integration tests" -d "End-to-end tests for all auth flows"

# View the tree
tinytask subtask tree 5 --recursive
```

---

## 12. Command Quick Reference

### Task Commands

| Command | Syntax |
|---|---|
| Create | `tinytask task create <title> [-d <desc>] [-a <agent>] [-c <creator>] [-p <priority>] [-t <tags>] [--parent <id>] [-q <queue>]` |
| Get | `tinytask task get <id>` |
| Update | `tinytask task update <id> [-t <title>] [-d <desc>] [-s <status>] [-a <agent>] [-p <priority>] [--tags <tags>] [--parent <id\|null>] [-q <queue>]` |
| List | `tinytask task list [-a <agent>] [-s <status>] [-q <queue>] [--parent <id>] [--exclude-subtasks] [--include-archived] [--limit <n>] [--offset <n>]` |
| Archive | `tinytask task archive <id>` |
| Delete | `tinytask task delete <id> [-y]` |

### Subtask Commands

| Command | Syntax |
|---|---|
| Create | `tinytask subtask create <parent-id> <title> [-d <desc>] [-a <agent>] [-p <priority>] [-t <tags>] [-q <queue>]` |
| List | `tinytask subtask list <parent-id> [-r] [--include-archived]` |
| Tree | `tinytask subtask tree <task-id> [-r]` |
| Move | `tinytask subtask move <subtask-id> [new-parent-id]` |

### Queue Commands

| Command | Syntax |
|---|---|
| View Agent Queue | `tinytask queue view [agent] [-s <status>] [--mine]` |
| List Queues | `tinytask queue list` |
| Queue Stats | `tinytask queue stats <queue-name>` |
| Queue Tasks | `tinytask queue tasks <queue-name> [-s <status>] [-a <agent>] [--exclude-subtasks] [--include-archived] [-l <limit>] [-o <offset>]` |
| Add to Queue | `tinytask queue add <task-id> <queue-name>` |
| Remove from Queue | `tinytask queue remove <task-id>` |
| Move Between Queues | `tinytask queue move <task-id> <new-queue>` |
| Clear Queue | `tinytask queue clear <queue-name> [-y]` |

### Workflow Commands

| Command | Syntax |
|---|---|
| Signup | `tinytask signup [-a <agent>]` |
| Move Between Agents | `tinytask move <id> <to-agent> [-f <from-agent>] [-m <comment>]` |

### Comment Commands

| Command | Syntax |
|---|---|
| Add Comment | `tinytask comment add <task-id> <content> [--created-by <agent>]` |
| List Comments | `tinytask comment list <task-id>` |
| Update Comment | `tinytask comment update <comment-id> <content>` |
| Delete Comment | `tinytask comment delete <comment-id> [-y]` |

### Link Commands

| Command | Syntax |
|---|---|
| Add Link | `tinytask link add <task-id> <url> [-d <desc>] [--created-by <agent>]` |
| List Links | `tinytask link list <task-id>` |
| Update Link | `tinytask link update <link-id> [--url <url>] [--description <text>]` |
| Delete Link | `tinytask link delete <link-id> [-y]` |

### Config Commands

| Command | Syntax |
|---|---|
| Init | `tinytask config init [-f]` |
| Show | `tinytask config show` |
| Set | `tinytask config set <key> <value>` |
| Get | `tinytask config get <key>` |
| Profile Add | `tinytask config profile add -n <name> -u <url> [--default-agent <agent>]` |
| Profile List | `tinytask config profile list` |
| Profile Use | `tinytask config profile use <name>` |
| Profile Remove | `tinytask config profile remove <name>` |

### Utility Commands

| Command | Syntax |
|---|---|
| Ping | `tinytask ping` |
| Version | `tinytask --version` |
| Help | `tinytask --help` or `tinytask <command> --help` |

---

## 13. Command Aliases Summary

| Full Command | Alias |
|---|---|
| `tinytask task` | `tinytask t` |
| `tinytask task list` | `tinytask task ls` |
| `tinytask subtask` | `tinytask st` |
| `tinytask subtask list` | `tinytask st ls` |
| `tinytask queue` | `tinytask q` |
| `tinytask queue list` | `tinytask queue ls` |
| `tinytask comment` | `tinytask c` |
| `tinytask link` | `tinytask l` |

---

## Cross-References

| Topic | Reference |
|---|---|
| Core concepts, data model, roles, queues | [00-Foundation.md](./00-Foundation.md) |
| Task lifecycle scenarios (create, start, complete, archive) | [Scenario Group A](./01-Scenario-Group-A-Core-Task-Lifecycle.md) |
| Development workflows (subtask decomposition, parallel work) | [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) |
| QA & bug workflows (filing, fixing, verifying) | [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) |
| Task dependencies, linking, bulk operations | [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) |
| Comments, cross-queue handoffs, coordination | [Scenario Group E](./05-Scenario-Group-E-Collaboration-and-Communication.md) |
| Conventions & best practices | [Conventions & Best Practices](./07-Conventions-and-Best-Practices.md) |

---

*This document is part of the TinyTask Process Manual. See [00-Foundation.md](./00-Foundation.md) for core concepts and [other scenario documents](.) for specialized workflows.*
