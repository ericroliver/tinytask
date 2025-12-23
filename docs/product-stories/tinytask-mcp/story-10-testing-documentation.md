# Story 10: Testing & Documentation

## Title
Comprehensive testing and user documentation

## Description
As a developer, I need to thoroughly test the system and create comprehensive documentation so that the TinyTask MCP server is production-ready and easy to use.

## User Story
**As a** developer/operator/agent  
**I want** comprehensive tests and documentation  
**So that** I can confidently deploy and use the system

## Acceptance Criteria

### Must Have
- [ ] Integration tests for multi-agent workflows
- [ ] Persistence tests (restart scenarios)
- [ ] Performance tests with 100+ tasks
- [ ] User documentation (README)
- [ ] API reference documentation
- [ ] Example agent workflows
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] All tests passing

### Should Have
- [ ] Unit test coverage report
- [ ] Load testing with 50+ concurrent agents
- [ ] Error scenario testing
- [ ] Example MCP client configurations

### Could Have
- [ ] Video walkthrough
- [ ] Architecture diagrams in docs
- [ ] Performance benchmarks

## Technical Details

### Integration Test Suite

```typescript
// tests/integration/workflow.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

describe('Multi-Agent Workflow', () => {
  let taskId: number;
  
  test('Product agent creates task', async () => {
    // Call create_task tool
    const result = await mcpClient.callTool('create_task', {
      title: 'Implement dark mode',
      description: 'Add dark mode toggle',
      assigned_to: 'architect-agent',
      created_by: 'product-agent',
      priority: 10,
    });
    
    expect(result.id).toBeDefined();
    taskId = result.id;
  });
  
  test('Architect agent queries queue', async () => {
    const result = await mcpClient.callTool('get_my_queue', {
      agent_name: 'architect-agent',
    });
    
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe(taskId);
  });
  
  test('Architect agent updates status', async () => {
    await mcpClient.callTool('update_task', {
      id: taskId,
      status: 'working',
    });
    
    const task = await mcpClient.callTool('get_task', { id: taskId });
    expect(task.status).toBe('working');
  });
  
  test('Architect agent adds comment', async () => {
    const result = await mcpClient.callTool('add_comment', {
      task_id: taskId,
      content: 'Created design document',
      created_by: 'architect-agent',
    });
    
    expect(result.id).toBeDefined();
  });
  
  test('Architect agent adds link', async () => {
    const result = await mcpClient.callTool('add_link', {
      task_id: taskId,
      url: '/docs/dark-mode-design.md',
      description: 'Design document',
      created_by: 'architect-agent',
    });
    
    expect(result.id).toBeDefined();
  });
  
  test('Architect agent reassigns to code agent', async () => {
    await mcpClient.callTool('update_task', {
      id: taskId,
      assigned_to: 'code-agent',
      status: 'idle',
    });
    
    const task = await mcpClient.callTool('get_task', { id: taskId });
    expect(task.assigned_to).toBe('code-agent');
  });
  
  test('Code agent completes task', async () => {
    await mcpClient.callTool('update_task', {
      id: taskId,
      status: 'complete',
    });
    
    const task = await mcpClient.callTool('get_task', { id: taskId });
    expect(task.status).toBe('complete');
  });
  
  test('Task has full history', async () => {
    const task = await mcpClient.callTool('get_task', { id: taskId });
    expect(task.comments).toHaveLength(1);
    expect(task.links).toHaveLength(1);
  });
});
```

### Persistence Test

```typescript
// tests/integration/persistence.test.ts
describe('Data Persistence', () => {
  test('Data survives container restart', async () => {
    // Create task
    const task = await mcpClient.callTool('create_task', {
      title: 'Test persistence',
    });
    
    // Stop container
    await stopContainer();
    
    // Start container
    await startContainer();
    
    // Retrieve task
    const retrieved = await mcpClient.callTool('get_task', { 
      id: task.id 
    });
    
    expect(retrieved.id).toBe(task.id);
    expect(retrieved.title).toBe('Test persistence');
  });
});
```

### Performance Test

```typescript
// tests/performance/load.test.ts
describe('Performance', () => {
  test('Handles 100+ tasks efficiently', async () => {
    const start = Date.now();
    
    // Create 100 tasks
    for (let i = 0; i < 100; i++) {
      await mcpClient.callTool('create_task', {
        title: `Task ${i}`,
        assigned_to: `agent-${i % 10}`,
      });
    }
    
    const createTime = Date.now() - start;
    expect(createTime).toBeLessThan(10000); // < 10s for 100 tasks
    
    // Query performance
    const queryStart = Date.now();
    const queue = await mcpClient.callTool('get_my_queue', {
      agent_name: 'agent-1',
    });
    const queryTime = Date.now() - queryStart;
    
    expect(queryTime).toBeLessThan(100); // < 100ms
  });
});
```

### README.md Structure

```markdown
# TinyTask MCP

Minimal task management system for LLM agent collaboration.

## Features

- Task CRUD operations
- Comment system
- Link/artifact tracking
- Agent queue management
- Status tracking (idle, working, complete)
- Task assignment and routing
- Persistent SQLite storage
- Docker deployment
- Dual transport (stdio + SSE)

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
```

### Local Development

```bash
npm install
npm run build
npm run start:sse
```

## MCP Client Configuration

### Stdio Mode (Local)
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

### SSE Mode (Remote)
```json
{
  "mcpServers": {
    "tinytask": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## API

### Tools
- Task: create_task, update_task, get_task, delete_task, archive_task, list_tasks, get_my_queue
- Comments: add_comment, update_comment, delete_comment, list_comments
- Links: add_link, update_link, delete_link, list_links

### Resources
- `task://{id}` - Full task with comments/links
- `queue://{agent_name}` - Agent's queue
- `tasks://active` - All active tasks
- And more...

See [API Documentation](docs/technical/mcp-api-design.md) for details.

## Architecture

See [Architecture Documentation](docs/technical/architecture.md)

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## License

MIT
```

### Example Workflows Document

```markdown
# Example Agent Workflows

## Workflow 1: Feature Development

1. **Product Agent** creates feature request
2. **Architect Agent** designs solution
3. **Code Agent** implements feature
4. **Review Agent** reviews code
5. **QA Agent** tests implementation
6. **Integration Agent** deploys and archives

See detailed example...

## Workflow 2: Bug Fix

1. **QA Agent** reports bug
2. **Code Agent** fixes bug
3. **QA Agent** verifies fix
4. **Integration Agent** deploys

See detailed example...
```

## Dependencies
- All previous stories (1-9)

## Subtasks

### Testing
1. [ ] Create tests/ directory structure
2. [ ] Write integration tests for multi-agent workflow
3. [ ] Write persistence tests
4. [ ] Write performance tests
5. [ ] Write error scenario tests
6. [ ] Run all tests and fix issues
7. [ ] Generate test coverage report

### Documentation
8. [ ] Write comprehensive README.md
9. [ ] Create API reference document
10. [ ] Create example workflows document
11. [ ] Create troubleshooting guide
12. [ ] Create deployment guide
13. [ ] Update technical documentation
14. [ ] Add inline code comments
15. [ ] Create CHANGELOG.md

### Final Validation
16. [ ] End-to-end test with real agents
17. [ ] Performance validation (100+ tasks)
18. [ ] Security review checklist
19. [ ] Deployment verification
20. [ ] Create GitHub release

## Testing Scenarios

### Scenario 1: Single Agent Workflow
- Create task → Update → Complete → Archive
- Verify all data persists correctly

### Scenario 2: Multi-Agent Handoff
- Create → Assign → Reassign → Complete
- Verify comments and links maintained

### Scenario 3: Persistence
- Create data → Stop Docker → Start Docker → Verify data

### Scenario 4: Concurrent Access
- 10 agents simultaneously accessing system
- No data corruption or conflicts

### Scenario 5: Large Dataset
- 500+ tasks in database
- Query performance remains acceptable

### Scenario 6: Error Handling
- Invalid parameters
- Nonexistent IDs
- Database errors
- Network interruptions

## Definition of Done
- All acceptance criteria met
- Integration tests passing
- Performance tests passing
- Persistence tests passing
- README complete and accurate
- API documentation complete
- Example workflows documented
- Troubleshooting guide created
- All code commented
- System tested end-to-end with agents
- Code committed and tagged

## Estimated Effort
**8-12 hours**

## Priority
**P0 - Critical** (Required for production readiness)

## Labels
`testing`, `documentation`, `quality`, `phase-10`

## Notes
- Don't skip testing - it's critical for production
- Documentation should be clear for both humans and agents
- Test real-world scenarios, not just happy paths
- Performance testing ensures scalability
- Good docs reduce support burden
