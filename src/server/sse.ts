/**
 * SSE transport for MCP server
 * Enables remote multi-agent access over HTTP
 */

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Configuration options for SSE server
 */
export interface SseServerOptions {
  port?: number;
  host?: string;
}

/**
 * Start the MCP server with SSE transport
 */
export async function startSseServer(server: Server, options?: SseServerOptions): Promise<void> {
  const app = express();
  const port = options?.port ?? parseInt(process.env.TINYTASK_PORT || '3000');
  const host = options?.host ?? process.env.TINYTASK_HOST ?? '0.0.0.0';

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
  app.use(
    (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  );

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
    httpServer.close(async () => {
      console.error('Server closed');
      await server.close();
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
