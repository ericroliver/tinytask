#!/bin/bash

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
