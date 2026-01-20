# Story 3: Service Layer - Queue Management

## Overview
Implement service layer methods to support queue-based task organization, enabling team-level task management and workload visibility.

## User Story
**As a** TinyTask API consumer  
**I want** service methods to organize and query tasks by queue  
**So that** I can manage tasks at the team level and track workload distribution

## Business Value
- Enables team-based task organization (dev, product, qa teams)
- Provides visibility into unassigned work
- Supports workload balancing across team members
- Facilitates sprint planning and capacity management

## Acceptance Criteria

### Core Functionality
- [ ] `create()` accepts `queue_name` parameter
- [ ] `update()` accepts `queue_name` parameter and allows queue changes
- [ ] `queue_name` is optional and nullable
- [ ] No validation on queue names (free-form text)

### New Methods
- [ ] `getQueueTasks(queueName, filters)` returns all tasks in queue
- [ ] `getQueueStats(queueName)` returns statistics for queue
- [ ] `getUnassignedInQueue(queueName)` returns unassigned tasks
- [ ] `listQueues()` returns all active queue names with counts
- [ ] `getQueueAgents(queueName)` returns agents working in queue

### Enhanced Methods
- [ ] `list()` accepts `queue_name` filter
- [ ] `list()` supports filtering by queue + other criteria (status, assigned_to)
- [ ] `getQueue(agentName)` accepts optional `queue_name` filter
- [ ] Agent queue filtered by queue returns subset of assigned tasks

### Queue Statistics
- [ ] Total task count by queue
- [ ] Tasks by status (idle, working, complete)
- [ ] Assigned vs unassigned count
- [ ] List of agents with tasks in queue
- [ ] Average priority in queue
- [ ] Optional: completion percentage

## Technical Details

### Method Signatures

```typescript
export class TaskService {
  
  // Get all tasks in a queue
  getQueueTasks(
    queueName: string, 
    filters?: {
      assigned_to?: string;
      status?: TaskStatus;
      include_subtasks?: boolean;
      include_archived?: boolean;
    }
  ): ParsedTask[] {
    // SELECT * FROM tasks WHERE queue_name = ?
    // Apply additional filters
    // Optionally exclude subtasks if include_subtasks=false
  }
  
  // Get queue statistics
  getQueueStats(queueName: string): QueueStats {
    // Count tasks by status
    // Count assigned vs unassigned
    // Get unique agent list
    // Calculate averages
  }
  
  // Get unassigned tasks in queue
  getUnassignedInQueue(queueName: string, filters?: {
    status?: TaskStatus;
    parent_task_id?: number | null;
  }): ParsedTask[] {
    // SELECT * FROM tasks 
    // WHERE queue_name = ? AND assigned_to IS NULL
  }
  
  // List all active queues
  listQueues(includeStats = false): Array<{ 
    queue_name: string; 
    task_count: number;
    stats?: QueueStats;
  }> {
    // SELECT DISTINCT queue_name, COUNT(*) as task_count
    // FROM tasks WHERE queue_name IS NOT NULL
    // GROUP BY queue_name
  }
  
  // Get agents working in queue
  getQueueAgents(queueName: string): Array<{
    agent_name: string;
    task_count: number;
    idle_count: number;
    working_count: number;
  }> {
    // SELECT assigned_to, COUNT(*), status counts
    // FROM tasks WHERE queue_name = ?
    // GROUP BY assigned_to
  }
  
  // Enhanced getQueue with queue filter
  getQueue(agentName: string, queueName?: string): ParsedTask[] {
    // SELECT * FROM tasks
    // WHERE assigned_to = ? AND status IN ('idle', 'working')
    // AND (queue_name = ? OR ? IS NULL)
  }
}
```

### SQL Queries

```sql
-- Get all tasks in queue
SELECT * FROM tasks 
WHERE queue_name = ? 
AND archived_at IS NULL
ORDER BY priority DESC, created_at ASC;

-- Get queue statistics
SELECT 
  queue_name,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle,
  SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working,
  SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete,
  SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned,
  SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END) as assigned,
  AVG(priority) as avg_priority
FROM tasks
WHERE queue_name = ? 
AND archived_at IS NULL;

-- Get unique agents in queue
SELECT DISTINCT assigned_to
FROM tasks
WHERE queue_name = ? 
AND assigned_to IS NOT NULL
AND archived_at IS NULL
ORDER BY assigned_to;

-- Get unassigned tasks in queue
SELECT * FROM tasks
WHERE queue_name = ?
AND assigned_to IS NULL
AND archived_at IS NULL
ORDER BY priority DESC, created_at ASC;

-- List all queues with counts
SELECT 
  queue_name,
  COUNT(*) as task_count
FROM tasks
WHERE queue_name IS NOT NULL
AND archived_at IS NULL
GROUP BY queue_name
ORDER BY queue_name;

-- Get agent task breakdown by queue
SELECT 
  assigned_to,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle,
  SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working
FROM tasks
WHERE queue_name = ?
AND assigned_to IS NOT NULL
AND archived_at IS NULL
GROUP BY assigned_to
ORDER BY total DESC;
```

### QueueStats Type

```typescript
export interface QueueStats {
  queue_name: string;
  total_tasks: number;
  by_status: {
    idle: number;
    working: number;
    complete: number;
  };
  assigned: number;
  unassigned: number;
  agents: string[];
  avg_priority?: number;
}
```

## Testing Requirements

### Unit Tests
- [ ] Create task with queue_name
- [ ] Create task without queue_name (NULL)
- [ ] Update task to change queue_name
- [ ] Update task to remove queue_name (set NULL)
- [ ] Get all tasks in queue
- [ ] Get unassigned tasks in queue
- [ ] Get queue statistics (all fields)
- [ ] Get queue statistics for empty queue
- [ ] Get queue statistics for queue with mixed statuses
- [ ] List all queues
- [ ] List queues with stats
- [ ] Get queue agents
- [ ] Get agent queue filtered by queue_name
- [ ] Get agent queue without queue filter

### Integration Tests
- [ ] Create tasks in multiple queues (dev, product, qa)
- [ ] Query each queue independently
- [ ] Filter queue by assigned_to
- [ ] Filter queue by status
- [ ] Move task between queues
- [ ] Agent works in multiple queues
- [ ] Agent queue filtered by specific queue

### Edge Cases
- [ ] Queue with no tasks
- [ ] Queue with all unassigned tasks
- [ ] Queue with all assigned tasks
- [ ] Queue with 1000+ tasks performs adequately
- [ ] Queue name with special characters
- [ ] Empty string queue_name (treated as NULL?)
- [ ] Case sensitivity in queue names

## Use Case Examples

### Example 1: Sprint Planning
```typescript
// See all dev queue tasks
const devTasks = taskService.getQueueTasks('dev');

// See unassigned dev work
const unassignedDev = taskService.getUnassignedInQueue('dev');

// Get dev queue statistics
const devStats = taskService.getQueueStats('dev');
// Returns: { total: 10, idle: 4, working: 5, complete: 1, unassigned: 2, assigned: 8, agents: ['Vaela', 'Gaion'] }
```

### Example 2: Workload Balancing
```typescript
// Get all queues
const queues = taskService.listQueues(true);
// Returns: [
//   { queue_name: 'dev', task_count: 10, stats: {...} },
//   { queue_name: 'product', task_count: 6, stats: {...} },
//   { queue_name: 'qa', task_count: 8, stats: {...} }
// ]

// Find queue with most unassigned work
const queueNeedingHelp = queues
  .sort((a, b) => (b.stats?.unassigned || 0) - (a.stats?.unassigned || 0))[0];
```

### Example 3: Agent Capacity
```typescript
// See Vaela's work in dev queue only
const vaelaDevTasks = taskService.getQueue('Vaela', 'dev');

// See all of Vaela's work across queues
const vaelaAllTasks = taskService.getQueue('Vaela');
```

## Performance Considerations
- Indexes on `queue_name` and composite `(queue_name, status)` are critical
- Statistics queries use aggregation - should be fast with proper indexes
- Consider caching queue lists if queried frequently
- Large queues (1000+ tasks) should still perform well with indexes

## Migration from Existing Code
- No breaking changes to existing API
- Existing tasks have `queue_name = NULL`
- All existing functionality remains intact
- `getQueue()` remains backwards compatible with optional queue filter

## Dependencies
- Story 1: Database Schema and Type System Updates (MUST be complete)
- Indexes on queue_name must exist

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All service methods implemented
- [ ] All unit tests passing (15+ tests)
- [ ] All integration tests passing
- [ ] Code coverage >90%
- [ ] Code reviewed and approved
- [ ] Performance tests show acceptable query times
- [ ] No breaking changes to existing API
- [ ] Documentation includes usage examples

## Estimated Effort
**4-6 hours**

## Related Stories
- Story 1: Database Schema and Type System Updates (prerequisite)
- Story 2: Service Layer - Subtasks
- Story 5: MCP Tools - Queues

## Notes
- Queue names are free-form text (not validated against predefined list)
- Empty string should be treated as NULL for consistency
- Queue changes should be rare compared to assignment changes
- Consider adding queue name validation in future if needed
- Statistics are calculated on-demand (not cached)
- Agents can work across multiple queues simultaneously
