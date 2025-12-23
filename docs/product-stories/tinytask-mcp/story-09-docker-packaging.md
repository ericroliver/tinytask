# Story 9: Docker Packaging

## Title
Package application as Docker container with persistent storage

## Description
As a developer/operator, I need to package the TinyTask MCP server as a Docker container so that it can be easily deployed with persistent storage across restarts.

## User Story
**As an** operator  
**I want to** deploy TinyTask as a Docker container  
**So that** it's portable, isolated, and easy to manage

## Acceptance Criteria

### Must Have
- [ ] Multi-stage Dockerfile for optimized image size
- [ ] docker-compose.yml for easy deployment
- [ ] Volume mount for database persistence
- [ ] Health check in Dockerfile
- [ ] Non-root user for security
- [ ] Environment variable configuration
- [ ] Image builds successfully
- [ ] Container starts and runs correctly
- [ ] Data persists across container restarts
- [ ] Health check reports correctly

### Should Have
- [ ] .dockerignore to exclude unnecessary files
- [ ] Development Dockerfile variant
- [ ] Build script for convenience
- [ ] Image size < 100MB

### Could Have
- [ ] Multi-architecture support (amd64, arm64)
- [ ] Image published to registry
- [ ] Docker Compose for development with hot reload

## Technical Details

### Production Dockerfile

```dockerfile
# Multi-stage Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create data directory
RUN mkdir -p /data && chown node:node /data

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/build ./build

# Use non-root user
USER node

# Expose SSE port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "build/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  tinytask:
    image: tinytask-mcp:latest
    container_name: tinytask-mcp
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      # Persistent database storage
      - ./data:/data
    environment:
      # Server mode
      TINYTASK_MODE: sse
      
      # SSE configuration
      TINYTASK_PORT: 3000
      TINYTASK_HOST: 0.0.0.0
      
      # Database
      TINYTASK_DB_PATH: /data/tinytask.db
      
      # Logging
      TINYTASK_LOG_LEVEL: info
      
      # Node environment
      NODE_ENV: production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    networks:
      - tinytask-network

networks:
  tinytask-network:
    driver: bridge
```

### Development docker-compose.yml

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  tinytask-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: tinytask-mcp-dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    volumes:
      - ./src:/app/src:ro
      - ./data:/data
      - /app/node_modules
    environment:
      TINYTASK_MODE: sse
      TINYTASK_PORT: 3000
      TINYTASK_DB_PATH: /data/tinytask.db
      TINYTASK_LOG_LEVEL: debug
      NODE_ENV: development
    command: npm run dev
    networks:
      - tinytask-network

networks:
  tinytask-network:
    driver: bridge
```

### .dockerignore

```
# Dependencies
node_modules/
npm-debug.log*

# Build output
build/
dist/

# Testing
coverage/
.nyc_output/

# Development
.env
.env.local
*.log

# Git
.git/
.gitignore

# Documentation
docs/
*.md
!README.md

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Data
data/
*.db
*.db-wal
*.db-shm
```

### Build and Run Scripts

```bash
#!/bin/bash
# build.sh

echo "Building TinyTask MCP Docker image..."
docker build -t tinytask-mcp:latest .

echo "Image built successfully!"
docker images | grep tinytask-mcp
```

```bash
#!/bin/bash
# run.sh

echo "Starting TinyTask MCP container..."

# Create data directory if it doesn't exist
mkdir -p ./data

# Run container
docker-compose up -d

echo "Container started!"
echo "Health check: http://localhost:3000/health"
echo "MCP endpoint: http://localhost:3000/mcp"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop: docker-compose down"
```

### README Section for Docker

```markdown
## Docker Deployment

### Quick Start

1. Build the image:
   ```bash
   docker build -t tinytask-mcp:latest .
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Check health:
   ```bash
   curl http://localhost:3000/health
   ```

### Configuration

Edit `docker-compose.yml` to configure environment variables:
- `TINYTASK_MODE`: stdio, sse, or both
- `TINYTASK_PORT`: HTTP port (default: 3000)
- `TINYTASK_DB_PATH`: Database file path (default: /data/tinytask.db)

### Data Persistence

Database is stored in `./data` directory on the host, mounted to `/data` in the container.

### Logs

```bash
docker-compose logs -f
```

### Stopping

```bash
docker-compose down
```

Data persists in `./data` directory.
```

## Dependencies
- Story 1: Project Setup
- Story 8: Entry Point (needs working application)

## Subtasks
1. [ ] Create Dockerfile with multi-stage build
2. [ ] Create docker-compose.yml for production
3. [ ] Create docker-compose.dev.yml for development
4. [ ] Create .dockerignore file
5. [ ] Create build.sh script
6. [ ] Create run.sh script
7. [ ] Test image build
8. [ ] Test container startup
9. [ ] Test volume persistence (restart container)
10. [ ] Test health check
11. [ ] Optimize image size
12. [ ] Update README with Docker instructions
13. [ ] Test with MCP client connecting to container

## Testing

### Build Tests
- [ ] Image builds without errors
- [ ] Image size is reasonable (< 100MB)
- [ ] Build script works

### Runtime Tests
- [ ] Container starts successfully
- [ ] Health check passes
- [ ] SSE endpoint accessible
- [ ] Can create tasks via MCP
- [ ] Database file created in volume

### Persistence Tests
- [ ] Create task in database
- [ ] Stop container
- [ ] Start container
- [ ] Task still exists
- [ ] Database not corrupted

### Configuration Tests
- [ ] Environment variables are respected
- [ ] Port mapping works
- [ ] Volume mount works
- [ ] Custom database path works

## Definition of Done
- All acceptance criteria met
- Dockerfile complete and optimized
- Docker Compose files created
- Build scripts created
- Image builds successfully
- Container runs correctly
- Data persists across restarts
- Health check working
- Documentation complete
- Code committed

## Estimated Effort
**4-6 hours**

## Priority
**P0 - Critical** (Required for production deployment)

## Labels
`docker`, `deployment`, `devops`, `phase-9`

## Notes
- Multi-stage build reduces final image size significantly
- Non-root user improves security
- dumb-init ensures proper signal handling in containers
- Health check enables Docker orchestration
- Volume mount is critical for data persistence
