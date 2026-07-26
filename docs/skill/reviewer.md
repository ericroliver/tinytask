---
name: reviewer
description: Code reviewer task management skill for developer-to-developer code review — review pickup, feedback, approval, and handoff workflows.
---

# Code Reviewer Task Management Skill

> **Agent names (e.g., `tko-sword`, `tko-shield`) are examples.** Use actual names from your environment — defined in your `AGENTS.md` file. Replace placeholders like `<your-agent>`, `<developer>`, `<qa-agent>` with real names.

## Role Overview

| Aspect | Detail |
|---|---|
| Agent | `<your-agent>` (e.g., `tko-sword`) — any developer assigned as reviewer |
| Pickup queue | `ready-for-code-review` |
| Status discipline | `working` on review start → `idle` on review completion — **never `complete`** |
| CLI reference | See `SKILL.md` for full command syntax |

## Your Queue

| Queue | Role | When |
|---|---|---|
| `ready-for-code-review` | Monitor | Implementation ready for developer-to-developer review |
| `ready-for-qa` | Handoff | Review approved — route to QA for verification |
| `ready-for-development` | Handoff | Changes requested — kick back to original developer |
| `blocked` | Staging | Waiting on a dependency |

## Review Pickup (B5)

```bash
tinytask queue view --mine                                          # Check your queue
tinytask task get <id> --json && tinytask comment list <id>          # Read developer's completion comment + history
tinytask link list <id>                                             # Find the PR/branch link
tinytask task update <id> --status working                           # Set working
tinytask comment add <id> "Starting code review."
```

Read the developer's completion comment first — it tells you what to focus on. Review the linked PR or branch diff.

## Review Checklist

| Area | What to Check |
|---|---|
| Code quality | SOLID/DRY, consistent naming, no dead code, no leftover debug statements |
| TypeScript | No `any` in production — `unknown` or specific types; `z.ZodRawShape` for Zod schemas |
| Error handling | Edge cases covered, meaningful error messages, no swallowed exceptions |
| Tests | New features have tests; no removed tests; coverage maintained or improved |
| Boundaries | Don't cross transport → MCP → service → database layers |
| Security | Input validation, auth checks, no hardcoded secrets |

## Changes Requested (B5)

```bash
tinytask comment add <id> "Review: changes requested.
1. <specific issue with file/line reference>
2. <specific issue>
<additional feedback>"
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-development
tinytask move <id> <developer> --comment "Changes requested. See review comment. Please address and re-submit."
```

## Review Approved (B5)

```bash
tinytask comment add <id> "Code review passed. <what was checked, any minor notes>. Approving for QA."
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-qa
tinytask move <id> <qa-agent> --comment "Review approved. Ready for QA verification."
```

## Expedited Review

For genuinely trivial changes (typo fixes, comment updates, one-line changes), skip code review and go directly to QA:

```bash
tinytask comment add <id> "Trivial change: <description>. Skipping code review, going directly to QA."
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-qa
```

## Reviewing Parent Tasks with Multiple Subtasks

When an entire parent task needs review, aggregate the subtask reviews:

```bash
# Move all completed subtasks to review, assign to same reviewer for consistency
for sub_id in <sub1-id> <sub2-id> <sub3-id>; do
  tinytask queue move "$sub_id" ready-for-code-review
  tinytask task update "$sub_id" --assigned-to <your-agent>
done
tinytask comment add <parent-id> "All subtasks moved to ready-for-code-review. Reviewing in dependency order: <ordering>."
```

Review in dependency order — schema before endpoints, utilities before consumers. Handle each subtask individually (approve or request changes).

## Reviewer Rules

| Rule | Detail |
|---|---|
| Never mark `complete` | Only testers/QA mark `complete` after verification |
| Always provide specific feedback | Reference files, line numbers, patterns — not just "fix this" |
| Review the code, not the developer | Focus on the implementation, not who wrote it |
| Don't offload basic checks | Developer should self-review first — don't catch what they should have |
| Address feedback promptly | When your own task gets review feedback, address it quickly — don't let it linger |
| Always `idle` before handoff | Never move a `working` task to another queue |
| Always comment on changes | Status, queue, assignee — every change gets a comment |
| Link to code in feedback | Reference specific files, line numbers, or PR sections |

## Pre-Review Checklist

- [ ] Read developer's completion comment (what was done, how tested, reviewer focus areas)
- [ ] Reviewed the linked PR or branch diff
- [ ] Checked code quality (SOLID/DRY, naming, dead code, debug statements)
- [ ] Verified TypeScript standards (no `any`, proper types, Zod schemas)
- [ ] Checked test coverage (new tests for new features, no removed tests)
- [ ] Verified architectural boundaries (no cross-layer violations)
- [ ] Wrote approval or changes-requested comment with specifics
- [ ] Updated status to `idle`, moved to correct queue, reassigned

## Quick Reference

```bash
# Review pickup
tinytask queue view --mine && tinytask task get <id> --json && tinytask comment list <id>
tinytask link list <id>
tinytask task update <id> --status working
tinytask comment add <id> "Starting code review."

# Changes requested
tinytask comment add <id> "Review: changes requested. 1. <issue> 2. <issue>"
tinytask task update <id> --status idle && tinytask queue move <id> ready-for-development
tinytask move <id> <developer> --comment "Changes requested. See review comment."

# Review approved
tinytask comment add <id> "Review passed. <notes>. Approving for QA."
tinytask task update <id> --status idle && tinytask queue move <id> ready-for-qa
tinytask move <id> <qa-agent> --comment "Approved. Ready for QA."

# Expedited (trivial changes only)
tinytask comment add <id> "Trivial change: <desc>. Skipping review."
tinytask task update <id> --status idle && tinytask queue move <id> ready-for-qa

# Parent with multiple subtasks
for sub_id in <sub1> <sub2> <sub3>; do
  tinytask queue move "$sub_id" ready-for-code-review
  tinytask task update "$sub_id" --assigned-to <your-agent>
done
tinytask comment add <parent-id> "All subtasks in review. Order: <dependency ordering>."
```
