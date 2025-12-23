# Changelog

All notable changes to TinyTask MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Initial Release

#### Added
- **Core Task Management**
  - Create, read, update, and delete tasks
  - Task status tracking (idle, working, complete)
  - Task priority system
  - Task assignment to agents
  - Task archival for completed tasks
  
- **Comment System**
  - Add comments to tasks
  - Update and delete comments
  - List all comments for a task
  - Comment timestamps and creator tracking
  
- **Link/Artifact System**
  - Add links/artifacts to tasks
  - Update and delete links
  - List all links for a task
  - Link descriptions and creator tracking
  
- **Agent Queue Management**
  - Per-agent task queues
  - Priority-based queue sorting
  - Queue filtering by agent name
  - Queue statistics
  
- **MCP Server Implementation**
  - Full MCP protocol support
  - 16 tools for task, comment, and link operations
  - 8 resource URIs for data access
  - Comprehensive tool parameter validation
  
- **Dual Transport Support**
  - stdio transport for local MCP clients
  - SSE (Server-Sent Events) over HTTP transport
  - Both transports mode for development
  - Configurable via environment variables
  
- **Database Layer**
  - SQLite database with Better-SQLite3
  - Automatic schema initialization
  - Foreign key constraints
  - Proper indexing for performance
  - WAL mode support
  
- **Docker Support**
  - Production Dockerfile
  - Development Dockerfile
  - docker-compose.yml for easy deployment
  - docker-compose.dev.yml for development
  - Health check endpoints
  - Volume mounting for data persistence
  
- **Testing Suite**
  - Integration tests for multi-agent workflows
  - Persistence tests for data durability
  - Performance tests (100+ tasks)
  - Error scenario tests
  - Test helper utilities
  - Jest configuration for TypeScript
  
- **Documentation**
  - Comprehensive README
  - API reference documentation
  - Example agent workflows
  - Troubleshooting guide
  - Deployment guide
  - Architecture documentation
  - Database schema documentation
  - Docker deployment guide

#### Technical Details
- TypeScript implementation with strict mode
- ESM module system
- Zod schema validation
- Express.js for HTTP server
- Better-SQLite3 for database
- MCP SDK 0.5.0

#### Developer Tools
- ESLint configuration
- Prettier code formatting
- TypeScript strict mode
- Build scripts
- Development watch mode
- Clean build process

---

## [Unreleased]

### Planned Features
- Authentication and authorization
- Multi-user support
- Task templates
- Task dependencies
- Due dates and reminders
- Task labels/tags
- Search functionality
- Batch operations
- Export/import capabilities
- Webhooks for notifications
- REST API alongside MCP
- GraphQL API option
- Performance metrics endpoint
- Admin dashboard

### Under Consideration
- Task history/audit log
- File attachments
- Task relations (parent/child)
- Custom fields
- Workflow automation
- Integration with external services
- Multi-database support
- Clustering for high availability
- Realtime updates via WebSockets

---

## Version History

### Version Numbering

- **Major version** (X.0.0): Breaking changes, major feature additions
- **Minor version** (x.X.0): New features, non-breaking changes
- **Patch version** (x.x.X): Bug fixes, minor improvements

### Upgrade Notes

#### Upgrading to 1.0.0
- Initial release - no upgrade path needed
- Database schema is automatically initialized on first run
- Environment variables:
  - `TINYTASK_MODE`: Set to `stdio`, `sse`, or `both`
  - `TINYTASK_PORT`: HTTP port for SSE mode (default: 3000)
  - `TINYTASK_DB_PATH`: Database file location (default: ./data/tinytask.db)

---

## Support

For questions, issues, or feature requests:
- GitHub Issues: [Create an issue](https://github.com/yourusername/tinytask-mcp/issues)
- Documentation: See [docs/](docs/) directory
- Email: support@example.com (if applicable)

---

## Contributors

Thanks to all contributors who have helped build TinyTask MCP!

---

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
