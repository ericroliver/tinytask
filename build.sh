#!/bin/bash

echo "Building TinyTask MCP Docker image..."
docker build -t tinytask-mcp:latest .

echo "Image built successfully!"
docker images | grep tinytask-mcp
