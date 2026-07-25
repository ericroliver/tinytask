# Scenario Group A: Core Task Lifecycle

> **Prerequisite:** Read [00-Foundation.md](./00-Foundation.md) for core concepts, data model, roles, and queue rules.
> **Scope:** The five fundamental scenarios that cover the normal lifecycle of a task from creation through archival.

---

## Scenarios Covered

| # | Scenario | Summary |
|---|---|---|
| A1 | Standard Task Creation | Creating a new task, assigning to a queue and agent |
| A2 | Task Pickup & Start | An agent claims a task from their queue and begins work |
| A3 | Task Completion & Handoff | Developer finishes work and hands off to the next stage |
| A4 | Task Reassignment | Transferring a task between agents or queues |
| A5 | Task Archival | Cleaning up completed tasks |

---

## A1: Standard Task Creation

### When to Use

You need to create a new unit of work — a feature, a bug, a research item, or any actionable task. This is the starting point for all work in TinyTask.

### Who Can Perform

Any agent can create a task. The creator is recorded in the `created_by` field.

### Prerequisites

- The `tinytask` CLI is installed and configured (`tinytask config init` has been run).
- The server URL is set (`tinytask config set url http://your-server/mcp`).
- You know which queue and agent the task should be routed to.

### Step-by-Step Process

#### Step 1: Compose the Task

Before running any commands, decide:

- **Title**: Action verb + specific subject (e.g., "Implement pagination on task list endpoint").
- **Description**: Detailed requirements, acceptance criteria, and context.
- **Priority**: `low`, `medium`, `high`, or `urgent` (default: `medium`).
- **Tags**: Component or concern labels (e.g., `api`, `cli`, `database`).
- **Assignee**: The agent who should pick this up (e.g., `tko-sword`).
- **Queue**: The queue this task should land in (e.g., `ready-for-development`).

#### Step 2: Create the Task

```bash
tinytask task create "Implement pagination on task list endpoint" \
  -d "Add limit/offset pagination to GET /tasks. Default limit 50, max 200. Return total count in response header." \
  --assigned-to tko-sword \
  --priority 7 \
  --tags "api,pagination"
```

The CLI returns the created task with its auto-generated ID (e.g., `20260724_01`).

#### Step 3: Assign to a Queue

If you didn't specify `--queue` during creation, move the task to the appropriate queue:

```bash
tinytask queue add 20260724_01 ready-for-development
```

Or use the update command:

```bash
tinytask task update 20260724_01 --queue ready-for-development
```

#### Step 4: Add an Initial Comment (Optional but Recommended)

Provide context for the assignee:

```bash
tinytask comment add 20260724_01 "Created for sprint 3. See API spec doc for pagination contract. Assignee should review before starting."
```

#### Step 5: Verify

Confirm the task was created correctly:

```bash
tinytask task get 20260724_01
```

Check that `status` is `idle`, `assigned_to` is correct, and `queue_name` is the intended queue.

### Variations

#### Creating a Task with No Assignee

Tasks can be created unassigned for a queue to pick up:

```bash
tinytask task create "Investigate SQLite WAL mode performance" \
  -d "Benchmark WAL vs journal mode for concurrent read/write scenarios." \
  --queue ready-for-development \
  --priority 5 \
  --tags "database,research"
```

Agents can then self-assign via `tinytask signup`.

#### Creating a Subtask

If the task is part of a larger effort, specify a parent:

```bash
tinytask subtask create 20260724_01 "Write unit tests for pagination" \
  -d "Cover edge cases: offset beyond results, negative offset, limit=0." \
  --assigned-to tko-sword
```

See [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) for full subtask decomposition guidance.

### Common Mistakes to Avoid

- **Vague titles**: "Fix stuff" is not acceptable. Use specific, actionable titles.
- **Missing description**: Always include enough context for another agent to understand the work.
- **Wrong queue**: Ensure the task lands in the queue monitored by the responsible role.
- **No initial comment**: When context is non-obvious, add a comment explaining the "why."

---

## A2: Task Pickup & Start

### When to Use

An agent checks their queue, finds a task assigned to them, and is ready to begin work.

### Who Can Perform

The agent assigned to the task (`assigned_to` field). For unassigned tasks, any agent in the relevant queue can self-assign via `signup`.

### Prerequisites

- There is a task in your queue with status `idle`.
- You have reviewed the task description, comments, and history.

### Step-by-Step Process

#### Step 1: Check Your Queue

```bash
tinytask queue view --mine
```

Or explicitly:

```bash
tinytask queue view tko-sword
```

Review the list of tasks assigned to you. Identify tasks with status `idle` that are ready to be worked.

#### Step 2: Review the Task

Before starting, read the full task:

```bash
tinytask task get 20260724_01 --json
```

Also review prior comments and history:

```bash
tinytask comment list 20260724_01
```

#### Step 3: Self-Assign if Needed

If the task is unassigned (e.g., you found it in a shared queue and want to claim it):

```bash
tinytask signup --agent tko-sword
```

This assigns the next available idle task in your queue to you.

#### Step 4: Set Status to Working

```bash
tinytask task update 20260724_01 --status working
```

This signals to other agents that the task is actively being worked on.

#### Step 5: Add a Start Comment

Document that you've started and any initial findings:

```bash
tinytask comment add 20260724_01 "Started work. Reviewing the existing endpoint and will implement offset/limit params."
```

### Variations

#### Picking Up a Task from a Shared Queue

If multiple agents share a queue (e.g., `ready-for-development`), use `signup` to claim the next available task:

```bash
tinytask signup
```

The system assigns the next idle task in your default queue to you.

#### Picking Up a Previously Paused Task

If you previously set a task back to `idle` (e.g., to wait for a dependency) and are now resuming:

```bash
tinytask task update 20260724_01 --status working
tinytask comment add 20260724_01 "Resuming work — dependency #20260720_03 is now complete."
```

### Common Mistakes to Avoid

- **Starting without reviewing history**: Always check comments and history to avoid repeating work or missing context.
- **Forgetting to set `working`**: Other agents may pick up the same task if it remains `idle`.
- **No start comment**: Future readers won't know when or why work began.

---

## A3: Task Completion & Handoff

### When to Use

The developer has finished implementing the work described in the task and needs to hand it off to the next stage (typically QA).

### Who Can Perform

The developer currently assigned to and working on the task (e.g., `tko-sword`).

### Prerequisites

- The task is in `working` status and assigned to you.
- The implementation is complete and (where applicable) tested locally.
- You have committed code or made the changes referenced by the task.

### Step-by-Step Process

#### Step 1: Verify Your Work Is Complete

Before handing off, ensure:
- All acceptance criteria in the description are met.
- Code is committed and pushed.
- Local tests pass (if applicable).

#### Step 2: Add a Completion Comment

Document what was done, what was tested, and any notes for QA:

```bash
tinytask comment add 20260724_01 "Implementation complete. Added limit/offset params to GET /tasks. Default limit=50, max=200. Total count returned in X-Total-Count header. All unit tests passing. Ready for QA."
```

#### Step 3: Add Relevant Links

If there's a PR, commit, or external reference:

```bash
tinytask link add 20260724_01 "https://github.com/org/tinytask/pull/42" -d "Pull request with implementation"
```

#### Step 4: Set Status Back to Idle

Developers should **never** mark a task `complete`. Set it back to `idle`:

```bash
tinytask task update 20260724_01 --status idle
```

#### Step 5: Move to the Handoff Queue

Move the task to the queue for the next stage:

```bash
tinytask queue move 20260724_01 ready-for-qa
```

Or equivalently:

```bash
tinytask task update 20260724_01 --queue ready-for-qa
```

#### Step 6: Reassign if Needed

If the QA agent is different from the current assignee:

```bash
tinytask task update 20260724_01 --assigned-to tko-shield
```

Or use the move command with a comment:

```bash
tinytask move 20260724_01 tko-shield --comment "Implementation done, handing off to QA for verification"
```

#### Step 7: Verify

```bash
tinytask task get 20260724_01
```

Confirm: `status` = `idle`, `queue_name` = `ready-for-qa`, `assigned_to` = `tko-shield`.

### Variations

#### Handoff for Defect Fix Verification

When fixing a defect reported by QA, the handoff goes to `ready-for-testing` instead of `ready-for-qa`, and the task is reassigned to the original reporter:

```bash
tinytask task update 20260724_01 --status idle
tinytask queue move 20260724_01 ready-for-testing
tinytask task update 20260724_01 --assigned-to tko-shield
tinytask comment add 20260724_01 "Defect fixed. Please re-test and verify."
```

See [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) for the full bug fix cycle.

### Common Mistakes to Avoid

- **Marking as `complete`**: Developers must never set `complete`. Only QA/testers do that after verification.
- **Leaving status as `working`**: A task in `working` status in a handoff queue is confusing. Always set to `idle` first.
- **No completion comment**: QA needs to know what was done and how to test it. Always provide context.
- **Missing links**: If there's a PR or commit, link it so QA can review the code.

---

## A4: Task Reassignment

### When to Use

A task needs to be transferred from one agent to another. This can happen because:
- The original assignee lacks the expertise or context.
- Workload rebalancing.
- The task has moved to a different stage requiring a different role.
- The assignee is unavailable.

### Who Can Perform

Any agent can reassign a task, but coordination is expected — don't pull a task from someone who is actively working on it without communicating.

### Prerequisites

- You know which agent should receive the task.
- You have a reason for the reassignment (to document in a comment).

### Step-by-Step Process

#### Step 1: Add a Reassignment Comment

Explain why the task is being moved:

```bash
tinytask comment add 20260724_01 "Reassigning to tko-shield — this requires MCP protocol knowledge which is their specialty."
```

#### Step 2: Reassign the Task

```bash
tinytask task update 20260724_01 --assigned-to tko-shield
```

Or use the move command (which also supports a comment):

```bash
tinytask move 20260724_01 tko-shield --comment "Transferring to shield for MCP expertise"
```

#### Step 3: Move to the Correct Queue (if applicable)

If the reassignment also changes the stage of work:

```bash
tinytask queue move 20260724_01 ready-for-testing
```

#### Step 4: Set Status Appropriately

If the task was `working` and is now being handed off, set to `idle`:

```bash
tinytask task update 20260724_01 --status idle
```

If the new assignee is picking it up immediately, they will set it to `working` (see A2).

#### Step 5: Verify

```bash
tinytask task get 20260724_01
```

### Variations

#### Bulk Reassignment

If multiple tasks need to move to the same agent, repeat the process or script it:

```bash
for task_id in 20260724_01 20260724_02 20260724_03; do
  tinytask move "$task_id" tko-shield --comment "Bulk reassignment: shifting to QA queue"
done
```

#### Reassignment Due to Blocked Work

If the assignee can't proceed because they're blocked by another task:

```bash
tinytask task update 20260724_01 --blocked-by-task-id 20260720_03
tinytask comment add 20260724_01 "Blocked by #20260720_03. Reassigning back to queue for re-prioritization."
tinytask task update 20260724_01 --status idle
tinytask task update 20260724_01 --assigned-to null
```

See [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) for dependency management.

### Common Mistakes to Avoid

- **Reassigning without a comment**: The receiving agent needs to know why.
- **Reassigning a `working` task without setting to `idle`**: Creates a confusing state.
- **Not coordinating with the current assignee**: If someone is actively working, communicate before pulling the task.

---

## A5: Task Archival

### When to Use

A task has been completed and verified (or cancelled) and is no longer needed in the active task list. Archival is a soft-delete — the task remains in the database with an `archived_at` timestamp but is excluded from default list views.

### Who Can Perform

Any agent can archive a task, but typically the QA agent archives after verification, or any agent archives cancelled/stale tasks.

### Prerequisites

- The task is `complete` (or has been cancelled/abandoned).
- There are no active subtasks or dependents that still reference this task.

### Step-by-Step Process

#### Step 1: Confirm the Task Is Complete

```bash
tinytask task get 20260724_01
```

Verify `status` = `complete` and `completed_at` is set.

#### Step 2: Check for Active Subtasks

```bash
tinytask subtask list 20260724_01
```

Ensure no subtasks are still `idle` or `working`. If any are, resolve them first.

#### Step 3: Add a Final Comment (Optional)

Document that the task is being archived:

```bash
tinytask comment add 20260724_01 "Verified and complete. Archiving."
```

#### Step 4: Archive the Task

```bash
tinytask task archive 20260724_01
```

#### Step 5: Verify

```bash
tinytask task get 20260724_01
```

The task should now have `archived_at` set. It will no longer appear in default `task list` output.

To see archived tasks:

```bash
tinytask task list --include-archived
```

### Variations

#### Archiving a Cancelled Task

If a task was cancelled (not completed), it can still be archived to clean up the active list:

```bash
tinytask comment add 20260724_01 "Cancelling — requirements changed. No longer needed."
tinytask task archive 20260724_01
```

#### Archiving a Parent Task with Subtasks

When archiving a parent task, ensure all subtasks are completed or archived first. The parent should not be archived if subtasks are still active.

```bash
# Check subtasks
tinytask subtask tree 20260724_01

# Archive each completed subtask
tinytask task archive 20260724_02
tinytask task archive 20260724_03

# Archive the parent
tinytask task archive 20260724_01
```

### Common Mistakes to Avoid

- **Archiving a non-complete task**: Only archive tasks that are truly done or cancelled.
- **Archiving with active subtasks**: Always resolve subtasks first.
- **Archiving without a comment**: Future readers should understand why the task was archived.
- **Confusing archive with delete**: `archive` is a soft-delete (recoverable). `delete` is permanent. Prefer `archive`.

---

## Quick Reference: Core Lifecycle Command Sequence

```
Create → Assign → Start → Work → Handoff → Verify → Archive
```

```bash
# 1. Create
tinytask task create "Task title" -d "Desc" --assigned-to tko-sword --queue ready-for-development

# 2. Start
tinytask task update <id> --status working
tinytask comment add <id> "Started work"

# 3. Handoff (developer)
tinytask comment add <id> "Implementation complete. Ready for QA."
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-qa
tinytask task update <id> --assigned-to tko-shield

# 4. Verify (tester)
tinytask task update <id> --status working
tinytask comment add <id> "Verified. All checks pass."
tinytask task update <id> --status complete

# 5. Archive
tinytask task archive <id>
```

---

## Cross-References

| Topic | Reference |
|---|---|
| Development workflows (subtask decomposition, parallel work) | [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) |
| QA & bug workflows (filing, fixing, verifying defects) | [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) |
| Task dependencies, blocked tasks, and organization | [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) |
| Comments, cross-queue handoffs, coordination | [Scenario Group E](./05-Scenario-Group-E-Collaboration-and-Communication.md) |
| Core concepts: task model, queues, lifecycle | [00-Foundation.md](./00-Foundation.md) — Sections 2, 3, 5 |
| Task commands | See `tinytask task --help` |
| Queue management commands | See `tinytask queue --help` |
| Comment commands | See `tinytask comment --help` |

### Key Handoff Points

- **A1 → B1**: When a task is too large for a single session, decompose it into subtasks (B1).
- **A2 → E1**: When starting work, use comments to communicate context and progress (E1).
- **A3 → E2**: Task completion involves a cross-queue handoff to QA (E2).
- **A3 → C3**: The defect fix handoff is a variation of the standard completion & handoff (A3).
- **A4 → E3**: Reassigning a task may require multi-agent coordination (E3).
- **A5 → D5**: Individual task archival (A5) is the single-task equivalent of batch archival (D5).

---

*This document is part of the TinyTask Process Manual. See [00-Foundation.md](./00-Foundation.md) for core concepts and [other scenario documents](.) for specialized workflows.*
