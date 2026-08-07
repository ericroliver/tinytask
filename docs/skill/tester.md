---
name: tester
description: Tester task management skill for QA agents — bug reporting, defect verification, feature verification, kickback, and task closure workflows.
---

# Tester Task Management Skill

> **Agent names (e.g., `tko-sword`, `tko-shield`) are examples.** Use actual names from your environment — defined in your `AGENTS.md` file. Replace placeholders like `<your-agent>`, `<developer>`, `<creator>` with real names.

## Role Overview

| Aspect | Detail |
|---|---|
| Agent | `<your-agent>` (e.g., `tko-shield`) |
| Pickup queues | `ready-for-testing` (defect verification), `ready-for-qa` (feature verification) |
| Status discipline | `working` on start → `complete` on verified pass, or `idle` + kickback on fail |
| CLI reference | See `SKILL.md` for full command syntax |

> **Agent identity:** Set `TKO_AGENT` in your environment. Used as `created_by` for tasks, comments, links. Alternatively, pass `--created-by <agent>` per command, or `tinytask config set agent <your-agent>`.

## Your Queues

| Queue | Role | When |
|---|---|---|
| `ready-for-testing` | Monitor | Defect fixes awaiting re-verification by original reporter |
| `ready-for-qa` | Monitor | Feature work completed by developer, ready for final QA |
| `ready-for-development` | Handoff | Verification failed — kick back to developer |
| `blocked` | Staging | Waiting on a dependency |

## Bug Reporting (C1)

Reproduce before filing. Document steps, expected vs. actual, environment, severity.

```bash
tinytask task create "BUG: <specific description>" \
  -d "Steps to reproduce:\n1. <step>\n2. <step>\n\nExpected: <expected>\nActual: <actual>\n\nEnvironment: <server/build>\nSeverity: <level> — <why>" \
  --assigned-to <developer> \
  --priority <n> \
  --tags "bug,<component>"
tinytask queue add <defect-id> ready-for-development
tinytask comment add <defect-id> "Filed by QA during <context>. Reproduced <n> times. <additional notes for developer>."
tinytask link add <defect-id> "<related-task-or-pr-url>" -d "[related] <description>"
```

For regressions: tag with `regression`, link the introducing PR, reference the last working build.

One bug per task. Don't combine unrelated issues. If you can't reproduce, note it as intermittent — still file.

## Verification Pickup

Same pattern for both defect fixes (`ready-for-testing`) and features (`ready-for-qa`):

```bash
tinytask queue view --mine                                          # Check your queue
tinytask task get <id> --json && tinytask comment list <id>          # Read developer's summary + history
tinytask task update <id> --status working                           # Set working
tinytask comment add <id> "Starting verification. Will <re-run reproduction steps | test acceptance criteria>."
```

- **Defect fixes**: re-run the **original reproduction steps** from the bug report
- **Features**: test against **acceptance criteria** from the task description

## Verification Standards

| Step | What to Check |
|---|---|
| Read developer's summary | Understand root cause, what changed, known limitations |
| Re-run reproduction / acceptance | Original steps for defects, acceptance criteria for features |
| Check regressions | Run full test suite or at least affected component's tests |
| Test edge cases | Boundary conditions, empty inputs, concurrent access, max-length inputs |
| Document results | Closure or kickback comment with specifics — test output, expected vs. actual |

## Verification Pass → Close (C5)

```bash
# Verify: reproduction steps pass / acceptance criteria met, edge cases tested, no regressions
tinytask comment add <id> "Verified. <results: what was tested, edge cases, regression check>. Closing."
tinytask task update <id> --status complete
```

After closing a defect, check for related tasks:

```bash
tinytask subtask list <id> && tinytask link list <id>                # Check for related/subtasks
tinytask comment add <feature-id> "Defect #<id> verified and closed. <summary>."  # Update parent feature if applicable
```

If related regression tasks exist, verify and close them too. For high-severity bugs, skip archival — keep for audit reference.
## Verification Fail → Kickback (C4)

```bash
tinytask comment add <id> "Verification FAILED. <what didn't work>.
Re-tested:
1. <step>
2. <step>
Expected: <expected>
Actual: <actual>"
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-development
tinytask move <id> <developer> --comment "Kickback: <reason>. Please re-fix and re-submit."
```

If the fix introduced a new distinct issue, file a separate defect task, link it to the original, and kick back.

## Kickback Etiquette

| Rule | Detail |
|---|---|
| Be specific | Include exact steps, expected vs. actual, test output |
| Don't fix it yourself | Report what failed — the developer fixes it |
| Note the test case | Reference which test exposed the issue |
| Escalate after 3 cycles | If kicked back 3+ times, raise priority and suggest decomposition (see `developer.md` §Subtask Decomposition) |

## Task Archival (A5)

```bash
tinytask task get <id>                                                # Confirm status is complete
tinytask subtask list <id>                                            # Verify no active subtasks
tinytask comment add <id> "Archiving — verified and complete."
tinytask task archive <id>
```

Archive subtasks before parents. Prefer `archive` over `delete` (soft-delete, recoverable). Archived tasks don't appear in default list views — use `--include-archived` to see them.

## Bug Description Template

```
When a user <action>, the system <behavior>.
Steps to reproduce:
1. <step>  2. <step>  3. <step>
Expected: <what should happen>
Actual: <what actually happens>
Environment: <server/build/version>
Severity: <urgent|high|medium|low> — <why>
```

## Comments & Communication (E1)

Comment on every status change, queue move, reassignment, and verification result. Include task IDs, test output, reproduction steps. Reference related tasks by ID. See `SKILL.md` §Comment Commands for syntax.

## Status Broadcasting (E4)

- **Starting**: Comment on the task being verified
- **Pass**: Closure comment, mark `complete`, notify related feature task
- **Fail/kickback**: Failure comment, move to `ready-for-development`, reassign to developer
- **Filing a bug**: Comment with context, link related tasks, notify developer

## Tester Rules

| Rule | Detail |
|---|---|
| **Can** mark `complete` | Only after verification passes — this is the tester's unique privilege |
| Never close without reproducing | "Developer said it's fixed" is not verification — re-run the steps |
| Always add a closure comment | Document what was verified, edge cases tested, regression check results |
| Always reassign kickbacks to developer | Don't leave a kicked-back task assigned to yourself |
| Use `ready-for-testing` for defects | Not `ready-for-qa` — `ready-for-qa` is for feature completions |
| One bug per task | Don't combine unrelated issues into a single defect task |
| Always `idle` before kickback | Never move a `working` task to another queue |

## Pre-Verification Checklist

- [ ] Read developer's completion/fix summary comment
- [ ] Identified reproduction steps (defect) or acceptance criteria (feature)
- [ ] Re-ran original reproduction steps / tested acceptance criteria
- [ ] Checked for regressions (full suite or affected component)
- [ ] Tested edge cases (boundary conditions, empty inputs, concurrent access)
- [ ] Wrote closure or kickback comment with results
- [ ] Updated status (`complete` or kicked back to `idle`)

## Pre-Archival Checklist

- [ ] Task status is `complete`
- [ ] All subtasks resolved and archived
- [ ] Final comment added
- [ ] Used `archive` command (not `delete`)

## Quick Reference

```bash
# Bug filing
tinytask task create "BUG: <desc>" -d "<steps, expected, actual, env>" --assigned-to <developer> --priority <n> --tags "bug,<component>"
tinytask queue add <defect-id> ready-for-development
tinytask comment add <defect-id> "Filed by QA. <context>."

# Verification pickup
tinytask queue view --mine && tinytask task get <id> --json && tinytask comment list <id>
tinytask task update <id> --status working
tinytask comment add <id> "Starting verification."

# Verification pass → close
tinytask comment add <id> "Verified. <results>. Closing."
tinytask task update <id> --status complete

# Verification fail → kickback
tinytask comment add <id> "Verification FAILED. <details>."
tinytask task update <id> --status idle && tinytask queue move <id> ready-for-development
tinytask move <id> <developer> --comment "Kickback: <reason>."

# Archival
tinytask comment add <id> "Archiving — verified and complete."
tinytask task archive <id>
```
