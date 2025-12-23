# Story 6: Stdio Transport

## Title
Implement stdio transport for local development and testing

## Description
As a developer, I need to implement stdio transport mode so that the MCP server can be used locally with agents connecting via stdin/stdout.

## User Story
**As a** developer  
**I want to** run the MCP server in stdio mode  
**So that** I can test locally with a single agent

## Acceptance Criteria

### Must Have
- [ ] Stdio transport implementation using MCP SDK
- [ ] Server accepts input on stdin
- [ ] Server sends output on stdout
- [ ] Logging goes to stderr (not stdout)
- [ ] Tools and resources work via stdio
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] Environment variable to enable stdio mode

### Should Have
- [ ] Clear startup message to stderr
- [ ] Debug logging option
- [ ] Connection status reporting

### Could Have
- [ ] Colored output to stderr for better readability

## Technical Details

### Stdio Transport Implementation

```typescript
// src/server/stdio.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function startStdioServer(server: McpServer): Promise<void> {
  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  
  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('TinyTask MCP server running on stdio');
  console.error('Database:', process.env.TINYTASK_DB_PATH || './data/tinytask.db');
  console.error('Mode: stdio');
  console.error('Press Ctrl+C to stop');
  
  // Handle shutdown
  const shutdown = async () => {
    console.error('\nShutting down...');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
```

### MCP Server Setup

```typescript
// src/server/mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createMcpServer(
  taskService: TaskService,
  commentService: CommentService,
  linkService: LinkService
): McpServer {
  
  const server = new McpServer({
    name: "tinytask-mcp",
    version: "1.0.0",
  });
  
  // Register all tools
  registerTaskTools(server, taskService);
  registerCommentTools(server, commentService);
  registerLinkTools(server, linkService);
  
  // Register all resources
  registerTaskResources(server, taskService, commentService, linkService);
  registerQueueResources(server, taskService);
  
  return server;
}
```

### Usage Example

```bash
# Start in stdio mode
TINYTASK_MODE=stdio node build/index.js

# Or with custom database path
TINYTASK_MODE=stdio TINYTASK_DB_PATH=/tmp/test.db node build/index.js
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "tinytask": {
      "command": "node",
      "args": ["/path/to/tinytask-mcp/build/index.js"],
      "env": {
        "TINYTASK_MODE": "stdio",
        "TINYTASK_DB_PATH": "/path/to/data/tinytask.db"
      }
    }
  }
}
```

## Dependencies
- Story 1: Project Setup
- Story 4: MCP Tools
- Story 5: MCP Resources

## Subtasks
1. [ ] Create src/server/mcp-server.ts with server factory
2. [ ] Integrate all tool registrations
3. [ ] Integrate all resource registrations
4. [ ] Create src/server/stdio.ts with stdio transport
5. [ ] Add logging to stderr
6. [ ] Add graceful shutdown handling
7. [ ] Test with local MCP client
8. [ ] Verify all tools work via stdio
9. [ ] Verify all resources work via stdio
10. [ ] Document stdio configuration

## Testing
- [ ] Server starts in stdio mode
- [ ] Server accepts MCP protocol on stdin
- [ ] Server responds on stdout
- [ ] Logs appear on stderr
- [ ] All tools are accessible
- [ ] All resources are accessible
- [ ] Graceful shutdown on Ctrl+C
- [ ] Can configure database path via env var
- [ ] Multiple tool calls work sequentially

## Definition of Done
- All acceptance criteria met
- Stdio transport implemented
- MCP server properly configured
- All tools/resources registered
- Graceful shutdown working
- Local testing successful
- Documentation complete
- Code committed

## Estimated Effort
**2-4 hours**

## Priority
**P1 - High** (Needed for local testing)

## Labels
`transport`, `stdio`, `mcp`, `phase-6`

## Notes
- Stdio is simpler than SSE, good for local development
- Critical: stdout must be reserved for MCP protocol only
- All logging must go to stderr
- Test thoroughly before moving to SSE
