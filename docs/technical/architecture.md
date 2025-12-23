# TinyTask System Architecture

## Overview
TinyTask is an MCP server that provides task management for LLM agent collaboration. It supports both stdio (local) and SSE (remote HTTP) transport modes.

## High-Level Architecture

```mermaid
graph TB
    subgraph "LLM Agents"
        A1[Product Agent]
        A2[Architect Agent]
        A3[Code Agent]
        A4[Review Agent]
        A5[QA Agent]
    end
    
    subgraph "Docker Container"
        MCP[TinyTask MCP Server]
        DB[(SQLite DB)]
        MCP --> DB
    end
    
    subgraph "Persistent Storage"
        VOL[Docker Volume<br/>Mounted to Host]
    end
    
    A1 -.->|MCP Protocol<br/>stdio/SSE| MCP
    A2 -.->|MCP Protocol<br/>stdio/SSE| MCP
    A3 -.->|MCP Protocol<br/>stdio/SSE| MCP
    A4 -.->|MCP Protocol<br/>stdio/SSE| MCP
    A5 -.->|MCP Protocol<br/>stdio/SSE| MCP
    
    DB --> VOL
    
    style MCP fill:#4CAF50
    style DB fill:#2196F3
    style VOL fill:#FF9800
```

## Component Architecture

```mermaid
graph TB
    subgraph "MCP Server"
        SERVER[Server Core]
        STDIO[Stdio Transport]
        SSE[SSE Transport]
        
        subgraph "API Layer"
            TOOLS[Tools Handler]
            RESOURCES[Resources Handler]
        end
        
        subgraph "Business Logic"
            TASK_SVC[Task Service]
            COMMENT_SVC[Comment Service]
            LINK_SVC[Link Service]
        end
        
        subgraph "Data Layer"
            DB_CLIENT[Database Client]
            SCHEMA[Schema Manager]
        end
        
        SERVER --> STDIO
        SERVER --> SSE
        SERVER --> TOOLS
        SERVER --> RESOURCES
        
        TOOLS --> TASK_SVC
        TOOLS --> COMMENT_SVC
        TOOLS --> LINK_SVC
        
        RESOURCES --> TASK_SVC
        RESOURCES --> COMMENT_SVC
        RESOURCES --> LINK_SVC
        
        TASK_SVC --> DB_CLIENT
        COMMENT_SVC --> DB_CLIENT
        LINK_SVC --> DB_CLIENT
        
        DB_CLIENT --> SCHEMA
    end
    
    SCHEMA --> SQLITE[(SQLite DB)]
```

## Data Flow

### Agent Task Workflow

```mermaid
sequenceDiagram
    participant PA as Product Agent
    participant MCP as TinyTask MCP
    participant DB as SQLite
    participant AA as Architect Agent
    participant CA as Code Agent
    
    PA->>MCP: create_task(title, desc, assigned_to=AA)
    MCP->>DB: INSERT task
    DB-->>MCP: task_id
    MCP-->>PA: Task created
    
    AA->>MCP: get_my_queue(agent_name=AA)
    MCP->>DB: SELECT tasks WHERE assigned_to=AA
    DB-->>MCP: [task]
    MCP-->>AA: Queue with 1 task
    
    AA->>MCP: update_task(id, status=working)
    MCP->>DB: UPDATE task
    MCP-->>AA: Task updated
    
    AA->>MCP: add_comment(task_id, "Analyzing...")
    MCP->>DB: INSERT comment
    MCP-->>AA: Comment added
    
    AA->>MCP: add_link(task_id, "/docs/design.md")
    MCP->>DB: INSERT link
    MCP-->>AA: Link added
    
    AA->>MCP: update_task(id, assigned_to=CA, status=idle)
    MCP->>DB: UPDATE task
    MCP-->>AA: Task reassigned
    
    CA->>MCP: get_my_queue(agent_name=CA)
    MCP->>DB: SELECT tasks WHERE assigned_to=CA
    DB-->>MCP: [task]
    MCP-->>CA: Queue with 1 task
    
    CA->>MCP: update_task(id, status=complete)
    MCP->>DB: UPDATE task
    MCP-->>CA: Task completed
    
    CA->>MCP: archive_task(id)
    MCP->>DB: UPDATE task SET archived_at
    MCP-->>CA: Task archived
```

## Transport Modes

### Stdio Mode (Local Development)

```mermaid
graph LR
    AGENT[LLM Agent Process] <-->|stdin/stdout| MCP[MCP Server Process]
    MCP --> DB[(SQLite)]
```

**Use Case:** Single-agent testing, local development
**Connection:** Direct process communication
**Configuration:** MCP settings with `command` and `args`

### SSE Mode (Production Multi-Agent)

```mermaid
graph TB
    A1[Agent 1] -->|HTTP| LB[Load Balancer<br/>Optional]
    A2[Agent 2] -->|HTTP| LB
    A3[Agent 3] -->|HTTP| LB
    A4[Agent 4] -->|HTTP| LB
    
    LB -->|HTTP| MCP1[MCP Server Instance 1]
    LB -->|HTTP| MCP2[MCP Server Instance 2]
    
    MCP1 --> DB[(Shared SQLite<br/>or upgrade to PostgreSQL)]
    MCP2 --> DB
```

**Use Case:** Multiple agents on different machines/containers
**Connection:** HTTP Server-Sent Events
**Port:** 3000 (configurable)
**Configuration:** MCP settings with `url` and optional `headers`

## Database Architecture

### SQLite Configuration

- **File Location:** `/data/tinytask.db` (inside container)
- **Journal Mode:** WAL (Write-Ahead Logging) for better concurrency
- **Foreign Keys:** Enabled for referential integrity
- **Backup Strategy:** Volume mapped to host for persistence

### Schema Organization

```
SQLite Database: tinytask.db
├── tasks (primary entity)
│   ├── PK: id
│   ├── Indexes: assigned_to, status, (assigned_to, status)
│   └── Soft delete: archived_at
├── comments (1-to-many with tasks)
│   ├── PK: id
│   ├── FK: task_id → tasks(id) ON DELETE CASCADE
│   └── Index: task_id
├── links (1-to-many with tasks)
│   ├── PK: id
│   ├── FK: task_id → tasks(id) ON DELETE CASCADE
│   └── Index: task_id
└── task_history (optional audit trail)
    ├── PK: id
    ├── FK: task_id → tasks(id) ON DELETE CASCADE
    └── Index: task_id
```

## Scaling Considerations

### Current MVP Scope
- **Single MCP server instance**
- **SQLite database** (sufficient for 10-100 agents)
- **File-based persistence**

### Future Scaling Path
If needed beyond MVP:

1. **Database Upgrade:**
   - SQLite → PostgreSQL for true multi-instance support
   - Connection pooling
   - Read replicas

2. **Horizontal Scaling:**
   - Multiple MCP server instances behind load balancer
   - Shared database
   - Session affinity not required (stateless)

3. **Monitoring:**
   - Task queue depth metrics
   - Agent activity tracking
   - Performance monitoring

## Security Considerations

### MVP Security
- **No authentication** (trusted internal network assumed)
- **No authorization** (agents can access all tasks)
- **No encryption** (stdio mode is process-local, SSE on localhost)

### Production Hardening (Future)
- API key authentication
- Agent-level permissions
- TLS for SSE mode
- Rate limiting
- Audit logging

## Technology Stack

### Core
- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** @modelcontextprotocol/sdk

### Database
- **SQLite3** with better-sqlite3 driver
- **Schema Management:** SQL files executed on startup

### Transport
- **Stdio:** Built-in MCP SDK support
- **SSE:** Express.js for HTTP server

### Container
- **Base Image:** node:20-alpine
- **Size Target:** < 100MB
- **Startup Time:** < 2 seconds

## Configuration

### Environment Variables

```bash
# Server mode
TINYTASK_MODE=stdio|sse|both  # Default: both

# SSE configuration
TINYTASK_PORT=3000  # Default: 3000
TINYTASK_HOST=0.0.0.0  # Default: 0.0.0.0

# Database
TINYTASK_DB_PATH=/data/tinytask.db  # Default: /data/tinytask.db

# Optional features
TINYTASK_ENABLE_HISTORY=true|false  # Default: false
TINYTASK_LOG_LEVEL=debug|info|warn|error  # Default: info
```

### Volume Mounts

```bash
# Database persistence
-v /host/path/data:/data

# Optional: Custom configuration
-v /host/path/config:/config
```

## Project Structure

```
tinytask-mcp/
├── src/
│   ├── index.ts              # Entry point, mode selection
│   ├── server/
│   │   ├── mcp-server.ts     # MCP server setup
│   │   ├── stdio.ts          # Stdio transport
│   │   └── sse.ts            # SSE transport
│   ├── tools/
│   │   ├── task-tools.ts     # Task CRUD tools
│   │   ├── comment-tools.ts  # Comment CRUD tools
│   │   └── link-tools.ts     # Link CRUD tools
│   ├── resources/
│   │   ├── task-resources.ts
│   │   └── queue-resources.ts
│   ├── services/
│   │   ├── task-service.ts
│   │   ├── comment-service.ts
│   │   └── link-service.ts
│   ├── db/
│   │   ├── client.ts         # Database client
│   │   ├── schema.sql        # Table definitions
│   │   └── init.ts           # Database initialization
│   └── types/
│       └── index.ts          # TypeScript types
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment Modes

### Mode 1: Stdio (Local)
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

### Mode 2: SSE (Remote)
```json
{
  "mcpServers": {
    "tinytask": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Mode 3: Docker + SSE (Production)
```bash
docker run -d \
  -p 3000:3000 \
  -v /host/data:/data \
  -e TINYTASK_MODE=sse \
  tinytask-mcp:latest
```

Agents connect via: `http://docker-host:3000/mcp`
