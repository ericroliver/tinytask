# Story: Task Blocking Feature

## Description
Implement a blocking relationship between tasks so that a task can be marked as *blocked by* another task. The blocker must not be the same task, and circular references are disallowed.

## Acceptance Criteria
- A task can be created with a `blockedByTaskId` referencing an existing, different task.
- The system rejects attempts to block a task by itself or create circular blocking chains.
- Closing a blocking task automatically unblocks all dependent tasks.
- Reopening a previously closed blocking task re‑blocks its dependents until the relationship is cleared.
- The MCP API returns `blockedByTaskId` in task responses and accepts it on create/update.
- All integration tests pass.
