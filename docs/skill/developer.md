---
name: developer
description: Developer task management skill for development agents — task pickup, handoff, subtask decomposition, and defect fix workflows.
---

# Developer Task Management Skill

> **Agent names (e.g., `tko-sword`, `tko-shield`) are examples.** Use actual names from your environment — defined in your `AGENTS.md` file. Replace placeholders like `<your-agent>`, `<qa-agent>`, `<reviewer>`, `<creator>` with real names.

## Role Overview

| Aspect | Detail |
|---|---|
| Agent | `<your-agent>` (e.g., `tko-sword`) |
| Pickup queue | `ready-for-development` |
| Status discipline | `working` on start → `idle` on completion — **never `complete`** |
| CLI reference | See `SKILL.md` for full command syntax |

> **Agent identity:** Set `TKO_AGENT` in your environment. Used as `created_by` for tasks, comments, links. Alternatively, pass `--created-by <agent>` per command, or `tinytask config set agent <your-agent>`.

## Your Queues

| Queue | Role | When |
|---|---|---|
| `ready-for-development` | Monitor | Your pickup queue — check at session start |
| `ready-for-qa` | Handoff | Feature complete, ready for QA verification |
| `ready-for-testing` | Handoff | Defect fixed, ready for reporter re-verification |
| `ready-for-code-review` | Handoff | Implementation ready for developer review |
| `blocked` | Staging | Waiting on a dependency |

## Task Pickup & Start

```bash
tinytask queue view --mine                                          # Check your queue
tinytask task get <id> --json && tinytask comment list <id>          # Review task + history
tinytask task update <id> --status working                           # Set working
tinytask comment add <id> "Started work. <approach>. Branch: <branch>."
```

If unassigned in a shared queue: `tinytask signup --agent <your-agent>`

## Feature Handoff (A3)

```bash
# Verify: acceptance criteria met, tests pass, lint clean, code formatted
tinytask comment add <id> "Implementation complete. <what, how tested, QA focus areas>. Branch: <branch>. PR: #<n>."
tinytask link add <id> "<pr-url>" -d "PR: <description>"
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-qa
tinytask move <id> <qa-agent> --comment "Handing off to QA for verification."
```

## Defect Fix Handoff (C3)

Same pattern as feature handoff, but: queue → `ready-for-testing`, assignee → task **creator** (check `created_by`).

```bash
tinytask comment add <id> "Fix complete. Root cause: <cause>. Changes: <list>. Tests: <details>. Branch: <branch>. Commit: <hash>."
tinytask link add <id> "<pr-url>" -d "Fix PR"
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-testing
tinytask move <id> <creator> --comment "Defect fixed. Please re-test with original reproduction steps."
```

## Code Review Prep (B5)

Self-review first (`git diff main...<branch> --stat`), then:

```bash
tinytask comment add <id> "Implementation complete. <details>. Reviewer focus: <areas>. Branch: <branch>. PR: #<n>."
tinytask link add <id> "<pr-url>" -d "PR: <description>"
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-code-review
tinytask move <id> <reviewer> --comment "Ready for review. Focus on <areas>."
```

For trivial changes, skip review — go directly to `ready-for-qa`. When in doubt, request review. See `reviewer.md` for the review process.

## Subtask Decomposition (B1)

When a task is too large for one session:

```bash
# Create subtasks under parent
tinytask subtask create <parent-id> "Subtask title" -d "Desc" --assigned-to <agent> --priority <n>
tinytask queue add <subtask-id> ready-for-development

# Document the breakdown
tinytask comment add <parent-id> "Decomposed into: <list of subtasks>. Dependencies: <ordering notes>."

# Verify the tree
tinytask subtask tree <parent-id> --recursive
```

Rules: each subtask independently completable and verifiable. Don't over-decompose (<15 min = no subtask). Don't under-decompose (spans multiple components = still too large).

## Working with Subtask Trees (B2)

- View: `tinytask subtask tree <parent-id> --recursive`
- Work in dependency order — check sibling status before starting dependent subtasks
- Completed subtasks follow the full handoff lifecycle (set idle, move to `ready-for-qa`)
- Hand off the parent when all subtasks are done — don't leave it in `working`
- Reparent: `tinytask subtask move <subtask-id> <new-parent-id>` (omit new parent for top-level)

## Parallel Development (B3)

Use the parent task's comment thread as a coordination hub:

```bash
tinytask comment add <parent-id> "COORDINATION PLAN: <agent>: #<id> (<work>). Deps: <ordering>. Shared files: <sequence>."
tinytask comment add <parent-id> "DEPENDENCY CLEARED: #<id> done. #<dependent-id> can start."
```

If two subtasks modify the same file, sequence them — don't work on shared files simultaneously.

## Context Switching & Interruption (B4)

```bash
# Document progress before pausing
tinytask comment add <id> "Pausing for <reason>. Progress: <X% done>. Remaining: <list>. Branch: <branch>. Commit: <hash>."
tinytask task update <id> --status idle

# Pick up urgent task (standard pickup), complete it, then resume:
tinytask comment list <id>                    # Re-read your progress note
tinytask task update <id> --status working
tinytask comment add <id> "Resuming. Picking up from <where you left off>."
```

If pausing a subtask, notify the parent: `tinytask comment add <parent-id> "Subtask #<id> paused for <reason>."`

## Defect Fix Pickup (C2)

```bash
tinytask queue view --mine                                         # Look for BUG: prefixed tasks
tinytask task get <defect-id> --json && tinytask comment list <defect-id> && tinytask link list <defect-id>
# Reproduce locally before setting working
tinytask task update <defect-id> --status working
tinytask comment add <defect-id> "Confirmed reproduction. <root cause hypothesis>. Branch: fix/<name>."
# Implement fix, add a test that fails before / passes after, run full suite
```

If unable to reproduce, ask the reporter for clarification — don't set `working` until you can reproduce or have enough context.

## Dependencies (D1)

`blocked_by_task_id` must be set via MCP tool or REST API (CLI doesn't expose it):

```
update_task({ id: <blocked-id>, blocked_by_task_id: <blocking-id> })
```

```bash
tinytask comment add <blocked-id> "Blocked by #<blocking-id>. <reason>."
tinytask comment add <blocking-id> "Task #<blocked-id> is waiting on this. Please notify when complete."
tinytask task update <blocked-id> --queue blocked
```

When the blocking task completes, manually move the unblocked task back to `ready-for-development` and notify.

## Comments & Communication (E1)

Comment on every status change, queue move, reassignment, and dependency action. Include task IDs, file names, branch/commit references. Reference related tasks by ID (`See #20260724_05`). Ask questions, document decisions, report progress — all via comments. See `SKILL.md` §Comment Commands for syntax.

## Status Broadcasting (E4)

When your status change affects others:

- **Starting/pausing**: Post to the task and the coordination hub (if part of one)
- **Blocked**: Move to `blocked` queue, notify the hub and any dependent tasks
- **Unblocked**: Comment on dependent tasks that their blocker is resolved
- **Completed**: Post handoff comment, link PR, move to correct queue

Queue placement itself is a broadcast — moving to `blocked` signals waiting, moving to `ready-for-qa` signals completion.

## Developer Rules

| Rule | Detail |
|---|---|
| Never mark `complete` | Only testers/QA mark `complete` after verification |
| Always `idle` before handoff | Never move a `working` task to another queue |
| Always comment on changes | Status, queue, assignee — every change gets a comment |
| Don't work on others' tasks | Coordinate via comments before touching another agent's task |
| Don't run the app from CLI | Causes hanging processes — notify the developer to test manually |
| Halt before architectural decisions | Document, present options, seek approval — don't decide autonomously |

## Pre-Task Checklist

- [ ] Read full task description and acceptance criteria
- [ ] Reviewed all comments and task history
- [ ] Checked for dependencies or blocking tasks
- [ ] Identified the branch to work on
- [ ] Set status to `working`
- [ ] Added a start comment with branch reference

## Pre-Handoff Checklist

- [ ] All acceptance criteria met
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run format` applied
- [ ] No TypeScript compilation errors
- [ ] No unused imports, variables, or functions
- [ ] Completion comment written (what, how tested, QA/reviewer focus)
- [ ] PR or branch linked to the task
- [ ] Status set to `idle`
- [ ] Task moved to correct handoff queue
- [ ] Task reassigned to appropriate agent

## Code Quality Standards

See `AGENTS.md` for full standards. Key rules:

| Standard | Rule |
|---|---|
| TypeScript | Never `any` in production — `unknown` or specific types; `z.ZodRawShape` for Zod |
| Tests | Vitest only; new features need tests; fix broken tests, don't remove them |
| Boundaries | Don't cross transport → MCP → service → database layers |
| Autonomy | Halt and collaborate before architectural or scope decisions |

## Quick Reference

```bash
# Pickup
tinytask queue view --mine && tinytask task get <id> --json && tinytask comment list <id>
tinytask task update <id> --status working
tinytask comment add <id> "Started. <approach>. Branch: <branch>."

# Feature handoff → QA
tinytask comment add <id> "Implementation complete. <details>. Branch: <branch>. PR: #<n>."
tinytask task update <id> --status idle && tinytask queue move <id> ready-for-qa
tinytask move <id> <qa-agent> --comment "Ready for QA."

# Defect fix handoff → Tester (same pattern, queue → ready-for-testing, assignee → creator)
tinytask comment add <id> "Fix complete. <root cause, changes, tests>. Commit: <hash>."
tinytask task update <id> --status idle && tinytask queue move <id> ready-for-testing
tinytask move <id> <creator> --comment "Fixed. Please re-test."

# Code review handoff (queue → ready-for-code-review, assignee → reviewer)
tinytask comment add <id> "Ready for review. Focus: <areas>. PR: #<n>."
tinytask task update <id> --status idle && tinytask queue move <id> ready-for-code-review
tinytask move <id> <reviewer> --comment "Ready for review."

# Subtask decomposition
tinytask subtask create <parent-id> "Title" -d "Desc" --assigned-to <agent> --priority <n>
tinytask queue add <sub-id> ready-for-development
tinytask comment add <parent-id> "Decomposed: <list>. Deps: <ordering>."

# Context switch
tinytask comment add <id> "Pausing for <reason>. <X%> done. Remaining: <list>. Branch: <b>. Commit: <h>."
tinytask task update <id> --status idle
# ... handle urgent task ...
tinytask comment list <id> && tinytask task update <id> --status working
tinytask comment add <id> "Resuming from <where>."
```
