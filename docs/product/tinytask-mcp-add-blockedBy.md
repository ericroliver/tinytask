# TinyTask MCP Product Requirements Document

## Feature: Task Blocking (`blockedByTaskId`)

### Overview
The TinyTask system will support a *blocking* relationship between tasks. A task can be marked as blocked by another task, preventing it from being worked on until the blocking task is completed. The relationship is **bidirectional**: when a blocking task is closed, all dependent tasks are automatically unblocked, but the relationship is preserved so that if the blocking task is reopened, dependent tasks become blocked again.

### Requirements
1. **Schema** – Add a nullable foreign key column `blocked_by_task_id` to the `tasks` table, referencing `tasks(id)` with `ON DELETE SET NULL`.
2. **Business Logic** –
   * When a task is created or updated with `blockedByTaskId`, validate that the value is not equal to its own `id`.
   * When a task’s status changes:
     - **Closed**: All tasks that reference this task in `blocked_by_task_id` are automatically unblocked (their internal *is_blocked* flag is cleared).
     - **Reopened**: All tasks that reference this task are automatically blocked again (their *is_blocked* flag is set).
3. **API Exposure** – The MCP task resource and tools must expose the `blockedByTaskId` field. Clients can set or clear it via the existing create/update task tools.
4. **Persistence** – The blocking relationship must survive database restarts and migrations.
5. **Testing** – Integration tests covering creation, update, status transitions, and edge cases (self‑blocking, circular references).

### Acceptance Criteria
- A task can be created with a `blockedByTaskId` that references an existing, different task.
- The system rejects attempts to block a task by itself or create circular blocking chains.
- Closing a blocking task automatically unblocks all dependent tasks.
- Reopening a previously closed blocking task re‑blocks its dependents until the relationship is cleared.
- The MCP API returns `blockedByTaskId` in task responses and accepts it on create/update.
- All tests pass, linting passes, and the build succeeds.
