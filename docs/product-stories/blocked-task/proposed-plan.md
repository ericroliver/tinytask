# Proposed Plan for Task‑Blocking Feature

## Overview
The plan outlines the steps to add a *blocking* relationship between tasks in TinyTask. It covers database changes, TypeScript updates, service logic, MCP exposure, testing, and documentation.

## Steps
1. **Database Migration** – Add `blocked_by_task_id` column to `tasks` table with foreign key and index.
2. **TypeScript Types** – Extend `Task`, `CreateTaskInput`, and `UpdateTaskInput` with `blocked_by_task_id?: number | null`.
3. **Service Layer** – Validate no self‑blocking or circular references; on status change, automatically unblock/relate dependent tasks.
4. **MCP Resources & Tools** – Expose `blockedByTaskId` in task resource and create/update tools. Add new MCP methods:
   * `setBlockedBy(taskId, blockerTaskId)` – set or clear the blocking relationship.
   * `getBlockers(taskId)` – list tasks that block a given task.
5. **Integration Tests** – Cover creation, update, status transitions, and edge cases.
6. **Documentation** – Update PRD, technical schema doc, and product stories.

## Acceptance Criteria
- Tasks can be created/updated with a valid `blockedByTaskId`.
- Self‑blocking and circular references are rejected.
- Closing a blocker unblocks dependents; reopening re‑blocks them.
- MCP API includes `blockedByTaskId` in responses and accepts it on create/update.
- All tests, linting, and build succeed.
