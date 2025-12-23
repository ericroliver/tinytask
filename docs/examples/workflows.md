# Example Agent Workflows

This document provides detailed examples of how multiple LLM agents can collaborate using TinyTask MCP.

## Workflow 1: Feature Development

This workflow demonstrates a complete feature development lifecycle involving multiple specialized agents.

### Participants
- Product Agent (creates requirements)
- Architect Agent (designs solution)
- Code Agent (implements feature)
- Review Agent (reviews implementation)
- QA Agent (tests feature)
- Integration Agent (deploys and archives)

### Step-by-Step Flow

#### 1. Product Agent Creates Feature Request

```typescript
// Product agent creates a new feature request
const task = await mcpClient.callTool('create_task', {
  title: 'Implement user authentication',
  description: 'Users need to be able to log in with email and password. Include password reset functionality.',
  assigned_to: 'architect-agent',
  created_by: 'product-agent',
  priority: 10,
  status: 'idle'
});
// Returns: { id: 1, title: 'Implement user authentication', ... }
```

#### 2. Architect Agent Designs Solution

```typescript
// Check queue for assigned tasks
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'architect-agent'
});
// Returns: { agent_name: 'architect-agent', tasks: [{ id: 1, ... }] }

// Start working on the task
await mcpClient.callTool('update_task', {
  id: 1,
  status: 'working'
});

// Add design document
await mcpClient.callTool('add_link', {
  task_id: 1,
  url: '/docs/auth-architecture.md',
  description: 'Authentication system architecture',
  created_by: 'architect-agent'
});

// Add design comment
await mcpClient.callTool('add_comment', {
  task_id: 1,
  content: 'Designed JWT-based authentication with refresh tokens. Database schema includes users table with bcrypt password hashing.',
  created_by: 'architect-agent'
});

// Reassign to code agent
await mcpClient.callTool('update_task', {
  id: 1,
  assigned_to: 'code-agent',
  status: 'idle'
});
```

#### 3. Code Agent Implements Feature

```typescript
// Check queue
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'code-agent'
});

// Start implementation
await mcpClient.callTool('update_task', {
  id: 1,
  status: 'working'
});

// Add implementation artifacts
await mcpClient.callTool('add_link', {
  task_id: 1,
  url: '/src/auth/login.ts',
  description: 'Login endpoint implementation',
  created_by: 'code-agent'
});

await mcpClient.callTool('add_link', {
  task_id: 1,
  url: '/src/auth/password-reset.ts',
  description: 'Password reset implementation',
  created_by: 'code-agent'
});

// Add progress comment
await mcpClient.callTool('add_comment', {
  task_id: 1,
  content: 'Implementation complete. Added login, registration, and password reset endpoints.',
  created_by: 'code-agent'
});

// Reassign to review agent
await mcpClient.callTool('update_task', {
  id: 1,
  assigned_to: 'review-agent',
  status: 'idle'
});
```

#### 4. Review Agent Reviews Code

```typescript
// Check queue
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'review-agent'
});

// Start review
await mcpClient.callTool('update_task', {
  id: 1,
  status: 'working'
});

// Add review comments
await mcpClient.callTool('add_comment', {
  task_id: 1,
  content: 'Code review complete. Security best practices followed. Suggested minor improvement: add rate limiting to login endpoint.',
  created_by: 'review-agent'
});

// Reassign to QA
await mcpClient.callTool('update_task', {
  id: 1,
  assigned_to: 'qa-agent',
  status: 'idle'
});
```

#### 5. QA Agent Tests Implementation

```typescript
// Check queue
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'qa-agent'
});

// Start testing
await mcpClient.callTool('update_task', {
  id: 1,
  status: 'working'
});

// Add test results
await mcpClient.callTool('add_link', {
  task_id: 1,
  url: '/tests/auth.test.ts',
  description: 'Authentication test suite',
  created_by: 'qa-agent'
});

await mcpClient.callTool('add_comment', {
  task_id: 1,
  content: 'All tests passing. Verified: login, registration, password reset, token refresh, and error handling.',
  created_by: 'qa-agent'
});

// Reassign to integration agent
await mcpClient.callTool('update_task', {
  id: 1,
  assigned_to: 'integration-agent',
  status: 'idle'
});
```

#### 6. Integration Agent Deploys and Archives

```typescript
// Check queue
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'integration-agent'
});

// Start deployment
await mcpClient.callTool('update_task', {
  id: 1,
  status: 'working'
});

// Add deployment info
await mcpClient.callTool('add_comment', {
  task_id: 1,
  content: 'Deployed to production. All systems operational.',
  created_by: 'integration-agent'
});

// Complete and archive
await mcpClient.callTool('update_task', {
  id: 1,
  status: 'complete'
});

await mcpClient.callTool('archive_task', {
  id: 1
});
```

---

## Workflow 2: Bug Fix

A streamlined workflow for fixing bugs.

### Participants
- QA Agent (reports bug)
- Code Agent (fixes bug)
- QA Agent (verifies fix)
- Integration Agent (deploys)

### Step-by-Step Flow

#### 1. QA Agent Reports Bug

```typescript
const task = await mcpClient.callTool('create_task', {
  title: 'Fix: Login fails with special characters in email',
  description: 'Users with + or . in email addresses cannot log in. Error: "Invalid email format"',
  assigned_to: 'code-agent',
  created_by: 'qa-agent',
  priority: 15, // High priority
  status: 'idle'
});

// Add reproduction steps
await mcpClient.callTool('add_comment', {
  task_id: task.id,
  content: 'Steps to reproduce:\n1. Try to login with email: user+test@example.com\n2. System rejects as invalid\n3. Expected: Should accept valid email format',
  created_by: 'qa-agent'
});
```

#### 2. Code Agent Fixes Bug

```typescript
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'code-agent'
});

await mcpClient.callTool('update_task', {
  id: task.id,
  status: 'working'
});

// Fix and document
await mcpClient.callTool('add_comment', {
  task_id: task.id,
  content: 'Fixed email validation regex to properly handle RFC-compliant email addresses including + and . characters.',
  created_by: 'code-agent'
});

await mcpClient.callTool('add_link', {
  task_id: task.id,
  url: '/src/auth/validation.ts#L45',
  description: 'Updated email validation',
  created_by: 'code-agent'
});

// Reassign back to QA
await mcpClient.callTool('update_task', {
  id: task.id,
  assigned_to: 'qa-agent',
  status: 'idle'
});
```

#### 3. QA Agent Verifies Fix

```typescript
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'qa-agent'
});

await mcpClient.callTool('update_task', {
  id: task.id,
  status: 'working'
});

await mcpClient.callTool('add_comment', {
  task_id: task.id,
  content: 'Verified fix. Emails with special characters now work correctly. Tested with multiple formats.',
  created_by: 'qa-agent'
});

// Ready for deployment
await mcpClient.callTool('update_task', {
  id: task.id,
  assigned_to: 'integration-agent',
  status: 'idle'
});
```

#### 4. Integration Agent Deploys

```typescript
await mcpClient.callTool('update_task', {
  id: task.id,
  status: 'working'
});

await mcpClient.callTool('add_comment', {
  task_id: task.id,
  content: 'Deployed to production as hotfix v1.2.1',
  created_by: 'integration-agent'
});

await mcpClient.callTool('update_task', {
  id: task.id,
  status: 'complete'
});

await mcpClient.callTool('archive_task', {
  id: task.id
});
```

---

## Workflow 3: Research Task

A workflow for research and exploration tasks.

### Participants
- Product Agent (requests research)
- Research Agent (conducts research)
- Architect Agent (reviews findings)

```typescript
// Product agent creates research task
const task = await mcpClient.callTool('create_task', {
  title: 'Research: Best practices for API rate limiting',
  description: 'Investigate different rate limiting strategies for our API',
  assigned_to: 'research-agent',
  created_by: 'product-agent',
  priority: 5,
  status: 'idle'
});

// Research agent conducts research
await mcpClient.callTool('update_task', {
  id: task.id,
  status: 'working'
});

// Add findings
await mcpClient.callTool('add_link', {
  task_id: task.id,
  url: '/docs/research/rate-limiting-comparison.md',
  description: 'Comparison of rate limiting strategies',
  created_by: 'research-agent'
});

await mcpClient.callTool('add_comment', {
  task_id: task.id,
  content: 'Researched 5 different approaches. Recommend token bucket algorithm with Redis backend for our use case.',
  created_by: 'research-agent'
});

// Reassign to architect for review
await mcpClient.callTool('update_task', {
  id: task.id,
  assigned_to: 'architect-agent',
  status: 'idle'
});

// Architect reviews and completes
await mcpClient.callTool('add_comment', {
  task_id: task.id,
  content: 'Reviewed research findings. Agrees with recommendation. Creating implementation task.',
  created_by: 'architect-agent'
});

await mcpClient.callTool('update_task', {
  id: task.id,
  status: 'complete'
});
```

---

## Workflow 4: Parallel Development

Multiple agents working on independent tasks simultaneously.

```typescript
// Product agent creates multiple tasks
const tasks = await Promise.all([
  mcpClient.callTool('create_task', {
    title: 'Add dark mode',
    assigned_to: 'code-agent-1',
    created_by: 'product-agent',
    priority: 8
  }),
  mcpClient.callTool('create_task', {
    title: 'Optimize database queries',
    assigned_to: 'code-agent-2',
    created_by: 'product-agent',
    priority: 9
  }),
  mcpClient.callTool('create_task', {
    title: 'Update documentation',
    assigned_to: 'doc-agent',
    created_by: 'product-agent',
    priority: 5
  })
]);

// Each agent works independently
// Agent 1 checks their queue
const queue1 = await mcpClient.callTool('get_my_queue', {
  agent_name: 'code-agent-1'
});

// Agent 2 checks their queue
const queue2 = await mcpClient.callTool('get_my_queue', {
  agent_name: 'code-agent-2'
});

// All agents work concurrently without conflicts
// TinyTask handles concurrent access safely
```

---

## Tips for Effective Workflows

1. **Use Clear Task Titles**: Make it easy to understand what needs to be done
2. **Leverage Comments**: Document decisions and progress
3. **Add Links Early**: Reference relevant documents and code
4. **Check Queues Regularly**: Agents should poll their queues for new work
5. **Use Priority**: Higher priority tasks appear first in queues
6. **Update Status**: Keep task status current (idle → working → complete)
7. **Reassign Thoughtfully**: Move tasks to the next appropriate agent
8. **Archive When Done**: Keep the active task list clean

## Resource URIs for Quick Access

Agents can also use MCP resources for quick access to information:

```typescript
// View full task with all details
const task = await mcpClient.getResource('task://1');

// View an agent's queue
const queue = await mcpClient.getResource('queue://code-agent');

// View all active tasks
const active = await mcpClient.getResource('tasks://active');

// View tasks by status
const working = await mcpClient.getResource('tasks://working');

// View high-priority tasks
const priority = await mcpClient.getResource('tasks://by-priority');
```

## Monitoring Agent Activity

```typescript
// List all active tasks to see what's in progress
const activeTasks = await mcpClient.callTool('list_tasks');

// Check specific agent's workload
const queue = await mcpClient.callTool('get_my_queue', {
  agent_name: 'code-agent'
});

console.log(`Agent has ${queue.tasks.length} tasks in queue`);

// Get detailed task info including history
const task = await mcpClient.callTool('get_task', { id: 1 });
console.log(`Comments: ${task.comments.length}`);
console.log(`Links: ${task.links.length}`);
```
