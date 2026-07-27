# Plan: Role-Based Task Management Skills

> **Status:** Draft / Planning
> **Author:** tko-sword
> **Date:** 2026-07-26
> **Purpose:** Define the structure and content of role-specific task management skill files, derived from the TinyTask Process Manual.

---

## 1. Background & Motivation

Currently, all TinyTask agents share a single `task-management` skill file (`current-skill.md`). This file is a flat CLI command reference — it lists every command available but does not encode role-specific workflows, responsibilities, queue disciplines, or lifecycle rules. As a result:

- Agents must read the full process manual (7,000+ lines) to understand their role.
- There is no role-specific guidance on which queues to monitor, which statuses to set, or which handoff patterns to follow.
- The skill file does not enforce the process manual's rules (e.g., "developers never mark tasks complete").

The TinyTask Process Manual (`docs/process-manual/`) is now merged to main and provides a comprehensive, role-aware reference. This plan defines how to split the single skill into multiple role-specific skill files, each tailored to the workflows and responsibilities of that role.

---

## 2. Roles Identified

The process manual defines two formal agent roles (Developer, Tester) but references several additional functional roles throughout the scenario documents. The following roles need custom skill files:

| # | Role | Skill File | Agent(s) | Source in Manual |
|---|---|---|---|---|
| 1 | **Developer** | `developer.md` | `tko-sword` | Foundation §3.1, Scenario Groups A, B, C (dev side) |
| 2 | **Tester** | `tester.md` | `tko-shield` | Foundation §3.2, Scenario Group C (QA side), A5 |
| 3 | **Reviewer** | `reviewer.md` | Any developer acting as reviewer | Scenario Group B (B5), Conventions §6.1 (`ready-for-code-review`) |
| 4 | **Coordinator** | `coordinator.md` | Lead developer / dispatcher / operator | Scenario Groups D, E, Conventions §6, §14 |
| 5 | **Shared** | `SKILL.md` | All agents | Foundation (all sections), Conventions (all sections), CLI Reference |

### Role Summaries

#### 2.1 Developer (`developer.md`)
- **Agent:** `tko-sword`
- **Queue:** Picks up from `ready-for-development`
- **Core responsibilities:** Implement features, fix bugs, decompose subtasks, prepare code for review/QA, hand off work
- **Status discipline:** Sets `working` on start, `idle` on completion — **never** marks `complete`
- **Handoff targets:** `ready-for-qa` (feature completion), `ready-for-testing` (defect fix), `ready-for-code-review` (code review)
- **Key workflows:** A1 (create), A2 (pickup), A3 (handoff), B1–B5 (dev workflows), C2 (defect fix), C3 (defect handoff), D1 (dependencies), E1 (comments), E4 (status broadcasting)

#### 2.2 Tester (`tester.md`)
- **Agent:** `tko-shield`
- **Queues:** Picks up from `ready-for-testing` (defect verification) and `ready-for-qa` (feature verification)
- **Core responsibilities:** Test features, file bug reports, verify defect fixes, kick back failures, close/verify tasks, archive completed tasks
- **Status discipline:** **Can** mark tasks `complete` after verification
- **Key workflows:** C1 (bug filing), C3 (verification), C4 (kickback), C5 (closure), A5 (archival), E1 (comments), E4 (status broadcasting)

#### 2.3 Reviewer (`reviewer.md`)
- **Agent:** Any developer assigned as reviewer
- **Queue:** Picks up from `ready-for-code-review`
- **Core responsibilities:** Review code, provide feedback, approve or request changes, route approved work to QA
- **Status discipline:** Sets `working` on review start, `idle` on review completion — **never** marks `complete`
- **Handoff targets:** `ready-for-qa` (approved), `ready-for-development` (changes requested, reassigned to original dev)
- **Key workflows:** B5 (review prep, from reviewer's side), E2 (cross-queue handoff)

#### 2.4 Coordinator (`coordinator.md`)
- **Agent:** Lead developer, dispatcher, or operator
- **Queues:** Monitors `triage`, `blocked`, and all role-specific queues
- **Core responsibilities:** Triage incoming tasks, establish coordination plans, manage dependencies and blocked tasks, resolve conflicts and escalations, perform bulk operations, manage sprint transitions, maintain queue health
- **Status discipline:** Does not typically set `working` — coordinates rather than implements
- **Key workflows:** D1–D5 (dependencies, linking, reorganization, bulk ops), E3 (multi-agent coordination), E4 (status broadcasting), E5 (conflict resolution & escalation), triage handoffs, sprint cleanup

#### 2.5 Shared (`SKILL.md`)
- **Audience:** All agents
- **Purpose:** Common reference for CLI commands, task model, conventions, and global rules that every role must know
- **Content:** Core concepts, task fields, status values, priority levels, queue definitions, CLI installation/config, all CLI command syntax, output formats, naming/tagging/commenting conventions, queue transition rules, golden rules for all agents
- **Role files reference this** rather than duplicating CLI syntax

---

## 3. Design Principles

> **⚠️ CRITICAL CONSTRAINT — READ BEFORE WRITING ANY SKILL FILE**
>
> The task-management skill is loaded into agent context **constantly** — it is active on nearly every turn. This means:
>
> 1. **Every line costs tokens on every turn.** A 400-line skill file costs ~4× more context overhead than a 100-line file, on every single interaction.
> 2. **Be ruthlessly tight.** No preamble, no throat-clearing, no "This section explains…" intros. Get to the command.
> 3. **Do not repeat patterns.** If a command pattern is shown once (e.g., `tinytask task update <id> --status working`), do not re-show the full command in the next section. Reference it: "set to working (see §3)".
> 4. **One example teaches multiple lessons.** A single well-constructed example should demonstrate the command, the comment, the status change, the queue move, and the reassignment all at once — not 5 separate examples.
> 5. **Dense, not sparse.** Prefer a table or a combined command block over prose. One code block with 5 chained commands teaches more than 5 paragraphs.
> 6. **Complete but not exhaustive.** Cover every use case the role encounters, but use the minimal representation for each. If 3 scenarios follow the same pattern, show the pattern once with a note: "Same pattern for X, Y, Z."
> 7. **No duplicate CLI syntax.** Full command syntax lives in `SKILL.md` only. Role files show **usage patterns** (ready-to-run command sequences), not `--help` style reference.
>
> **Target: each role file should be 150–250 lines.** The shared file can be larger (~300–350) since it's the reference layer. Total across all files should be under ~1,200 lines.
>
> **Writing process:** Each skill file will be written in a separate session with a context reset. The writer must re-read this plan document (`SKILL-PLAN.md`) before writing each file to internalize these constraints and the content plan for that specific role.

### 3.1 Each Skill File is Self-Contained but References Shared
Each role-specific file contains:
- Role identity and queue assignments
- Role-specific workflows (step-by-step, with CLI commands)
- Role-specific rules and constraints
- Role-specific checklists
- Quick-reference command sequences for that role

CLI command syntax and global conventions are in `SKILL.md`. Role files reference shared conventions by name but don't duplicate the full CLI syntax reference.

### 3.2 Skill File Format
Each file follows the goose skill format:
```markdown
---
name: <role-name>
description: <one-line description — NO agent names, keep generic>
---

# <Role Name> Task Management Skill

<content>
```

**Agent name rules:**
- The `description` field must be **generic** — no agent names (e.g., do not write "Developer skill for tko-sword").
- In the skill **body**, agent names (e.g., `tko-sword`, `tko-shield`) are **examples only**. Mark them as examples and instruct the agent to use names from its own environment.
- Agent names are known from the agent's `AGENTS.md` file and its system context — the skill should not hardcode them as absolute.
- Use patterns like `<your-agent-name>`, `<reviewer>`, `<qa-agent>`, or `e.g., tko-sword` in command examples.

### 3.3 Content Structure per Role File
```
1. Role Overview (identity, queue, status discipline)
2. Your Queues (which queues to monitor, which to hand off to)
3. Core Workflows (step-by-step with CLI commands)
4. Handoff Patterns (who you hand off to, how, which queue)
5. Rules & Constraints (what you can/cannot do)
6. Checklists (pre-task, pre-handoff, pre-verification, etc.)
7. Quick Reference (command sequences specific to this role)
```

### 3.4 What Stays in `SKILL.md`
- CLI installation & configuration
- All CLI command syntax (task, subtask, queue, comment, link, config commands)
- Output formats
- Core data model (task fields, status values, priority levels)
- Global conventions (naming, tagging, commenting, queue rules)
- Queue transition rules table
- Common mistakes reference (condensed)
- The "golden rules" all agents must follow

---

## 4. File-by-File Content Plan

### 4.1 `SKILL.md` — Shared Task Management Reference

**Sections:**

| Section | Content | Source |
|---|---|---|
| Overview | What TinyTask is, how the CLI works | Foundation §1, CLI Ref §1 |
| Core Concepts | Task, subtask, queue, comment, link, history | Foundation §2 |
| Task Fields | All fields with types and descriptions | Foundation §4 |
| Status Values | `idle`, `working`, `complete` — who can set each | Foundation §4.3, Conventions §5 |
| Priority Levels | `low`–`urgent` with numeric ranges | Foundation §4.4, Conventions §4 |
| Standard Queues | All queue definitions and responsible roles | Foundation §2.3, Conventions §6.1 |
| Queue Transition Rules | Full transition table | Foundation §6, Conventions §6.2 |
| CLI Setup | Installation, config init, server URL, default agent | CLI Ref §1.1–1.4 |
| Task Commands | Create, get, update, list, delete, archive | CLI Ref §2, current-skill.md |
| Subtask Commands | Create, list, tree, move | CLI Ref §3, current-skill.md |
| Queue Commands | List, stats, tasks, add, remove, move, clear | CLI Ref §4, current-skill.md |
| Agent Workflow Commands | View queue, signup, move | CLI Ref §4.1, current-skill.md |
| Comment Commands | Add, list, update, delete | CLI Ref §5, current-skill.md |
| Link Commands | Add, list, update, delete | CLI Ref §6, current-skill.md |
| Config Commands | Init, show, set, get, profiles | CLI Ref §7, current-skill.md |
| Output Formats | Table, JSON, CSV, compact | CLI Ref §8, current-skill.md |
| Global Conventions | Naming, tagging, commenting, queue discipline | Conventions §2, §3, §7, §6 |
| Golden Rules | All-agent rules (never mark complete unless tester, always comment on changes, etc.) | Foundation §3.3, Conventions §5 |
| Common Mistakes | Condensed reference table | Conventions §17 |

**Estimated size:** ~350–400 lines

---

### 4.2 `developer.md` — Developer Skill

**Sections:**

| Section | Content | Source |
|---|---|---|
| Role Overview | Agent: tko-sword. Queue: ready-for-development. Status: never complete. | Foundation §3.1 |
| Your Queues | Monitor: ready-for-development. Hand off to: ready-for-qa, ready-for-testing, ready-for-code-review. | Foundation §6, Conventions §6 |
| Task Pickup & Start | Review task → check dependencies → set working → add start comment | A2 |
| Task Completion & Handoff (Feature) | Verify work → completion comment → link PR → set idle → move to ready-for-qa → reassign to tester | A3 |
| Defect Fix Handoff | Fix complete → fix summary comment → set idle → move to ready-for-testing → reassign to creator | A3 (variation), C3 |
| Subtask Decomposition | Analyze parent → plan decomposition → create subtasks → document → assign queues → verify tree | B1 |
| Working with Subtask Trees | View tree → identify your tasks → work in dependency order → handle sibling deps → track progress → complete parent | B2 |
| Parallel Development | Assign subtasks to different agents → coordinate via parent comments → communicate progress → pick up dependent subtasks as deps clear | B3 |
| Context Switching & Interruption | Document progress → set idle → pick up urgent task → complete → resume paused task | B4 |
| Code Review Prep | Self-review → write completion comment → link PR → set idle → move to ready-for-code-review → assign reviewer | B5 |
| Defect Fix Pickup | Check queue for bugs → review full task → reproduce locally → set working → implement fix → write tests → verify | C2 |
| Dependencies | Set blocked_by (via MCP/REST) → add comment → notify blocking task assignee → move to blocked queue | D1 |
| Comments & Communication | Ask questions, provide context, document decisions, report progress | E1 |
| Status Broadcasting | Notify hub tasks, dependent tasks, and queues on status changes | E4 |
| Developer Rules | Never mark complete. Always idle before handoff. Always comment on status/queue changes. Don't work on others' tasks without coordination. Don't run app from CLI. | Foundation §3.3, Conventions §5, §12 |
| Pre-Task Checklist | Read description, check comments/history, verify deps, set working, add start comment | Conventions §12.1 |
| Pre-Handoff Checklist | Acceptance criteria met, tests pass, lint passes, code formatted, completion comment, PR linked, status idle, correct queue, correct assignee | Conventions §12.2 |
| Code Quality Standards | SOLID/DRY, no `any`, Zod schemas, test coverage, Vitest, architectural boundaries, halt before architectural decisions | Conventions §12.3, §12.4 |
| Quick Reference | Command sequences: pickup, feature handoff, defect handoff, subtask decomposition, context switch, code review handoff | Scenario A/B/C quick refs |

**Estimated size:** ~300–350 lines

---

### 4.3 `tester.md` — Tester Skill

**Sections:**

| Section | Content | Source |
|---|---|---|
| Role Overview | Agent: tko-shield. Queues: ready-for-testing, ready-for-qa. Can mark complete. | Foundation §3.2 |
| Your Queues | Monitor: ready-for-testing (defect verification), ready-for-qa (feature verification). Hand off to: ready-for-development (kickback). | Foundation §6, Conventions §6 |
| Bug Reporting | Reproduce & document → create defect task (BUG: prefix) → assign to dev queue → link related tasks → add filing comment → verify | C1 |
| Defect Fix Verification | Pick up from ready-for-testing → read fix summary → re-run reproduction steps → test edge cases → check regressions → pass (close) or fail (kickback) | C3 (tester side) |
| Feature Verification | Pick up from ready-for-qa → read completion comment → test acceptance criteria → test edge cases → check regressions → pass (close) or fail (kickback) | A3 (tester side), Conventions §13 |
| Kickback & Re-fix Cycle | Document verification failure → set idle → move to ready-for-development → reassign to developer → add detailed failure comment | C4 |
| Defect Closure & Cleanup | Verify complete → write closure comment → mark complete → check related tasks → update feature task → archive | C5 |
| Task Archival | Confirm complete → check subtasks → add final comment → archive → verify | A5 |
| Bug Description Template | Standard template for filing bugs | Conventions §11.2 |
| Verification Standards | Read fix summary, re-run reproduction, check regressions, test edge cases, document results | Conventions §13 |
| Kickback Etiquette | Be specific, don't fix it yourself, note test case, escalate after 3 cycles | Conventions §13.3 |
| Tester Rules | Can mark complete. Never close without reproducing. Always add closure comment. Always reassign kicked-back tasks to developer. Use ready-for-testing for defects, not ready-for-qa. | Foundation §3.2, Conventions §13 |
| Pre-Verification Checklist | Read developer's summary, re-run reproduction steps, check regressions, test edge cases, write closure/kickback comment, update status | Conventions §18 (verification section) |
| Pre-Archival Checklist | Task is complete, all subtasks resolved, final comment added, archive command (not delete) | Conventions §18 (archival section) |
| Quick Reference | Command sequences: bug filing, verification pass, verification fail/kickback, closure, archival | Scenario C quick ref |

**Estimated size:** ~250–300 lines

---

### 4.4 `reviewer.md` — Code Reviewer Skill

**Sections:**

| Section | Content | Source |
|---|---|---|
| Role Overview | Any developer acting as reviewer. Queue: ready-for-code-review. Never marks complete. | B5, Conventions §6.1 |
| Your Queue | Monitor: ready-for-code-review. Hand off to: ready-for-qa (approved) or ready-for-development (changes requested). | Conventions §6.2 |
| Review Pickup | Get task → read completion comment → read linked PR → set working → add start comment | B5 (reviewer side) |
| Review Process | Check code quality, test coverage, error handling, naming, SOLID/DRY, architectural boundaries, unused code, TypeScript standards | Conventions §12.3 |
| Providing Feedback (Changes Requested) | Write detailed feedback comment → set idle → move to ready-for-development → reassign to original developer | B5 |
| Approving (Review Passed) | Write approval comment → set idle → move to ready-for-qa → reassign to tester | B5 |
| Expedited Review | For trivial changes: skip review, go directly to QA | B5 (variation) |
| Reviewing Parent Tasks with Multiple Subtasks | Aggregate subtask reviews, move all to review, assign to same reviewer, review in dependency order | B5 (variation) |
| Reviewer Rules | Never mark complete. Always provide specific feedback. Link to code. Address feedback promptly. Don't offload basic checks to reviewer. | B5, Conventions §12.3 |
| Quick Reference | Command sequences: review pickup, changes requested, approved | B5 quick ref |

**Estimated size:** ~150–200 lines

---

### 4.5 `coordinator.md` — Coordinator/Dispatcher Skill

**Sections:**

| Section | Content | Source |
|---|---|---|
| Role Overview | Lead developer, dispatcher, or operator. Coordinates across all queues. | E3, E5, D1–D5, Conventions §14 |
| Your Queues | Monitor: triage, blocked, and all role-specific queues. Route tasks between queues. | Conventions §6 |
| Triage | Evaluate incoming tasks → determine if bug/feature/research → route to appropriate queue → add routing comment | E2 (triage variation) |
| Multi-Agent Coordination | Establish coordination hub → post coordination plan → agents report start/completion → coordinate shared files → post progress → finalize | E3 |
| Status Broadcasting & Awareness | Identify who needs to know → update status → broadcast to hub → notify dependent tasks → use queue placement for visibility → link external references | E4 |
| Conflict Resolution & Escalation | Document conflict → propose resolution → seek consensus → escalate (raise priority, create decision task, block task) → implement decision → create follow-up tasks | E5 |
| Setting Up Dependencies | Identify dependency → set blocked_by (MCP/REST) → add comment → notify blocking task assignee → move to blocked queue → verify | D1 |
| Managing Blocked Tasks | Identify blocked tasks → check blocking task status → move to blocked queue → detect unblocks → resume unblocked tasks → clear dependency (optional) | D2 |
| Linking Tasks | Determine link target → add link → add comment → verify. Use [blocks], [related], [duplicate] prefix conventions. | D3 |
| Task Reorganization | Review hierarchy → identify what needs to move → move subtask → add comment → notify old/new parents → verify | D4 |
| Bulk Task Management | Identify target set → review → batch archive/queue clear/reassign/queue move/status update → verify results | D5 |
| Sprint Transition Cleanup | Archive completed tasks → move idle tasks to backlog → check for orphaned working tasks | D5 (variation) |
| Queue Health Management | Regularly check queue stats, clear stale tasks, monitor blocked queue, review long-idle tasks | Conventions §6.4 |
| Coordinator Rules | Always add comments on bulk operations. Always verify before destructive bulk ops. Export backup before large bulk operations. Don't clear queues blindly. Archive subtasks before parents. | D5, Conventions §15 |
| Pre-Bulk-Op Checklist | Identify target set, review task set, verify tasks are in appropriate state, export backup | Conventions §15.3, D5 |
| Quick Reference | Command sequences: triage, coordination hub, dependency setup, bulk archive, bulk reassign, sprint cleanup | D/E quick refs |

**Estimated size:** ~300–350 lines

---

## 5. Cross-File References

Role files will reference the shared file for:
- CLI command syntax (e.g., "See `SKILL.md` §Task Commands for full syntax")
- Global conventions (e.g., "See `SKILL.md` §Global Conventions for tagging rules")
- Core data model (e.g., "See `SKILL.md` §Task Fields for field reference")

Role files will cross-reference each other at handoff points:
- `developer.md` → "When handing off for code review, see `reviewer.md` for the review process"
- `developer.md` → "When handing off for QA, see `tester.md` for the verification process"
- `tester.md` → "When kicking back a defect, see `developer.md` for the defect fix pickup process"
- `coordinator.md` → "When coordinating multi-agent work, developers follow `developer.md` and testers follow `tester.md`"

---

## 6. File Naming & Location

All skill files will be placed in:
```
/enigma-home/repos/tinytask/docs/skill/
```

| File | Role |
|---|---|
| `SKILL.md` | Common CLI & conventions reference (all roles). Goose loads this as the base skill. |
| `developer.md` | Developer skill |
| `tester.md` | Tester skill |
| `reviewer.md` | Code reviewer skill |
| `coordinator.md` | Coordinator/dispatcher skill |
| `current-skill.md` | (Existing — will be replaced by `SKILL.md` or kept as legacy reference) |
| `SKILL-PLAN.md` | This plan document |

**How goose loads skills:** `SKILL.md` is the common/shared reference that all agents load as a base. Goose automatically picks up the role-specific skill file deployed to the agent (e.g., `developer.md` is deployed to developer agents). The role file and `SKILL.md` work together — the role file provides workflows, `SKILL.md` provides CLI syntax and conventions.

---

## 7. Migration Plan

### Phase 1: Create Skill Files (This Plan)
1. Create `SKILL.md` — extract CLI syntax and global conventions from current skill + process manual
2. Create `developer.md` — extract developer workflows from process manual scenarios A, B, C (dev side)
3. Create `tester.md` — extract tester workflows from process manual scenarios C (QA side), A5
4. Create `reviewer.md` — extract reviewer workflows from scenario B5
5. Create `coordinator.md` — extract coordinator workflows from scenarios D, E and conventions

### Phase 2: Update Agent Configurations
1. `SKILL.md` is deployed as the common base skill for all agents
2. Goose automatically picks up the role-specific skill file deployed to each agent
3. Developer agents → `developer.md` (deployed alongside `SKILL.md`)
4. Tester agents → `tester.md` (deployed alongside `SKILL.md`)
5. Reviewer assignments → `reviewer.md` (deployed alongside `SKILL.md`)
6. Coordinator agents → `coordinator.md` (deployed alongside `SKILL.md`)

### Phase 3: Deprecate `current-skill.md`
1. Once all role files are created and tested, `current-skill.md` can be archived or kept as a legacy reference
2. `SKILL.md` supersedes the CLI command reference portion
3. Role files supersede the workflow guidance portion (which was missing entirely)

---

## 8. Implementation Notes

### 8.1 What to Include vs. Exclude
- **Include in role files:** Role-specific workflows, rules, checklists, command patterns, handoff targets
- **Exclude from role files (keep in `SKILL.md`):** Full CLI syntax, global conventions, data model reference
- **Include in role files as quick reference:** Ready-to-run command sequences — combined blocks that show the full workflow in one code block, not isolated commands
- **Anti-pattern:** Do NOT show `tinytask task update <id> --status working` as a standalone example, then show it again in a "handoff" section, then again in a "context switch" section. Show it once in context, then reference: "set to working (§3)".
- **Anti-pattern:** Do NOT write prose like "To set the status to working, use the update command with the --status flag set to working." Just show the command.

### 8.2 Tone & Format
- **Imperative voice** — "Set status to working", "Add a comment" — no "You should…" or "The agent will…"
- **No intros** — Don't write "This section covers the process for…". Start with the action or the command.
- **Combined command blocks** — Show an entire workflow as one chained code block (comment + status + queue + reassign in sequence), not as separate steps with prose between each
- **Tables for rules** — Rules and constraints go in tables, not paragraphs
- **Checklists** — Checkbox lists for pre-task/pre-handoff verification
- **Cross-references** — "See `SKILL.md` §Queue Commands" — don't duplicate the syntax

### 8.3 Size Targets
| File | Target Lines | Rationale |
|---|---|---|
| `SKILL.md` | 300–350 | Comprehensive CLI + conventions reference (the reference layer) |
| `developer.md` | 200–250 | Most workflows, most complex role — but dense patterns |
| `tester.md` | 150–200 | Focused on verification and bug workflows |
| `reviewer.md` | 100–150 | Narrow scope, subset of developer |
| `coordinator.md` | 200–250 | Broad scope, but many patterns overlap with shared |
| **Total** | ~950–1,200 | Context-conscious: every line costs tokens on every turn |

### 8.4 Relation to AGENTS.md
The project's `AGENTS.md` contains technology stack and development rules (TypeScript standards, testing with Vitest, etc.). These are **project-level** development standards, not task management workflow standards. The skill files focus on task management workflows and reference `AGENTS.md` for code quality standards where relevant (specifically in `developer.md` §Code Quality Standards).

---

## 9. Roles NOT Requiring Separate Skill Files

| Role | Why It Doesn't Need a File |
|---|---|
| **Operator** | The operator is a human who interacts with the system, not an LLM agent. The coordinator skill covers escalation-to-operator workflows. |
| **Product Owner** | Not defined in the process manual. If product management workflows are added later, a `product.md` skill can be created. |
| **DevOps** | Referenced only as an external dependency (CI/CD pipeline). Not a TinyTask agent role. |
| **Architect** | Architectural decisions are handled via the conflict resolution / escalation workflow in the coordinator skill. Not a separate role. |

---

## 10. Resolved Questions

1. **~~Should `current-skill.md` be deleted or kept?~~** **RESOLVED:** Keep as `current-skill.md.legacy` or remove once `SKILL.md` is validated. `SKILL.md` supersedes the CLI command reference portion.

2. **Should the reviewer be a separate file or a section in `developer.md`?** Recommend separate file because: (a) the user asked for role-based files named by role, (b) code review has distinct workflows, queues, and handoff patterns, (c) any developer can be a reviewer at different times — the skill should be loadable independently.

3. **~~How should agents load multiple skill files?~~** **RESOLVED:** `SKILL.md` is the common/shared skill that all agents load as a base. Goose automatically picks up the role-specific skill file deployed to the agent. No manual multi-file configuration needed — the agent gets `SKILL.md` + its deployed role file.

4. **Should the coordinator skill include dispatcher-specific naming?** The user mentioned "dispatcher" — the file is named `coordinator.md` which encompasses dispatch/triage/coordination. If the user prefers `dispatcher.md`, this can be renamed.

---

## 11. Summary

This plan defines **5 skill files** (shared + 4 role-specific) that replace the single `current-skill.md`. Each role file is tailored to the workflows, rules, and command patterns that role needs, while `SKILL.md` provides the common CLI reference and conventions all roles share. The files are derived directly from the 8-file TinyTask Process Manual, mapping each scenario and convention to the role responsible for it.

| File | Covers Process Manual Sections |
|---|---|
| `SKILL.md` | Foundation (all), CLI Reference (all), Conventions (all) |
| `developer.md` | Foundation §3.1, Scenarios A1–A3, B1–B5, C2–C3, D1, E1, E4, Conventions §5, §12 |
| `tester.md` | Foundation §3.2, Scenarios C1, C3–C5, A5, E1, E4, Conventions §11, §13 |
| `reviewer.md` | Scenario B5, Conventions §6.1 (ready-for-code-review), §12.3 |
| `coordinator.md` | Scenarios D1–D5, E2–E5, Conventions §6, §14, §15 |
