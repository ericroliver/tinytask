# Story 7: SSE Transport

## Title
Implement SSE transport for remote multi-agent access

## Description
As a developer, I need to implement HTTP Server-Sent Events (SSE) transport so that multiple remote agents can connect to the MCP server over the network.

## User Story
**As an** LLM agent  
**I want to** connect to the MCP server over HTTP  
**So that** I can collaborate with other agents remotely

## Acceptance Criteria

### Must Have
- [ ] Express.js HTTP server implementation
- [ ] SSE endpoint for MCP protocol
- [ ] Server runs on configurable port (default: 3000)
- [ ] Health check endpoint at /health
- [ ] CORS support for cross-origin requests
- [ ] Multiple concurrent agent connections
- [ ] Tools and resources work via SSE
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] Environment variable to enable SSE mode

### Should Have
- [ ] Connection logging (connect/disconnect)
- [ ] Request logging
- [ ] Error handling and recovery

### Could Have
- [ ] Metrics endpoint for monitoring
- [ ] Rate limiting per client
- [ ] Connection authentication

## Technical Details

### SSE Server Implementation

```typescript
// src/server/sse.ts
import express from 'express';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function startSseServer(server: McpServer): Promise<void> {
  const app = express();
  const port = parseInt(process.env.TINYTASK_PORT || '3000');
  const host = process.env.TINYTASK_HOST || '0.0.0.0';
  
  // Middleware
  app.use(express.json());
  
  // CORS support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  });
  
  // SSE endpoint for MCP protocol
  app.get('/mcp', async (req, res) => {
    console.error('New SSE connection from', req.ip);
    
    const transport = new SSEServerTransport('/mcp', res);
    await server.connect(transport);
    
    // Handle disconnect
    req.on('close', () => {
      console.error('SSE connection closed from', req.ip);
    });
  });
  
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  
  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  // Start server
  const httpServer = app.listen(port, host, () => {
    console.error('TinyTask MCP server running on SSE');
    console.error(`URL: http://${host}:${port}/mcp`);
    console.error(`Health: http://${host}:${port}/health`);
    console.error('Database:', process.env.TINYTASK_DB_PATH || './data/tinytask.db');
    console.error('Mode: SSE');
    console.error('Press Ctrl+C to stop');
  });
  
  // Graceful shutdown
  const shutdown = async () => {
    console.error('\nShutting down...');
    httpServer.close(() => {
      console.error('Server closed');
      process.exit(0);
    });
    
    // Force close after 5 seconds
    setTimeout(() => {
      console.error('Forced shutdown');
      process.exit(1);
    }, 5000);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-12-23T17:00:00.000Z",
  "database": "connected",
  "uptime": 3600
}
```

### Usage Example

```bash
# Start in SSE mode
TINYTASK_MODE=sse node build/index.js

# Or with custom port
TINYTASK_MODE=sse TINYTASK_PORT=8080 node build/index.js
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "tinytask-remote": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Dependencies
- Story 1: Project Setup (needs Express.js)
- Story 4: MCP Tools
- Story 5: MCP Resources
- Story 6: Stdio Transport (for MCP server setup)

## Subtasks
1. [ ] Create src/server/sse.ts with Express setup
2. [ ] Implement SSE transport integration
3. [ ] Add health check endpoint
4. [ ] Add CORS middleware
5. [ ] Add error handling middleware
6. [ ] Add request logging
7. [ ] Implement graceful shutdown
8. [ ] Test with remote MCP client
9. [ ] Test multiple concurrent connections
10. [ ] Test health check endpoint
11. [ ] Document SSE configuration

## Testing
- [ ] Server starts on specified port
- [ ] Health check returns 200 OK
- [ ] Can connect via SSE from remote client
- [ ] All tools work via SSE
- [ ] All resources work via SSE
- [ ] Multiple agents can connect simultaneously
- [ ] Graceful shutdown closes connections
- [ ] CORS headers present
- [ ] 404 for unknown routes
- [ ] Error handling works

## Definition of Done
- All acceptance criteria met
- SSE transport implemented
- Express server configured
- Health check working
- Multi-agent testing successful
- Documentation complete
- Code committed

## Estimated Effort
**4-6 hours**

## Priority
**P0 - Critical** (Required for production multi-agent)

## Labels
`transport`, `sse`, `http`, `mcp`, `phase-7`

## Notes
- SSE is one-way server-to-client, but MCP handles bidirectional
- Health check is critical for Docker health checks
- CORS needed if agents run in browsers
- Test with multiple concurrent connections thoroughly
