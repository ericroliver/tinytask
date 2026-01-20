# TinyTask CLI - Product Requirements Document

## Overview

A command-line interface (CLI) client for TinyTask that connects to the TinyTask MCP server over Streamable HTTP, enabling users to manage tasks, comments, and links from the terminal or in automated workflows.

## Problem Statement

Currently, TinyTask can only be accessed through MCP clients (like Claude Desktop) or programmatically through the MCP protocol. There's no direct command-line tool for:
- Developers to quickly manage tasks from their terminal
- CI/CD pipelines to create and track tasks during builds
- Automation scripts to integrate task management into workflows
- Quick ad-hoc task queries and updates without opening a full MCP client

## Goals

1. **Developer Experience**: Provide an intuitive CLI that feels natural for terminal users
2. **Automation Support**: Enable scriptable commands for CI/CD and automation
3. **Full Feature Parity**: Support all TinyTask MCP operations (tasks, comments, links)
4. **Flexible Output**: Support both human-readable and machine-parseable output
5. **Easy Configuration**: Simple setup with environment variables or config files
6. **Pipeline Building**: Enable task workflow orchestration through CLI commands

## Non-Goals

- Direct database access (CLI will always connect via MCP server)
- Stdio MCP transport support (only Streamable HTTP)
- Interactive TUI/dashboard interface (may be future enhancement)
- Real-time task watching/notifications (may be future enhancement)

## Target Users

1. **Developers**: Managing personal task queues, checking status, adding comments
2. **DevOps Engineers**: Integrating task management into CI/CD pipelines
3. **Automation Scripts**: Programmatic task creation and management
4. **Team Leads**: Bulk operations, queue management, task assignment

## Key Features

### 1. Connection Management
- Connect to TinyTask server via Streamable HTTP
- Support URL configuration via:
  - Environment variable: `TINYTASK_URL`
  - Command-line flag: `--url`
  - Config file: `~/.tinytask/config.json`
- Connection validation and helpful error messages

### 2. Task Management Commands
```bash
# Core CRUD operations
tinytask task create <title> [options]
tinytask task get <id>
tinytask task update <id> [options]
tinytask task delete <id>
tinytask task archive <id>
tinytask task list [filters]

# Convenience aliases
tinytask create <title> [options]
tinytask get <id>
tinytask update <id> [options]
tinytask ls [filters]

# High-level workflow commands
tinytask signup [--agent <name>]
tinytask move <id> <to-agent> [--comment <text>]
```

### 3. Queue Management
```bash
# View queues
tinytask queue [agent-name]
tinytask queue --mine
tinytask queue <agent> --status idle|working|complete

# Aliases
tinytask q
tinytask my-queue
```

### 4. Comment Operations
```bash
tinytask comment add <task-id> <content>
tinytask comment list <task-id>
tinytask comment update <comment-id> <content>
tinytask comment delete <comment-id>
```

### 5. Link/Artifact Operations
```bash
tinytask link add <task-id> <url> [--description <text>]
tinytask link list <task-id>
tinytask link update <link-id> [options]
tinytask link delete <link-id>
```

### 6. Bulk Operations
```bash
# Bulk task operations
tinytask bulk create --from-file tasks.json
tinytask bulk update --status working --assigned-to agent-1
tinytask bulk archive --completed-before 2024-01-01

# Pipeline operations
tinytask pipeline run workflow.yaml
```

### 7. Output Formats
```bash
# Human-readable (default)
tinytask task list
# ┌─────┬────────────┬──────────┬──────────┬──────────┐
# │ ID  │ Title      │ Status   │ Assigned │ Priority │
# ├─────┼────────────┼──────────┼──────────┼──────────┤
# │ 1   │ Fix bug    │ working  │ alice    │ 10       │
# └─────┴────────────┴──────────┴──────────┴──────────┘

# JSON (for scripts)
tinytask task list --json
# [{"id": 1, "title": "Fix bug", "status": "working", ...}]

# CSV (for exports)
tinytask task list --csv

# Compact (single-line per task)
tinytask task list --compact
# [1] Fix bug (working) @alice p:10
```

### 8. Filtering & Querying
```bash
# Filter by status
tinytask list --status idle
tinytask list --status working,complete

# Filter by assignment
tinytask list --assigned-to alice
tinytask list --unassigned

# Filter by priority
tinytask list --priority-gte 5
tinytask list --priority-between 5,10

# Filter by date
tinytask list --created-after 2024-01-01
tinytask list --updated-before 2024-12-31

# Combine filters
tinytask list --status idle --assigned-to alice --priority-gte 5

# Sort options
tinytask list --sort priority-desc
tinytask list --sort created-at-asc
```

### 9. Configuration Management
```bash
# Initialize configuration
tinytask config init

# View configuration
tinytask config show

# Set configuration values
tinytask config set url http://localhost:3000/mcp
tinytask config set default-agent myname
tinytask config set output-format json

# Profiles for multiple servers
tinytask config profile add prod --url https://prod.example.com/mcp
tinytask config profile use prod
tinytask --profile dev task list
```

### 10. Pipeline/Workflow Features
```bash
# Create task with dependencies
tinytask create "Task A" --blocks 123,124

# Template-based task creation
tinytask template apply feature-request --title "New feature"

# Workflow execution
tinytask workflow run deploy.yaml
```

## Command Structure

### Hierarchical Command Design
```
tinytask [global-options] <command> [subcommand] [arguments] [options]

Global Options:
  --url <url>           TinyTask server URL
  --profile <name>      Use named profile
  --json                Output as JSON
  --csv                 Output as CSV
  --compact             Compact output format
  --no-color            Disable colored output
  --quiet               Suppress non-essential output
  --verbose             Enable verbose logging
  --version             Show version
  --help                Show help

Commands:
  task, t               Task operations (create, get, update, delete, list, archive)
  comment, c            Comment operations (add, list, update, delete)
  link, l               Link operations (add, list, update, delete)
  queue, q              Queue operations (view, manage)
  signup                Sign up for next task in queue
  move                  Move/transfer task to another agent
  config                Configuration management
  workflow, wf          Workflow operations
  template, tpl         Template operations
  bulk                  Bulk operations
  version               Show version information
  help                  Show help for commands
```

## User Stories

### Story 1: Developer checks their task queue
```bash
# Alice checks her queue in the morning
$ tinytask queue alice

Your Queue (3 tasks):
┌─────┬──────────────────────────┬──────────┬──────────┐
│ ID  │ Title                    │ Status   │ Priority │
├─────┼──────────────────────────┼──────────┼──────────┤
│ 45  │ Fix login bug            │ idle     │ 10       │
│ 44  │ Add user profile page    │ working  │ 8        │
│ 42  │ Update documentation     │ idle     │ 3        │
└─────┴──────────────────────────┴──────────┴──────────┘

# Alice signs up for the next task
$ tinytask signup
✓ Claimed task #45: Fix login bug
  Status: working
  Priority: 10
```

### Story 2: CI/CD Pipeline creates a deployment task
```bash
#!/bin/bash
# In .github/workflows/deploy.yml

# Create deployment task
TASK_ID=$(tinytask create "Deploy v${VERSION} to production" \
  --assigned-to devops-agent \
  --priority 10 \
  --tags deploy,production,v${VERSION} \
  --description "Deployment triggered by commit ${GITHUB_SHA}" \
  --json | jq -r '.id')

# Add link to deployment
tinytask link add $TASK_ID \
  "https://github.com/repo/actions/runs/${GITHUB_RUN_ID}" \
  --description "GitHub Actions Run"

# Update status on success
if deploy.sh; then
  tinytask update $TASK_ID --status complete
  tinytask comment add $TASK_ID "✓ Deployment successful"
else
  tinytask comment add $TASK_ID "✗ Deployment failed: $ERROR"
  exit 1
fi
```

### Story 3: Team lead reassigns tasks
```bash
# Bob is out sick, reassign his tasks to Alice
$ tinytask list --assigned-to bob --status idle --json | \
  jq -r '.[].id' | \
  xargs -I {} tinytask update {} --assigned-to alice

# Or using bulk command
$ tinytask bulk update \
  --assigned-to bob \
  --status idle \
  --set-assigned-to alice \
  --comment "Reassigned while Bob is out"
```

### Story 4: Developer creates task with full context
```bash
# Create a detailed task
$ tinytask create "Implement dark mode toggle" \
  --description "Users want option to switch between light and dark themes" \
  --assigned-to ui-agent \
  --priority 8 \
  --tags feature,ui,dark-mode \
  --created-by product-agent

Created task #78

# Add design doc link
$ tinytask link add 78 /docs/dark-mode-design.md \
  --description "Design specification"

# Add initial comment
$ tinytask comment add 78 "Target completion: end of sprint"
```

## Technical Considerations

### Architecture
- **CLI Framework**: Commander.js for command parsing
- **HTTP Client**: Built on MCP SDK client with Streamable HTTP transport
- **Output Formatting**: chalk (colors), cli-table3 (tables), JSON/CSV built-in
- **Configuration**: cosmiconfig for flexible config file support
- **Language**: TypeScript with Node.js runtime
- **Distribution**: npm package, optionally bundled as standalone binary

### Configuration File Format
```json
{
  "url": "http://localhost:3000/mcp",
  "defaultAgent": "myname",
  "outputFormat": "table",
  "colorOutput": true,
  "profiles": {
    "dev": {
      "url": "http://localhost:3000/mcp"
    },
    "staging": {
      "url": "https://staging.example.com/mcp"
    },
    "prod": {
      "url": "https://prod.example.com/mcp"
    }
  }
}
```

### Environment Variables
```bash
TINYTASK_URL=http://localhost:3000/mcp
TINYTASK_AGENT=myname
TINYTASK_FORMAT=json  # table, json, csv, compact
TINYTASK_NO_COLOR=true
TINYTASK_PROFILE=prod
```

### Error Handling
- Proper exit codes (0 = success, 1 = general error, 2 = invalid usage)
- Helpful error messages with suggestions
- Connection timeout and retry logic
- Graceful handling of server unavailability

### Testing Strategy
- Unit tests for command parsing and formatting
- Integration tests with mock MCP server
- End-to-end tests with real TinyTask server
- CI/CD pipeline tests to validate automation use cases

## Success Metrics

1. **Adoption**: Number of developers using CLI in their workflow
2. **Usage**: CLI commands executed per day
3. **Automation**: Tasks created via CLI vs. other methods
4. **Performance**: Command execution time < 200ms for simple operations
5. **Reliability**: 99.9% success rate for CLI operations

## Future Enhancements (Out of Scope)

1. Interactive TUI dashboard (blessed/ink)
2. Real-time task watching (`tinytask watch queue`)
3. Task templates and workflow library
4. Shell completions (bash, zsh, fish)
5. Plugin system for custom commands
6. Integration with git (create tasks from commits)
7. Time tracking integration
8. Advanced reporting and analytics
9. Task dependencies and DAG visualization
10. Webhook triggers

## Dependencies

- @modelcontextprotocol/sdk - MCP client functionality
- commander - CLI framework
- chalk - Terminal colors
- cli-table3 - Table formatting
- inquirer - Interactive prompts (future)
- cosmiconfig - Configuration management
- zod - Input validation

## Timeline Estimate

- **Phase 1** (Week 1): Basic CLI structure, task CRUD operations
- **Phase 2** (Week 2): Comment/link operations, queue management
- **Phase 3** (Week 3): Filtering, output formats, configuration
- **Phase 4** (Week 4): Bulk operations, workflows, testing
- **Phase 5** (Week 5): Documentation, examples, npm publishing

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP SDK doesn't support CLI usage | High | Review SDK docs, implement custom HTTP client if needed |
| Performance issues with large datasets | Medium | Implement pagination, streaming output |
| Complex workflow requirements | Medium | Start simple, iterate based on user feedback |
| Configuration complexity | Low | Provide sensible defaults, clear documentation |

## Open Questions

1. Should we support stdio transport in addition to HTTP? (Answer: No, only HTTP for v1)
2. Do we need interactive prompts for missing parameters? (TBD based on user feedback)
3. Should we support task templates in v1? (Defer to v2)
4. Do we need shell completion scripts? (Nice to have for v2)

## Approval

This PRD requires approval before moving to implementation planning and story creation.
