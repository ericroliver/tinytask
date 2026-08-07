---
name: coordinator
description: Coordinator task management skill for triage, multi-agent coordination, dependency management, conflict resolution, bulk operations, and queue health.
---

# Coordinator Task Management Skill

> **Agent names (e.g., `tko-sword`, `tko-shield`) are examples.** Use actual names from your environment — defined in your `AGENTS.md` file. Replace placeholders like `<your-agent>`, `<developer>`, `<qa-agent>` with real names.

## Role Overview

| Aspect | Detail |
|---|---|
| Agent | `<your-agent>` (e.g., `tko-sword`) — lead developer, dispatcher, or operator |
| Monitors | `triage`, `blocked`, and all role-specific queues |
| Status discipline | Rarely sets `working` — coordinates rather than implements |
| CLI reference | See `SKILL.md` for full command syntax |

> **Agent identity:** Set `TKO_AGENT` in your environment. Used as `created_by` for tasks, comments, links. Alternatively, pass `--created-by <agent>` per command, or `tinytask config set agent <your-agent>`.

## Your Queues

| Queue | Role | When |
|---|---|---|
| `triage` | Monitor | Incoming tasks needing evaluation and routing |
| `blocked` | Monitor | Tasks waiting on dependencies |
| `ready-for-development` | Route to | Tasks ready for developer pickup |
| `ready-for-code-review` | Route to | Implementation ready for review |
| `ready-for-qa` | Route to | Features ready for QA verification |
| `ready-for-testing` | Route to | Defect fixes ready for re-verification |
| `backlog` | Route to | Unscheduled or idle tasks at sprint end |

## Triage (E2)

Evaluate incoming tasks in `triage` and route to the appropriate queue. Ensure `idle` before moving.

```bash
tinytask queue tasks triage --json                              # List triage queue
tinytask task get <id> --json && tinytask comment list <id>      # Read task + history
tinytask task update <id> --status idle                          # Ensure idle before routing
tinytask queue move <id> <destination-queue>                     # Route to correct queue
tinytask move <id> <assignee> --comment "Triage: <routing decision>. <reason>."
```

Routing targets: bug → `ready-for-development` (assign dev), feature → `ready-for-development`, needs review → `ready-for-code-review`, needs QA → `ready-for-qa`, blocked → `blocked`.

## Multi-Agent Coordination (E3)

Designate a hub task (typically the parent) and use its comment thread as the coordination channel.

```bash
tinytask comment add <hub-id> "COORDINATION PLAN:
- <agent>: #<task-id> (<description>)
- <agent>: #<task-id> (<description>)
- Dependency: #<task-id> depends on #<task-id>
- Shared file: <file path> — <agent> goes first
All agents: report progress here when starting, completing, and unblocking dependencies."

# Agents report start/completion, check deps, finalize
tinytask comment add <hub-id> "Starting #<task-id>. <details>."
tinytask comment add <hub-id> "DEPENDENCY CLEARED: #<task-id> done. #<dependent-id> can start."
tinytask comment list <hub-id>                                       # Check deps before starting dependent work
tinytask comment add <hub-id> "ALL SUBTASKS COMPLETE. <summary>. Ready for QA."
tinytask task update <hub-id> --status idle && tinytask queue move <hub-id> ready-for-qa
```

For shared files, sequence explicitly — post a shared-file alert and notify when the shared module is established. Don't let two agents modify the same file simultaneously.

## Status Broadcasting & Awareness (E4)

Before changing a task's status or queue, identify who needs to know: dependents, hub task, linked tasks, parent assignee.

```bash
# Broadcast start / block / unblock
tinytask task update <id> --status working && tinytask comment add <id> "Started. <details>"
tinytask comment add <hub-id> "STATUS: #<id> started."

tinytask task update <id> --status idle && tinytask queue move <id> blocked
tinytask comment add <id> "BLOCKED: <reason>. Waiting on #<blocking-id>."
tinytask comment add <hub-id> "BLOCKED: #<id> is blocked. May cascade."

# Notify dependent tasks on unblock
tinytask comment add <dependent-id> "UNBLOCKED: #<blocking-id> done. Ready to start."
tinytask task update <dependent-id> --status working && tinytask queue move <dependent-id> ready-for-development

# Link external references (PRs, CI runs, deployment URLs)
tinytask link add <id> "<url>" -d "<description>"
```

## Conflict Resolution & Escalation (E5)

```bash
# 1. Document + 2. Propose resolution + seek consensus via comments
tinytask comment add <id> "CONFLICT: @<agent-a> proposes X. @<agent-b> proposes Y. <tradeoffs>. Blocking <impact>."
tinytask comment add <id> "PROPOSED RESOLUTION: <path forward>. @<agent> — does this work?"

# 3. If consensus fails, escalate — raise priority + create decision task
tinytask task update <id> --priority 9
tinytask comment add <id> "ESCALATION: Unable to reach consensus after 3 exchanges. Requesting decision."
tinytask task create "DECISION: <topic>" -d "<context, positions, related task>" --priority 9 --tags "decision"
tinytask link add <decision-id> "tasks/<id>" -d "Blocked task awaiting decision"

# 4. Block the conflicted task pending decision
tinytask task update <id> --status idle && tinytask queue move <id> blocked

# 5. After decision, resume + 6. Create follow-up task for deferred work
tinytask comment add <id> "DECISION RECEIVED: <decision>. Resuming."
tinytask task update <id> --status working && tinytask queue move <id> ready-for-development
tinytask task create "Follow-up: <deferred work>" -d "<context>" --assigned-to <agent> --priority <n>
tinytask link add <followup-id> "tasks/<original-id>" -d "Follow-up to <original>"
```

Escalate after 3 kickback cycles on a defect — raise priority, decompose into subtasks, block the parent feature.

## Setting Up Dependencies (D1)

The CLI does not expose `--blocked-by`. Use MCP or REST API to set `blocked_by_task_id`:

```bash
# MCP: update_task({ id: <blocked-id>, blocked_by_task_id: <blocking-id> })
# REST: curl -X PATCH http://localhost:3000/api/v1/tasks/<blocked-id> -H "Content-Type: application/json" -d '{"blocked_by_task_id": <blocking-id>}'
tinytask comment add <blocked-id> "Blocked by #<blocking-id>. <reason>."
tinytask comment add <blocking-id> "Task #<blocked-id> is blocked by this task. Please notify when complete."
tinytask task update <blocked-id> --queue blocked
tinytask task get <blocked-id> --json  # Verify blocked_by_task_id + is_currently_blocked
```

CLI-only workaround: move to `blocked` queue and document the dependency via comments.

## Managing Blocked Tasks (D2)

```bash
# Find blocked tasks / find unblocked tasks (blocked_by set, is_currently_blocked = false)
tinytask task list --json | jq '[.[] | select(.blocked_by_task_id != null)] | .[] | {id, title, blocked_by_task_id, is_currently_blocked}'
tinytask task list --json | jq '[.[] | select(.blocked_by_task_id != null and .is_currently_blocked == false)] | .[].id'
tinytask task get <blocking-id> --json  # Check if blocking task is complete

# Resume unblocked task
tinytask task update <id> --queue ready-for-development
tinytask comment add <id> "Dependency #<blocking-id> complete. Unblocked and ready to start."
# Optionally clear dependency (MCP/REST): update_task({ id: <id>, blocked_by_task_id: null })
```

For dependency chains (A→B→C), monitor each link and post cascade comments as each unblocks.

## Linking Tasks (D3)

```bash
tinytask link add <task-id> "<url>" -d "[<type>] <description>"
tinytask comment add <task-id> "Linked to #<related-id>. <context>."
tinytask link list <task-id>  # Verify
```

Link type prefixes (convention — not enforced):

| Prefix | Meaning |
|---|---|
| `[blocks]` | Task A blocks Task B |
| `[related]` | Tasks are related but not blocking |
| `[duplicate]` | Tasks describe the same work — consolidate and archive one |
| *(none)* | General reference (PR, doc, CI run) |

Link both directions when connecting two TinyTask tasks. Use `blocked_by_task_id` for true blocking, not links.

## Task Reorganization (D4)

```bash
tinytask subtask tree <parent-id> --recursive                      # Review current hierarchy
tinytask subtask move <subtask-id> <new-parent-id>                 # Reparent
# Promote: tinytask subtask move <subtask-id>  (no parent) | Demote: tinytask task update <id> --parent <parent-id>
tinytask comment add <moved-id> "Reparented from #<old> to #<new>. <reason>."
tinytask comment add <old-parent> "Subtask #<moved-id> moved to #<new-parent>."
tinytask comment add <new-parent> "Subtask #<moved-id> moved here from #<old-parent>."
tinytask subtask tree <new-parent-id> --recursive  # Verify
```

Moving a subtask with children moves the entire subtree. Don't move `working` tasks — set `idle` first and notify the assignee.

## Bulk Task Management (D5)

**Always export a backup before bulk operations:** `tinytask task list --include-archived --json > backup.json`

```bash
# Batch archive completed / reassign / queue move / status update
for id in $(tinytask task list --status complete --json | jq -r '.[].id'); do tinytask task archive "$id"; done
for id in $(tinytask queue tasks <queue> --json | jq -r '.[].id'); do tinytask move "$id" <agent> --comment "Bulk reassignment: <reason>"; done
for id in $(tinytask queue tasks <from-queue> --json | jq -r '.[].id'); do tinytask queue move "$id" <to-queue> && tinytask comment add "$id" "Bulk moved. <reason>."; done
for id in $(tinytask queue tasks <queue> --json | jq -r '.[].id'); do tinytask task update "$id" --status idle; done

# Queue clear (removes queue assignment, not tasks) — review first
tinytask queue tasks <queue> --json && tinytask queue clear <queue> --yes
```

Archive subtasks before parents — never archive a parent with active subtasks. See `developer.md` for subtask lifecycle and `tester.md` for archival rules.

## Sprint Transition Cleanup (D5)

```bash
for id in $(tinytask task list --status complete --json | jq -r '.[].id'); do tinytask task archive "$id"; done
for id in $(tinytask task list --status idle --json | jq -r '.[].id'); do tinytask task update "$id" --queue backlog; done
tinytask task list --status working --json | jq -r '.[].id'  # Check orphaned working tasks
```

## Queue Health Management (Conventions §6.4)

```bash
tinytask queue stats <queue> && tinytask queue tasks <queue> --json  # Workload + stale tasks
tinytask queue tasks blocked && tinytask task list --status idle --json  # Monitor blocked + long-idle
```

Clear stale tasks periodically — review, re-prioritize, or archive. Don't clear queues blindly — verify contents first.

## Coordinator Rules

| Rule | Detail |
|---|---|
| Always comment on bulk ops | Add comments to affected tasks or a coordination task explaining what was done and why |
| Verify before destructive ops | List and review the target set before archive, clear, or bulk delete |
| Export backup before large ops | `tinytask task list --include-archived --json > backup.json` |
| Don't clear queues blindly | `queue clear` removes queue assignments, not tasks — verify first |
| Archive subtasks before parents | Never archive a parent with active subtasks — creates orphans |
| Always `idle` before moving | Never move a `working` task between queues — set `idle` first |
| Designate a hub for multi-agent work | Don't let agents communicate in silos — use a parent or central task |
| Report start and completion on hub | Other agents can't know dependencies are clear if you don't report |
| Sequence shared file access | If two tasks modify the same file, coordinate who goes first |
| Escalate after 3 kickback cycles | Raise priority, decompose, and block the parent feature |
| Create decision tasks for escalations | Track escalations separately — don't bury them in comment threads |
| Create follow-up tasks for deferred work | Don't rely on comments to remember deferred work |

## Pre-Bulk-Op Checklist

- [ ] Identified the target task set (by queue, status, or tag)
- [ ] Reviewed the full task set with `queue tasks` or `task list --json`
- [ ] Verified tasks are in the correct state (complete for archive, idle for moves)
- [ ] Exported a backup: `tinytask task list --include-archived --json > backup.json`
- [ ] Plan includes comments for affected tasks


