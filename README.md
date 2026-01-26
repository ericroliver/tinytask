# TinyTask

## NOTE:
This is the simplest task management system I could create. I need this for experimentation in another research project exploring agentic team workflows, collaboration, etc. Probably the biggest gaps are that there is no auth or the concept of users. Tasks are assigned to arbitrary names and the name becomes the queue of work for the name. This project was written entirely using AI (specifically RooCode and Anthropic). From start to finish the initial project took just a few hours and cost about $15.50 in tokens.

## Description

A minimal task management system designed for LLM agent collaboration. TinyTask provides both:
- **MCP Server**: Model Context Protocol server for agent integration
- **CLI Client**: Command-line interface for direct task management

## Features

- **Task Management**: Complete CRUD operations for tasks with status tracking (idle, working, complete)
- **Task Blocking**: Tasks can be blocked by other tasks with automatic unblocking when blocker completes
- **Subtasks & Hierarchies**: Create parent-child task relationships for breaking down complex work
- **Queue Organization**: Organize tasks by team or functional area (dev, product, qa, etc.)
- **Comment System**: Add, update, and delete comments on tasks
- **Link/Artifact Tracking**: Associate URLs and artifacts with tasks
- **Agent Queue Management**: Per-agent task queues with priority sorting
- **Task Assignment & Routing**: Assign and reassign tasks between agents
- **Persistent Storage**: SQLite database with full data persistence
- **Flexible Transport**: Supports stdio (local), Streamable HTTP (default remote), and legacy SSE transports
- **Docker Ready**: Containerized deployment with docker-compose

## Quick Start

### TinyTask CLI

The command-line interface provides direct access to all TinyTask features:

```bash
# Install globally
cd tinytask-cli
npm install
npm run build
npm link

# Or use standalone executables (no Node.js required)
npm run package  # Creates binaries in dist/binaries/

# Basic usage
tinytask task create "My first task" --assigned-to me
tinytask task list
tinytask task get 1

# Subtask management
tinytask subtask create 1 "Subtask title" --assigned-to alice
tinytask subtask list 1

# Queue management
tinytask queue list
tinytask queue stats dev
tinytask queue tasks dev --status idle
```

See [tinytask-cli/README.md](tinytask-cli/README.md) for complete CLI documentation.

### MCP Server - Docker (Recommended)

The easiest way to run TinyTask MCP server is using Docker:

> **Note**: Docker Compose v2+ is required. The `version` field has been removed from `docker-compose.yml` for v2+ compatibility. If you're using Docker Compose v1.x, please upgrade to v2.0 or later.

```bash
# Start the server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the server
docker-compose down
```

The server will be available at `http://localhost:3000`

### MCP Server - Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run Streamable HTTP (default HTTP transport)
npm run start:http

# Run Streamable HTTP with stdio sidecar
npm run start:both

# Legacy SSE (HTTP) transport
npm run start:http:sse

# Legacy SSE with stdio sidecar
npm run start:both:sse

# Direct stdio mode (no HTTP server)
npm run start:stdio

# Development mode with auto-reload
npm run dev
```

> **Need guidance on which option to pick?** See the [HTTP Transport Selection](#http-transport-selection) section and the dedicated [docs/product/streamable-http-migration-guide.md](docs/product/streamable-http-migration-guide.md).

## MCP Client Configuration

### Stdio Mode (Local)

For local development with MCP clients like Claude Desktop:

```json
{
  "mcpServers": {
    "tinytask": {
      "command": "node",
      "args": ["/path/to/tinytask/build/index.js"],
      "env": {
        "TINYTASK_MODE": "stdio",
        "TINYTASK_DB_PATH": "/path/to/data/tinytask.db"
      }
    }
  }
}
```

### HTTP Mode (Streamable HTTP - Default)

For HTTP-based access using the Streamable HTTP transport (recommended):

```json
{
  "mcpServers": {
    "tinytask": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### SSE Mode (Legacy)

If you explicitly enable SSE via `TINYTASK_ENABLE_SSE=true`, the endpoint is the same, but you may want a different client profile to track the legacy transport:

```json
{
  "mcpServers": {
    "tinytask-sse": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-Tinytask-Transport": "sse"
      }
    }
  }
}
```
> SSE continues to work for backward compatibility but will be removed in a future major release. Plan migrations with the [docs/product/streamable-http-migration-guide.md](docs/product/streamable-http-migration-guide.md).

## Environment Variables

- `TINYTASK_MODE`: Server mode (`stdio`, `http`, or `both`) - default: `both`
- `TINYTASK_ENABLE_SSE`: Force legacy SSE transport when `true` (default: `false`)
- `TINYTASK_PORT`: HTTP server port - default: `3000`
- `TINYTASK_HOST`: HTTP server host - default: `0.0.0.0`
- `TINYTASK_DB_PATH`: Path to SQLite database file - default: `./data/tinytask.db`
- `TINYTASK_LOG_LEVEL`: Logging level - default: `info`

## Logging Configuration

TinyTask supports multiple logging levels for debugging and troubleshooting agent interactions.

### Log Levels

- **`error`**: Only errors (minimal production logging)
- **`warn`**: Warnings and errors
- **`info`**: Important operations (default, backward compatible)
- **`debug`**: Detailed debugging including tool calls and validation
- **`trace`**: Full forensic logging with complete request/response bodies

### Setting Log Level

#### Docker (Recommended)

Edit `docker-compose.yml`:

```yaml
environment:
  TINYTASK_LOG_LEVEL: trace  # Change from 'info' to enable forensic logging
```

Then restart:

```bash
docker-compose down
docker-compose up -d
docker-compose logs -f tinytask  # Watch logs in real-time
```

#### Local Development

```bash
# Set for single run
TINYTASK_LOG_LEVEL=debug npm run dev

# Or export for session
export TINYTASK_LOG_LEVEL=trace
npm run dev
```

#### MCP Client (stdio mode)

```json
{
  "mcpServers": {
    "tinytask": {
      "command": "node",
      "args": ["/path/to/tinytask/build/index.js"],
      "env": {
        "TINYTASK_MODE": "stdio",
        "TINYTASK_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Troubleshooting Agent Issues

If an agent (like goose) is having issues creating tasks or performing operations:

1. **Enable forensic logging** by setting `TINYTASK_LOG_LEVEL=trace`
2. **Reproduce the issue** with the agent
3. **Review the logs** for:
   - Full request body showing what the agent sent
   - Validation errors indicating missing or invalid fields
   - Full response body showing what was returned
   - Tool execution errors with stack traces

4. **Common issues revealed by trace logging**:
   - Missing required fields in requests
   - Wrong data types (e.g., string instead of number)
   - Invalid enum values for status
   - Session management problems in SSE mode
   - Encoding issues in request bodies

5. **Return to normal logging** after troubleshooting by setting `TINYTASK_LOG_LEVEL=info`

### Performance Impact

- **error/warn/info**: Negligible overhead (< 1ms per request)
- **debug**: Minimal overhead (~1-2ms per request)
- **trace**: Small overhead (~3-5ms per request) - use only for troubleshooting

## API Overview

### Tools

TinyTask exposes the following tools for LLM agents via MCP:

#### Task Tools
- `create_task` - Create a new task (supports `parent_task_id` and `queue_name`)
- `update_task` - Update an existing task (can change parent and queue)
- `get_task` - Retrieve a task by ID
- `delete_task` - Delete a task
- `archive_task` - Archive a completed task
- `list_tasks` - List all tasks (filter by queue, parent, status, etc.)
- `get_my_queue` - Get tasks assigned to a specific agent
- **`signup_for_task`** ⚡ - Claim highest priority idle task and mark as working (atomic)
- **`move_task`** ⚡ - Transfer task to another agent with handoff comment (atomic)

**⚡ High-Efficiency Tools**: These tools combine multiple operations into single atomic transactions, reducing token consumption by 40-60% for common workflows.

#### Subtask Tools
- `create_subtask` - Create a subtask under a parent task
- `get_subtasks` - Get all subtasks for a parent task (immediate or recursive)
- `get_task_with_subtasks` - Get a task with its complete subtask hierarchy
- `move_subtask` - Move a subtask to a different parent or make it top-level

#### Queue Tools
- `list_queues` - List all queue names currently in use
- `get_queue_stats` - Get statistics for a specific queue
- `add_task_to_queue` - Add an existing task to a queue
- `remove_task_from_queue` - Remove a task from its queue
- `move_task_to_queue` - Move a task from one queue to another
- `get_queue_tasks` - Get all tasks in a queue with optional filters
- `clear_queue` - Remove all tasks from a queue

#### Comment Tools
- `add_comment` - Add a comment to a task
- `update_comment` - Update a comment
- `delete_comment` - Delete a comment
- `list_comments` - List all comments for a task

#### Link Tools
- `add_link` - Add a link/artifact to a task
- `update_link` - Update a link
- `delete_link` - Delete a link
- `list_links` - List all links for a task

### Resources

TinyTask provides the following resources via MCP:

#### Task Resources
- `task://{id}` - Full task details with comments and links
- `task://{id}/comments` - All comments for a specific task
- `task://{id}/links` - All links/artifacts for a specific task
- `task://hierarchy/{id}` - Task with its complete subtask hierarchy

#### Queue Resources
- `queue://{agent_name}` - All open tasks assigned to a specific agent
- `queue://{agent_name}/summary` - Summary statistics for an agent's queue
- `queue://list` - List all queues with basic statistics
- `queue://stats/{queue_name}` - Detailed statistics for a specific queue
- `queue://tasks/{queue_name}` - All tasks in a specific queue

#### Task List Resources
- `tasks://active` - All active (non-archived) tasks
- `tasks://archived` - All archived tasks

For detailed API documentation, see [API Documentation](docs/technical/mcp-api-design.md)

## HTTP Transport Selection

TinyTask now uses Streamable HTTP as the default HTTP transport. The legacy SSE transport can still be enabled via configuration for environments that rely on it.

| Scenario | `TINYTASK_MODE` | `TINYTASK_ENABLE_SSE` | Result |
| --- | --- | --- | --- |
| Default HTTP deployment | `http` | _unset_ / `false` | Streamable HTTP (unified `/mcp` endpoint)
| Mixed stdio + HTTP | `both` | _unset_ / `false` | stdio + Streamable HTTP
| Legacy SSE (HTTP only) | `http` | `true` | SSE (deprecated)
| Legacy SSE + stdio | `both` | `true` | stdio + SSE

When `TINYTASK_MODE=stdio`, no HTTP transport is started regardless of `TINYTASK_ENABLE_SSE`.

The routing logic lives in [src/server/http.ts](src/server/http.ts:1). It delegates to the Streamable HTTP implementation in [src/server/streamable-http.ts](src/server/streamable-http.ts:1) by default and falls back to the SSE implementation in [src/server/sse.ts](src/server/sse.ts:1) when the legacy flag is enabled.

Refer to the [docs/product/streamable-http-migration-guide.md](docs/product/streamable-http-migration-guide.md) for detailed migration steps and troubleshooting tips.

## Architecture

TinyTask follows a layered architecture:

1. **CLI Layer** (optional): Command-line interface for direct interaction
2. **Transport Layer**: Handles stdio, Streamable HTTP, and SSE communication
3. **MCP Server Layer**: Implements MCP protocol (tools & resources)
4. **Service Layer**: Business logic for tasks, comments, links, subtasks, and queues
5. **Database Layer**: SQLite with Better-SQLite3

For detailed architecture documentation, see [Architecture Documentation](docs/technical/architecture.md)

## Example Workflows

### Feature Development with Subtasks & Queues

1. **Product Agent** creates a feature epic with subtasks:
```typescript
// Create epic in product queue
const epic = create_task({
  title: "Add dark mode toggle",
  description: "Users want dark mode option",
  queue_name: "product",
  assigned_to: "product-agent",
  priority: 10
})

// Break down into subtasks for different teams
create_subtask({
  parent_task_id: epic.id,
  title: "Design dark mode UI/UX",
  queue_name: "product",
  assigned_to: "designer-agent"
})

create_subtask({
  parent_task_id: epic.id,
  title: "Implement dark mode toggle",
  queue_name: "dev",
  assigned_to: "code-agent"
})

create_subtask({
  parent_task_id: epic.id,
  title: "Test dark mode across browsers",
  queue_name: "qa"
})
```

2. **Developer Agent** works on dev queue task:
```typescript
// 🚀 Claim highest priority task from dev queue
const task = signup_for_task({ agent_name: "code-agent" })

// Add implementation link
add_link({
  task_id: task.id,
  url: "/src/components/DarkModeToggle.tsx",
  description: "Implementation file"
})

// 🚀 Transfer to QA with handoff comment
move_task({
  task_id: task.id,
  current_agent: "code-agent",
  new_agent: "qa-agent",
  comment: "Implementation complete. Toggle component ready for testing."
})
```

3. **QA Agent** picks up unassigned QA task:
```typescript
// Get unassigned tasks in QA queue
const queueTasks = get_queue_tasks({
  queue_name: "qa",
  status: "idle"
})

// Claim and test
update_task({ 
  id: queueTasks.tasks[0].id, 
  assigned_to: "qa-agent", 
  status: "working" 
})

// Complete testing
add_comment({ task_id: queueTasks.tasks[0].id, content: "All tests passed" })
update_task({ id: queueTasks.tasks[0].id, status: "complete" })
```

4. **Check epic progress**:
```typescript
// Get epic with all subtasks
const epicTree = get_task_with_subtasks({
  task_id: epic.id,
  recursive: true
})

// Calculate completion
const subtasks = get_subtasks({ parent_task_id: epic.id })
const completed = subtasks.filter(t => t.status === "complete").length
console.log(`Progress: ${completed}/${subtasks.length} subtasks complete`)
```

### Queue Management Examples

```typescript
// List all active queues with statistics
const queues = list_queues()

// Get detailed stats for dev queue
const devStats = get_queue_stats({ queue_name: "dev" })

// Get all idle tasks in a queue
const devTasks = get_queue_tasks({
  queue_name: "dev",
  status: "idle"
})

// Move task between queues
move_task_to_queue({
  task_id: 42,
  new_queue_name: "qa"
})
```

### CLI Workflow Examples

```bash
# Create epic with subtasks
tinytask task create "Add dark mode" --queue product -p 10
tinytask subtask create 1 "Design UI" --queue product
tinytask subtask create 1 "Implement" --queue dev
tinytask subtask create 1 "Test" --queue qa

# Check queue status
tinytask queue list
tinytask queue stats dev
tinytask queue tasks dev --status idle

# Claim and work on task
tinytask task update 2 --assigned-to me --status working
tinytask task get 2

# Track progress
tinytask subtask list 1 --tree
```

For more examples, see [Example Workflows](docs/examples/workflows.md)

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the project
npm run build

# Format code
npm run format

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

## Deployment

See [Deployment Guide](docs/deployment.md) for production deployment instructions, including Streamable HTTP vs SSE configuration details.

## Troubleshooting

See [Troubleshooting Guide](docs/troubleshooting.md) for common issues and transport troubleshooting steps.

## Technical Documentation

- [Architecture](docs/technical/architecture.md)
- [Database Schema](docs/technical/database-schema.md)
- [MCP API Design](docs/technical/mcp-api-design.md)
- [Docker Deployment](docs/technical/docker-deployment.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC

## Support

For issues and questions, please file an issue on GitHub.
