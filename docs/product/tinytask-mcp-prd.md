# Product Requirements Document: TinyTask MCP

## Product Overview

**Product Name:** TinyTask MCP  
**Version:** 1.0.0 (MVP)  
**Target Users:** LLM Agents (autonomous AI agents)  
**Product Type:** MCP Server (Model Context Protocol)  
**Delivery Method:** Docker Container

## Problem Statement

LLM agents working collaboratively need a lightweight, simple way to:
- Share and coordinate tasks
- Hand off work between specialized agents
- Track progress and status
- Document their work with comments and artifact links
- Operate without human intervention

Current solutions are either too complex (Jira, Linear) or too simple (shared text files). We need a minimal, purpose-built system for agent-to-agent collaboration.

## Target Users

### Primary Users: LLM Agents
- **Product Agent:** Creates initial tasks from user requirements
- **Architect Agent:** Designs solutions, creates technical specs
- **Code Agent:** Implements features
- **Review Agent:** Reviews code and designs
- **QA Agent:** Tests implementations
- **Integration Agent:** Deploys and archives completed work
- **Other specialized agents** as workflows evolve

### Secondary Users: Human Operators
- Monitor agent queues
- Reassign tasks when agents get stuck
- Review completed work
- Debug agent workflows

## User Stories

### Epic 1: Task Management
**As an LLM agent, I want to create, read, update, and delete tasks so that I can manage my work queue.**

- Create tasks with title, description, priority, and tags
- Update task status (idle, working, complete)
- Assign tasks to other agents by name
- Query my own task queue
- Archive completed tasks

### Epic 2: Collaboration
**As an LLM agent, I want to communicate with other agents about tasks so that we can work together effectively.**

- Add comments to tasks to document decisions and progress
- Update or delete my own comments
- Read all comments on a task to understand context
- Add links to artifacts (code files, documents, etc.)
- Maintain a complete record of task evolution

### Epic 3: Task Routing
**As an LLM agent, I want to hand off tasks to appropriate agents so that specialized work gets done by specialists.**

- Query my queue to see what's assigned to me
- Update assigned_to field to route tasks
- Filter tasks by status to find work
- Use priority to decide what to work on first

### Epic 4: Persistence
**As a system operator, I want task data to persist across restarts so that agent work is never lost.**

- Database stored in Docker volume
- Volume mapped to host filesystem
- Data survives container restarts
- Backupable via standard file copy

### Epic 5: Multi-Agent Access
**As a system operator, I want multiple agents to access the task system simultaneously so that teams can collaborate in real-time.**

- Support stdio mode for local testing
- Support SSE mode for remote access
- Multiple agents can connect concurrently
- No conflicts or data corruption

## Features

### Must Have (MVP)
✅ **Task CRUD:** Create, read, update, delete tasks  
✅ **Comment System:** Add, edit, delete comments on tasks  
✅ **Link System:** Attach artifact URLs/paths to tasks  
✅ **Queue Management:** Agents can query their assigned tasks  
✅ **Status Tracking:** idle, working, complete states  
✅ **Task Assignment:** Reassign tasks between agents  
✅ **Persistence:** SQLite database in Docker volume  
✅ **Dual Transport:** Stdio (local) and SSE (remote) modes  
✅ **Docker Packaging:** Container with volume mounts  
✅ **MCP Protocol:** Standard tools and resources

### Should Have (Post-MVP)
- Task history/audit trail
- Full-text search
- Task templates
- Bulk operations

### Could Have (Future)
- Web UI for monitoring
- PostgreSQL support for scale
- Authentication/authorization
- Webhook notifications
- Task dependencies/workflows

### Won't Have (Out of Scope)
- Complex workflow engine
- Real-time push notifications
- Multi-database support
- Built-in user management
- Graphical interface

## Success Metrics

### Performance Metrics
- **Tool Response Time:** < 100ms average
- **Concurrent Agents:** Support 50+ simultaneously
- **Uptime:** 99%+ availability
- **Data Integrity:** Zero data loss

### Adoption Metrics
- Successfully handles multi-agent workflows
- Agents can complete full task lifecycle
- Tasks persist across restarts
- Multiple agent teams using system

## Technical Requirements

### Functional Requirements
1. Support all CRUD operations on tasks, comments, links
2. Provide queue query by agent name
3. Persist data across container restarts
4. Support both stdio and SSE transports
5. Validate data inputs
6. Handle errors gracefully
7. Provide clear error messages

### Non-Functional Requirements
1. **Performance:** Sub-100ms response times
2. **Scalability:** 50+ concurrent agents
3. **Reliability:** Data persists, no corruption
4. **Maintainability:** Clean code, documented
5. **Deployability:** Single Docker container
6. **Compatibility:** Standard MCP protocol

## User Workflows

### Workflow 1: Feature Development
1. **Product Agent** creates task: "Add dark mode feature"
2. **Product Agent** assigns to Architect Agent
3. **Architect Agent** queries queue, finds task
4. **Architect Agent** sets status to "working"
5. **Architect Agent** adds comment: "Creating design doc"
6. **Architect Agent** adds link: "/docs/dark-mode-design.md"
7. **Architect Agent** assigns to Code Agent
8. **Code Agent** implements feature
9. **Code Agent** adds link: "/src/theme.ts"
10. **Code Agent** assigns to Review Agent
11. **Review Agent** approves, marks complete
12. **Integration Agent** archives task

### Workflow 2: Bug Fix
1. **QA Agent** creates task: "Login button not working"
2. **QA Agent** assigns to Code Agent
3. **Code Agent** investigates, adds comments
4. **Code Agent** fixes bug, adds link to PR
5. **Code Agent** assigns back to QA Agent
6. **QA Agent** verifies fix, marks complete
7. **Integration Agent** archives task

### Workflow 3: Research Task
1. **Product Agent** creates task: "Research authentication options"
2. **Product Agent** assigns to Architect Agent
3. **Architect Agent** researches, adds multiple comments
4. **Architect Agent** adds links to research docs
5. **Architect Agent** marks complete
6. **Product Agent** reviews, archives task

## API Design

### MCP Tools (Primary Interface)
- Task tools: create_task, update_task, get_task, delete_task, archive_task, list_tasks, get_my_queue
- Comment tools: add_comment, update_comment, delete_comment, list_comments
- Link tools: add_link, update_link, delete_link, list_links

### MCP Resources (Convenience Interface)
- `task://{id}` - Get task with all data
- `queue://{agent_name}` - Get agent's queue
- `tasks://active` - List all active tasks
- `tasks://archived` - List archived tasks

See [`mcp-api-design.md`](../technical/mcp-api-design.md) for complete API reference.

## Data Model

### Task
- id, title, description, status, assigned_to, created_by
- priority, tags, created_at, updated_at, archived_at

### Comment
- id, task_id, content, created_by, created_at, updated_at

### Link
- id, task_id, url, description, created_by, created_at

See [`database-schema.md`](../technical/database-schema.md) for complete schema.

## Release Plan

### Phase 1: MVP Development (Stories 1-10)
- Complete all 10 implementation stories
- Duration: 1.5-2 weeks
- Deliverable: Working Docker container

### Phase 2: Testing & Stabilization
- Integration testing with multiple agents
- Performance testing
- Bug fixes
- Duration: 3-5 days

### Phase 3: Production Deployment
- Deploy to production environment
- Monitor for issues
- Gather feedback from agents
- Duration: Ongoing

### Phase 4: Iteration
- Add requested features
- Improve performance
- Fix bugs
- Duration: Ongoing

## Dependencies

### Technical Dependencies
- Node.js 20+ runtime
- Docker for containerization
- SQLite3 database
- MCP SDK library

### Process Dependencies
- Agent system prompts must reference TinyTask
- Agents must be configured with TinyTask connection
- Monitoring system to track agent queues

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite concurrency limits | Medium | Use WAL mode; plan PostgreSQL upgrade path |
| Agent misuse of API | Medium | Add validation; log errors |
| Data loss on crash | High | WAL mode; regular backups |
| Complex agent workflows | Medium | Start simple; iterate based on usage |
| Learning curve for agents | Low | Clear API; good error messages |

## Success Criteria

### MVP Complete When:
- ✅ All 10 stories implemented
- ✅ Docker container builds and runs
- ✅ Data persists across restarts
- ✅ Multi-agent testing successful
- ✅ Documentation complete

### Product Successful When:
- ✅ 3+ agent teams using system
- ✅ 100+ tasks managed successfully
- ✅ 99%+ uptime over 30 days
- ✅ Zero data loss incidents
- ✅ Positive feedback from operators

## Open Questions

1. Should we support task dependencies in MVP? **Decision: No, post-MVP**
2. Should we add user authentication? **Decision: No, trusted network**
3. Should we support task templates? **Decision: Post-MVP**
4. How long should archived tasks be retained? **Decision: Forever, operators can manually clean up**

## Approvals

| Role | Name | Status | Date |
|------|------|--------|------|
| Product Owner | TBD | Pending | - |
| Technical Lead | TBD | Pending | - |
| Engineering | TBD | Pending | - |

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-23 | Architect | Initial PRD |

---

**Product Stories Location:** [`docs/product-stories/tinytask-mcp/`](../product-stories/tinytask-mcp/)
