# Story 7: Testing and Documentation

## Overview
Comprehensive testing and documentation for subtask and queue management features to ensure quality, maintainability, and usability.

## User Story
**As a** TinyTask developer and user  
**I want** comprehensive tests and documentation  
**So that** features work reliably and are easy to understand and use

## Business Value
- Ensures feature reliability and correctness
- Prevents regressions in existing functionality
- Provides clear usage guidance for users
- Facilitates future maintenance and enhancements

## Acceptance Criteria

### Integration Tests
- [ ] Create and query 3-level task hierarchy
- [ ] Create tasks across multiple queues
- [ ] Query queue with various filters
- [ ] Move tasks between queues
- [ ] Move subtasks between parents
- [ ] Delete parent cascades to subtasks
- [ ] Archive parent does not affect subtasks
- [ ] Agent works across multiple queues
- [ ] Combined subtask + queue scenarios

### Performance Tests
- [ ] Query task with 100+ subtasks
- [ ] Recursive query with 10+ levels deep
- [ ] Query queue with 1000+ tasks
- [ ] List all queues with 100+ queues
- [ ] Concurrent access to same task/queue
- [ ] Index effectiveness verified

### Backwards Compatibility Tests
- [ ] Existing tasks work without parent_task_id
- [ ] Existing tasks work without queue_name
- [ ] Existing tools work unchanged
- [ ] Existing resources work unchanged
- [ ] Migration from old to new schema works
- [ ] No data loss during migration

### Documentation Updates
- [ ] README.md updated with new features
- [ ] API reference updated with new tools/resources
- [ ] Database schema documentation updated
- [ ] Migration guide created
- [ ] Usage examples added
- [ ] Architecture documentation updated
- [ ] Changelog updated

### Examples and Guides
- [ ] Subtask workflow examples
- [ ] Queue management examples
- [ ] Sprint planning workflow
- [ ] Capacity planning workflow
- [ ] Combined scenarios (subtasks + queues)

## Technical Details

### Integration Test Scenarios

```typescript
// Test 1: Multi-level hierarchy
describe('Task Hierarchy', () => {
  it('should create and query 3-level hierarchy', async () => {
    // Create parent
    const parent = await taskService.create({
      title: 'Parent Task',
      queue_name: 'dev',
    });

    // Create child
    const child = await taskService.create({
      title: 'Child Task',
      parent_task_id: parent.id,
    });

    // Create grandchild
    const grandchild = await taskService.create({
      title: 'Grandchild Task',
      parent_task_id: child.id,
    });

    // Query each level
    const parentSubtasks = await taskService.getSubtasks(parent.id);
    expect(parentSubtasks).toHaveLength(1);

    const allDescendants = await taskService.getSubtasks(parent.id, true);
    expect(allDescendants).toHaveLength(2);

    // Delete parent cascades
    await taskService.delete(parent.id);
    expect(await taskService.get(child.id)).toBeNull();
    expect(await taskService.get(grandchild.id)).toBeNull();
  });
});

// Test 2: Queue management
describe('Queue Management', () => {
  it('should manage tasks across multiple queues', async () => {
    // Create tasks in different queues
    await taskService.create({
      title: 'Dev Task 1',
      queue_name: 'dev',
      assigned_to: 'Vaela',
    });
    
    await taskService.create({
      title: 'Dev Task 2',
      queue_name: 'dev',
    });
    
    await taskService.create({
      title: 'QA Task 1',
      queue_name: 'qa',
      assigned_to: 'Zaeion',
    });

    // Query queues
    const devTasks = await taskService.getQueueTasks('dev');
    expect(devTasks).toHaveLength(2);

    const qaTasks = await taskService.getQueueTasks('qa');
    expect(qaTasks).toHaveLength(1);

    // Get unassigned
    const unassignedDev = await taskService.getUnassignedInQueue('dev');
    expect(unassignedDev).toHaveLength(1);

    // Get stats
    const devStats = await taskService.getQueueStats('dev');
    expect(devStats.total_tasks).toBe(2);
    expect(devStats.assigned).toBe(1);
    expect(devStats.unassigned).toBe(1);
  });
});

// Test 3: Combined subtasks and queues
describe('Subtasks and Queues Combined', () => {
  it('should handle subtasks across different queues', async () => {
    // Create parent in product queue
    const parent = await taskService.create({
      title: 'Product Feature',
      queue_name: 'product',
      assigned_to: 'Spartus',
    });

    // Create dev subtask
    const devSubtask = await taskService.create({
      title: 'Implement Feature',
      parent_task_id: parent.id,
      queue_name: 'dev',
      assigned_to: 'Vaela',
    });

    // Create QA subtask
    const qaSubtask = await taskService.create({
      title: 'Test Feature',
      parent_task_id: parent.id,
      queue_name: 'qa',
      assigned_to: 'Zaeion',
    });

    // Product queue includes parent only
    const productTasks = await taskService.getQueueTasks('product', {
      include_subtasks: false,
    });
    expect(productTasks).toHaveLength(1);

    // Dev queue includes dev subtask
    const devTasks = await taskService.getQueueTasks('dev');
    expect(devTasks).toHaveLength(1);
    expect(devTasks[0].id).toBe(devSubtask.id);

    // Subtasks query returns both
    const subtasks = await taskService.getSubtasks(parent.id);
    expect(subtasks).toHaveLength(2);
  });
});
```

### Performance Test Scenarios

```typescript
describe('Performance', () => {
  it('should handle task with 100 subtasks', async () => {
    const parent = await taskService.create({ title: 'Parent' });

    // Create 100 subtasks
    for (let i = 0; i < 100; i++) {
      await taskService.create({
        title: `Subtask ${i}`,
        parent_task_id: parent.id,
      });
    }

    // Query should be fast
    const start = Date.now();
    const subtasks = await taskService.getSubtasks(parent.id);
    const duration = Date.now() - start;

    expect(subtasks).toHaveLength(100);
    expect(duration).toBeLessThan(100); // < 100ms
  });

  it('should handle recursive query 10 levels deep', async () => {
    // Create chain: 1 -> 2 -> 3 -> ... -> 10
    let parentId = null;
    for (let i = 1; i <= 10; i++) {
      const task = await taskService.create({
        title: `Level ${i}`,
        parent_task_id: parentId,
      });
      parentId = task.id;
    }

    // Query recursively from root
    const start = Date.now();
    const allDescendants = await taskService.getSubtasks(1, true);
    const duration = Date.now() - start;

    expect(allDescendants).toHaveLength(9);
    expect(duration).toBeLessThan(100); // < 100ms
  });

  it('should handle queue with 1000 tasks', async () => {
    // Create 1000 tasks in dev queue
    for (let i = 0; i < 1000; i++) {
      await taskService.create({
        title: `Task ${i}`,
        queue_name: 'dev',
      });
    }

    // Query should be fast
    const start = Date.now();
    const tasks = await taskService.getQueueTasks('dev');
    const duration = Date.now() - start;

    expect(tasks).toHaveLength(1000);
    expect(duration).toBeLessThan(200); // < 200ms
  });
});
```

### Documentation Structure

```markdown
# docs/technical/subtasks-and-queues-implementation-plan.md
- Complete technical specification
- Architecture decisions
- Implementation phases

# docs/product/subtasks-and-queues-guide.md
- User-facing documentation
- Common workflows
- Best practices
- Examples

# README.md updates
- Feature overview
- Quick start examples
- Link to detailed docs

# CHANGELOG.md entry
- New features added
- API changes
- Migration notes

# Migration guide
- Upgrading existing databases
- Updating existing code
- Common patterns
```

### Usage Examples

```markdown
## Example 1: Task Decomposition

Break down a complex task into manageable subtasks:

```typescript
// Create epic
const epic = await mcp.call('create_task', {
  title: 'User Authentication System',
  queue_name: 'dev',
  priority: 10,
});

// Create subtasks
const dbTask = await mcp.call('create_subtask', {
  parent_task_id: epic.id,
  title: 'Design database schema',
  assigned_to: 'Vaela',
});

const apiTask = await mcp.call('create_subtask', {
  parent_task_id: epic.id,
  title: 'Implement API endpoints',
  assigned_to: 'Gaion',
});

const testTask = await mcp.call('create_subtask', {
  parent_task_id: epic.id,
  title: 'Write tests',
  queue_name: 'qa',
  assigned_to: 'Zaeion',
});
```

## Example 2: Sprint Planning

View team workload and plan assignments:

```typescript
// See all queues
const queues = await mcp.call('list_queues', { include_stats: true });

// Find queue with most unassigned work
const needsHelp = queues.queues
  .sort((a, b) => b.stats.unassigned - a.stats.unassigned)[0];

console.log(`${needsHelp.queue_name} has ${needsHelp.stats.unassigned} unassigned tasks`);

// Get unassigned tasks
const unassigned = await mcp.call('get_unassigned_in_queue', {
  queue_name: needsHelp.queue_name,
  status: 'idle',
});

// Assign to available agent
await mcp.call('update_task', {
  id: unassigned.tasks[0].id,
  assigned_to: 'AvailableAgent',
});
```

## Example 3: Capacity Management

Track agent workload across teams:

```typescript
// Check Vaela's workload
const vaelaAll = await mcp.call('get_my_queue', { agent_name: 'Vaela' });
const vaelaByQueue = {};

for (const task of vaelaAll.tasks) {
  const queue = task.queue_name || 'unassigned';
  vaelaByQueue[queue] = (vaelaByQueue[queue] || 0) + 1;
}

console.log('Vaela workload by queue:', vaelaByQueue);
```
```

## Testing Requirements

### Unit Tests (existing stories)
- Story 1: 5 tests
- Story 2: 15 tests
- Story 3: 15 tests
- Story 4: 12 tests
- Story 5: 13 tests
- Story 6: 13 tests

### Integration Tests (this story)
- [ ] 10+ multi-feature integration tests
- [ ] 5+ performance tests
- [ ] 5+ backwards compatibility tests

### Total Test Coverage
- [ ] Overall code coverage >90%
- [ ] All critical paths covered
- [ ] Edge cases tested
- [ ] Error paths tested

## Documentation Requirements

### Technical Documentation
- [ ] Implementation plan (already created)
- [ ] Architecture document updates
- [ ] Database schema documentation
- [ ] API reference updates

### User Documentation
- [ ] User guide for subtasks
- [ ] User guide for queues
- [ ] Workflow examples
- [ ] Best practices
- [ ] FAQ section

### Developer Documentation
- [ ] Migration guide for existing code
- [ ] Changelog entry
- [ ] Release notes
- [ ] Code comments

## Definition of Done
- [ ] All integration tests passing
- [ ] All performance tests passing
- [ ] All backwards compatibility tests passing
- [ ] Overall test coverage >90%
- [ ] All documentation complete and reviewed
- [ ] Examples tested and working
- [ ] Migration guide verified
- [ ] Changelog updated
- [ ] No open bugs or issues
- [ ] Code reviewed and approved

## Estimated Effort
**3-4 hours**

## Dependencies
- All previous stories (1-6) MUST be complete

## Related Stories
- Story 1: Database Schema
- Story 2: Service Layer - Subtasks
- Story 3: Service Layer - Queues
- Story 4: MCP Tools - Subtasks
- Story 5: MCP Tools - Queues
- Story 6: MCP Resources

## Notes
- Focus on real-world scenarios in integration tests
- Performance benchmarks should be documented
- Examples should be copy-paste ready
- Documentation should target both LLM agents and human users
- Migration guide critical for existing users
