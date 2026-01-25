# MCP Methods for Task Blocking

## `setBlockedBy(taskId: number, blockerTaskId?: number)`
- **Purpose** – Assign or clear a blocking relationship for a task.
- **Parameters**
  - `taskId`: ID of the task being blocked or unblocked.
  - `blockerTaskId` (optional): ID of the task that blocks `taskId`. Omit or pass `null` to clear.
- **Behavior**
  - Validates that `blockerTaskId` is not equal to `taskId`.
  - Checks for circular references (e.g., A blocks B and B blocks A).
  - Persists the relationship in `tasks.blocked_by_task_id`.
  - Triggers status updates: if the blocker is closed, dependent tasks are unblocked; if reopened, they become blocked.

## `getBlockers(taskId: number): Task[]`
- **Purpose** – Retrieve all tasks that block the specified task.
- **Returns** an array of `Task` objects where `blocked_by_task_id == taskId`.
- **Use case** – Agents can query to see why they are blocked and decide whether to wait or reassign.
