# Subtasks and Queues - Implementation Stories

This directory contains the product stories for implementing hierarchical task relationships (subtasks) and queue-based task organization in TinyTask MCP.

## Overview

These features enable:
- **Subtasks**: Break down complex tasks into manageable hierarchies
- **Queues**: Organize tasks by team/functional area (dev, product, qa, etc.)

## Implementation Stories

### Story 1: Database Schema and Type System Updates
**Effort**: 2-3 hours  
**Dependencies**: None

Add database columns for `parent_task_id` and `queue_name`, create indexes, and update TypeScript type definitions.

[Read Story 1 →](./story-01-database-and-types.md)

### Story 2: Service Layer - Subtask Support
**Effort**: 4-6 hours  
**Dependencies**: Story 1

Implement service methods for creating, querying, and managing hierarchical task relationships with circular reference prevention.

[Read Story 2 →](./story-02-service-layer-subtasks.md)

### Story 3: Service Layer - Queue Management
**Effort**: 4-6 hours  
**Dependencies**: Story 1

Implement service methods for queue-based task organization, statistics, and workload visibility.

[Read Story 3 →](./story-03-service-layer-queues.md)

### Story 4: MCP Tools - Subtask Support
**Effort**: 3-4 hours  
**Dependencies**: Story 1, Story 2

Expose subtask functionality through MCP tools with proper validation and error handling.

[Read Story 4 →](./story-04-mcp-tools-subtasks.md)

### Story 5: MCP Tools - Queue Management
**Effort**: 3-4 hours  
**Dependencies**: Story 1, Story 3

Expose queue management through MCP tools for team-based task organization.

[Read Story 5 →](./story-05-mcp-tools-queues.md)

### Story 6: MCP Resources - Subtasks and Queues
**Effort**: 2-3 hours  
**Dependencies**: Story 2, Story 3

Provide MCP resources for efficient read access to hierarchical and queue-organized data.

[Read Story 6 →](./story-06-mcp-resources.md)

### Story 7: Testing and Documentation
**Effort**: 3-4 hours  
**Dependencies**: Stories 1-6

Comprehensive integration tests, performance tests, and user documentation.

[Read Story 7 →](./story-07-testing-and-documentation.md)

## Total Effort Estimate

**21-30 hours** across all stories

## Implementation Order

Stories should be implemented in numerical order due to dependencies:

```
1. Database & Types (foundation)
   ↓
2. Service Layer - Subtasks ──┐
3. Service Layer - Queues ────┤
   ↓                          ↓
4. MCP Tools - Subtasks ──────┤
5. MCP Tools - Queues ────────┤
   ↓                          ↓
6. MCP Resources ─────────────┤
   ↓
7. Testing & Documentation
```

## Key Features

### Subtasks
- Create task hierarchies (N levels deep)
- Recursive queries for all descendants
- Circular reference prevention
- CASCADE delete behavior
- Queue inheritance from parent

### Queues
- Free-form queue names (dev, product, qa, etc.)
- Queue statistics (total, by status, assigned/unassigned)
- Unassigned task discovery
- Multi-queue agent support
- Workload visibility

## Use Cases

### Task Decomposition
```typescript
// Create parent task
const epic = await create_task({
  title: 'User Authentication',
  queue_name: 'dev',
});

// Break into subtasks
await create_subtask({
  parent_task_id: epic.id,
  title: 'Design database schema',
});
```

### Sprint Planning
```typescript
// See unassigned work
const unassignedDev = await get_unassigned_in_queue({
  queue_name: 'dev',
});

// Assign to available agent
await update_task({
  id: unassignedDev.tasks[0].id,
  assigned_to: 'Vaela',
});
```

### Workload Management
```typescript
// Check queue statistics
const devStats = await get_queue_stats({ queue_name: 'dev' });
// { total: 12, assigned: 10, unassigned: 2, agents: ['Vaela', 'Gaion'] }

// See agent workload by queue
const vaelaDevWork = await get_my_queue({
  agent_name: 'Vaela',
  queue_name: 'dev',
});
```

## Technical Highlights

### Database
- Foreign key constraint for referential integrity
- Indexes for performance (parent_task_id, queue_name)
- Nullable columns for backwards compatibility
- CASCADE delete for hierarchies

### Service Layer
- Recursive CTE queries for hierarchies
- Circular reference detection
- Aggregation queries for statistics
- Transaction support for data integrity

### MCP Protocol
- 6 new tools for subtasks and queues
- 6 new resources for read access
- Enhanced existing tools
- Proper error handling

## Backwards Compatibility

All changes are backwards compatible:
- Existing tasks have `parent_task_id = NULL` (top-level)
- Existing tasks have `queue_name = NULL`
- Existing tools work unchanged
- No breaking API changes

## Testing Strategy

- **Unit Tests**: 73+ tests across all layers
- **Integration Tests**: 20+ multi-feature scenarios
- **Performance Tests**: Large hierarchies and queues
- **Target Coverage**: >90%

## Documentation

- Technical implementation plan
- User guide with workflows
- API reference updates
- Migration guide
- Code examples

## Success Metrics

- ✅ All tests passing
- ✅ Code coverage >90%
- ✅ No breaking changes
- ✅ Performance <100ms for typical queries
- ✅ Documentation complete

## Related Documentation

- [Technical Implementation Plan](../../technical/subtasks-and-queues-implementation-plan.md)
- [Database Schema](../../technical/database-schema.md)
- [Architecture Overview](../../technical/architecture.md)

## Questions or Issues?

Refer to the technical implementation plan for detailed architecture decisions and trade-offs.
