# Story 8: Server Entry Point

## Title
Create unified entry point supporting both stdio and SSE modes

## Description
As a developer, I need to create a unified entry point that initializes the database, creates services, and starts the appropriate transport mode based on configuration.

## User Story
**As a** developer/operator  
**I want to** control which transport mode the server uses via environment variable  
**So that** I can run the same application in different environments

## Acceptance Criteria

### Must Have
- [ ] Main entry point at src/index.ts
- [ ] Database initialization on startup
- [ ] Service initialization (Task, Comment, Link)
- [ ] Mode selection via TINYTASK_MODE env var (stdio, sse, both)
- [ ] Proper startup sequence (DB → Services → Server → Transport)
- [ ] Error handling for initialization failures
- [ ] Graceful shutdown handling
- [ ] Startup logging showing configuration

### Should Have
- [ ] Validation of environment variables
- [ ] Default values for all configuration
- [ ] Clear error messages for misconfiguration

### Could Have
- [ ] Configuration file support
- [ ] Hot reload for development

## Technical Details

### Main Entry Point

```typescript
// src/index.ts
#!/usr/bin/env node

import { initializeDatabase } from './db/init.js';
import { TaskService } from './services/task-service.js';
import { CommentService } from './services/comment-service.js';
import { LinkService } from './services/link-service.js';
import { createMcpServer } from './server/mcp-server.js';
import { startStdioServer } from './server/stdio.js';
import { startSseServer } from './server/sse.js';

async function main() {
  try {
    // Load configuration
    const mode = process.env.TINYTASK_MODE || 'both';
    const dbPath = process.env.TINYTASK_DB_PATH || './data/tinytask.db';
    
    console.error('='.repeat(50));
    console.error('TinyTask MCP Server');
    console.error('='.repeat(50));
    console.error('Mode:', mode);
    console.error('Database:', dbPath);
    
    // Validate mode
    if (!['stdio', 'sse', 'both'].includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Must be stdio, sse, or both`);
    }
    
    // Initialize database
    console.error('Initializing database...');
    const db = initializeDatabase(dbPath);
    console.error('Database initialized');
    
    // Create services
    console.error('Creating services...');
    const taskService = new TaskService(db);
    const commentService = new CommentService(db);
    const linkService = new LinkService(db);
    console.error('Services created');
    
    // Create MCP server
    console.error('Creating MCP server...');
    const server = createMcpServer(taskService, commentService, linkService);
    console.error('MCP server created');
    
    // Start appropriate transport(s)
    if (mode === 'stdio' || mode === 'both') {
      console.error('Starting stdio transport...');
      await startStdioServer(server);
    }
    
    if (mode === 'sse') {
      console.error('Starting SSE transport...');
      await startSseServer(server);
    }
    
    console.error('='.repeat(50));
    console.error('Server ready!');
    console.error('='.repeat(50));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main();
```

### Configuration via Environment Variables

```bash
# Environment Variables
TINYTASK_MODE=stdio|sse|both       # Default: both
TINYTASK_DB_PATH=/data/tinytask.db # Default: ./data/tinytask.db
TINYTASK_PORT=3000                 # Default: 3000 (SSE only)
TINYTASK_HOST=0.0.0.0              # Default: 0.0.0.0 (SSE only)
TINYTASK_LOG_LEVEL=info            # Default: info
```

### Startup Output Example

```
==================================================
TinyTask MCP Server
==================================================
Mode: sse
Database: /data/tinytask.db
Initializing database...
Database initialized
Creating services...
Services created
Creating MCP server...
MCP server created
Starting SSE transport...
TinyTask MCP server running on SSE
URL: http://0.0.0.0:3000/mcp
Health: http://0.0.0.0:3000/health
Database: /data/tinytask.db
Mode: SSE
Press Ctrl+C to stop
==================================================
Server ready!
==================================================
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node build/index.js",
    "start:stdio": "TINYTASK_MODE=stdio node build/index.js",
    "start:sse": "TINYTASK_MODE=sse node build/index.js"
  }
}
```

## Dependencies
- Story 2: Database Layer
- Story 3: Service Layer
- Story 6: Stdio Transport
- Story 7: SSE Transport

## Subtasks
1. [ ] Create src/index.ts with main() function
2. [ ] Add environment variable loading
3. [ ] Add configuration validation
4. [ ] Implement database initialization
5. [ ] Implement service creation
6. [ ] Implement MCP server creation
7. [ ] Add mode selection logic
8. [ ] Add error handling
9. [ ] Add startup logging
10. [ ] Test stdio mode
11. [ ] Test SSE mode
12. [ ] Test both mode
13. [ ] Test error scenarios (bad config, DB failure, etc.)
14. [ ] Update package.json scripts

## Testing
- [ ] Server starts with mode=stdio
- [ ] Server starts with mode=sse
- [ ] Server starts with mode=both
- [ ] Invalid mode shows error
- [ ] Database failure shows error
- [ ] Missing directory creates it
- [ ] Custom DB path works
- [ ] Custom port works (SSE)
- [ ] Startup logging is clear
- [ ] Graceful shutdown works

## Definition of Done
- All acceptance criteria met
- Entry point implemented
- Mode selection working
- Database initialization working
- All modes tested
- Error handling complete
- Documentation complete
- Code committed

## Estimated Effort
**2-4 hours**

## Priority
**P0 - Critical** (Ties everything together)

## Labels
`entry-point`, `initialization`, `configuration`, `phase-8`

## Notes
- Keep initialization sequence clear and logical
- Fail fast on configuration errors
- Log everything to stderr for debugging
- Make defaults sensible for common use cases
