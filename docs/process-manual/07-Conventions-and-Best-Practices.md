# Conventions & Best Practices

> **Prerequisite:** Read [00-Foundation.md](./00-Foundation.md) for core concepts, data model, roles, and queue rules.
> **Scope:** Naming conventions, tagging standards, prioritization guidelines, comment etiquette, queue discipline, subtask and dependency norms, and operational best practices for all TinyTask agents.

---

## 1. Introduction

This document consolidates the conventions, standards, and best practices that govern day-to-day operations in the TinyTask system. While the Foundation document defines the data model and rules, and the scenario documents provide step-by-step workflows, this document is the **normative reference** for how tasks should be named, tagged, prioritized, commented on, and managed at an operational level.

Every agent — developer, tester, or coordinator — should internalize these conventions. They are not optional guidelines; they are the shared agreement that makes multi-agent collaboration work.

### How This Document Relates to Others

| Document | Scope | This Document's Role |
|---|---|---|
| [00-Foundation.md](./00-Foundation.md) | Core concepts, data model, roles, lifecycle | Provides the framework; this document fills in the norms |
| [Scenario Group A](./01-Scenario-Group-A-Core-Task-Lifecycle.md) | Core task lifecycle | This document defines the conventions used in those scenarios |
| [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) | Development workflows | This document defines decomposition and code review norms |
| [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) | QA & bug workflows | This document defines defect reporting and verification standards |
| [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) | Dependencies & organization | This document defines dependency and linking conventions |
| [Scenario Group E](./05-Scenario-Group-E-Collaboration-and-Communication.md) | Collaboration & communication | This document defines comment etiquette and coordination norms |
| [CLI Command Reference](./06-CLI-Command-Reference.md) | CLI syntax | This document defines when and how to use CLI commands effectively |

---

## 2. Task Naming Conventions

### 2.1 Title Format

Task titles are the primary identifier in queue views, search results, and notifications. A well-written title communicates the task's purpose at a glance.

**Rules:**

| Rule | Description | Example |
|---|---|---|
| Start with an action verb | Use "Implement", "Fix", "Investigate", "Refactor", "Update", "Add", "Remove", "Document" | ✅ `Implement pagination on task list endpoint` |
| Be specific | Include the component, endpoint, or feature area | ✅ `Fix URL encoding in login password handler` |
| Keep under 80 characters | Long titles truncate in queue views and tables | ✅ `Add rate limiting to auth endpoints` |
| Distinguish from other tasks | No two tasks should have interchangeable titles | ✅ `Update session token expiry to 24h` (not `Update token`) |

**Prefixes for task types:**

| Prefix | When to Use | Example |
|---|---|---|
| `BUG:` | Defect tasks filed by QA | `BUG: POST /api/auth/login returns 500 on special character passwords` |
| `DECISION:` | Escalation/decision tasks | `DECISION: Rate limiter approach (sliding vs fixed window)` |
| `Follow-up:` | Deferred work from a resolved conflict | `Follow-up: Implement sliding window rate limiter` |
| *(no prefix)* | Feature tasks, research, configuration, documentation | `Implement user authentication` |

### 2.2 What to Avoid in Titles

- **Vague titles**: "Fix stuff", "Update things", "Look into it" — these are unacceptable.
- **Status in titles**: Don't put status in the title (e.g., "WIP: Login endpoint"). Use the `status` field.
- **Assignee in titles**: Don't name the assignee in the title (e.g., "tko-sword: schema work"). Use the `assigned_to` field.
- **Task IDs in titles**: The system auto-generates IDs. Don't include them in the title.
- **Excessive punctuation**: Avoid trailing ellipses (...), exclamation marks (!), or question marks (?) unless the task is genuinely a question.

### 2.3 Description Standards

A task description should be detailed enough for **another agent who has no prior context** to understand the work.

**Required elements:**

- **What**: Clear statement of the work to be done.
- **Why**: The motivation or business reason.
- **Acceptance criteria**: What constitutes "done" — be specific and testable.
- **Context**: Links to specs, design docs, related tasks, or prior discussion.

**Example of a good description:**

```
Add limit/offset pagination to GET /tasks endpoint.

Currently the endpoint returns all tasks in a single response. With growing task counts, this causes performance issues and large payloads.

Acceptance criteria:
- GET /tasks accepts `limit` (default 50, max 200) and `offset` (default 0) query parameters
- Response includes `X-Total-Count` header with the total count of matching tasks
- Returns 400 if limit > 200 or < 1
- Backward compatible: omitting params returns the first 50 tasks

Related: #20260724_01 (task list performance investigation)
```

**What to avoid in descriptions:**

- One-liners with no context ("Fix the bug")
- Walls of text with no structure — use numbered lists and headers
- References to verbal conversations or external channels without context ("As discussed")
- Copy-pasted error logs without explanation of what the expected behavior should be

---

## 3. Tagging Conventions

### 3.1 Tag Format

- **Lowercase only**: `api`, not `API` or `Api`
- **Hyphenated multi-word**: `rate-limiting`, not `rate_limiting` or `rateLimiting`
- **Singular form**: `endpoint`, not `endpoints`
- **No spaces**: Tags are single tokens

### 3.2 Standard Tags

| Tag | Component / Concern | When to Use |
|---|---|---|
| `api` | REST API endpoints | Tasks involving HTTP endpoints |
| `mcp` | MCP protocol layer | Tasks involving MCP tools, resources, or transport |
| `cli` | Command-line interface | Tasks involving the `tinytask` CLI |
| `database` | SQLite / data layer | Schema changes, migrations, queries |
| `auth` | Authentication / authorization | Login, registration, sessions, tokens |
| `bug` | Defect | All bug/defect tasks (set by QA when filing) |
| `regression` | Regression bug | A previously working feature is now broken |
| `testing` | Test infrastructure | Test creation, test framework changes |
| `documentation` | Documentation | Process manual, API docs, README |
| `config` | Configuration | Environment, config files, deployment setup |
| `security` | Security concern | Input validation, auth, encryption |
| `performance` | Performance | Optimization, benchmarking, load testing |
| `refactor` | Code refactoring | Restructuring without behavior change |
| `decision` | Decision/escalation task | Conflict resolution, architectural decisions |
| `enhancement` | Future improvement | Deferred work, non-urgent improvements |

### 3.3 Tagging Rules

- **Tag by component or concern**, not by status or agent. Never use tags like `working`, `idle`, `tko-sword`, or `sprint-3`.
- **Always tag bug tasks** with `bug` plus the affected component (e.g., `bug,api,auth`).
- **Tag at creation time**, not as an afterthought. Tags help with filtering and reporting.
- **Don't over-tag**. Two to four tags is typical. More than five is excessive.
- **Custom tags are allowed** but should follow the same format rules (lowercase, hyphenated).

---

## 4. Priority Guidelines

### 4.1 Priority Levels

| Priority | Numeric | When to Use |
|---|---|---|
| `low` | 1–3 | Non-urgent, can wait indefinitely. Documentation polish, minor refactors, cosmetic fixes. |
| `medium` | 4–6 | Normal priority (default). Most feature work and non-critical bugs. |
| `high` | 7–8 | Should be addressed soon. Bugs affecting users, features blocking other work. |
| `urgent` | 9–10 | Blocks other work or affects production. Address immediately. |

### 4.2 Setting Priority

**When creating a task**, set a realistic priority based on impact:

```bash
# High priority: blocks other work
tinytask task create "Fix database migration failing on staging" \
  --priority 8 --tags "bug,database" --assigned-to tko-sword

# Medium priority: normal feature work
tinytask task create "Add pagination to task list endpoint" \
  --priority 5 --tags "api" --assigned-to tko-sword

# Low priority: nice-to-have
tinytask task create "Update README with latest CLI examples" \
  --priority 2 --tags "documentation,cli" --assigned-to tko-sword
```

**Escalating priority** during a conflict or kickback cycle:

```bash
# After 3 kickback cycles, escalate
tinytask task update 20260724_30 --priority 9
tinytask comment add 20260724_30 "ESCALATION: 3 kickback cycles. Raising to urgent."
```

### 4.3 Priority Discipline

- **Don't default to urgent**. If everything is urgent, nothing is. Reserve `urgent` for genuine blockers.
- **Don't downgrade priority silently**. If you reduce a task's priority, add a comment explaining why.
- **Priority is not a substitute for communication**. If work is urgent, also notify via comments and the coordination hub.
- **Priority reflects impact, not effort**. A small fix that blocks production is `urgent`. A large feature with no dependencies is `medium`.

---

## 5. Status Discipline

### 5.1 Status Values and Ownership

| Status | Meaning | Who Sets It | When |
|---|---|---|---|
| `idle` | Not being actively worked; waiting for pickup or handoff | Any agent | At creation, before pickup, on handoff, on pause |
| `working` | Actively being worked on | The assignee only | When starting or resuming work |
| `complete` | Finished and verified | Tester / QA role only | After verification passes |

### 5.2 Golden Rules

1. **Developers never mark tasks `complete`.** This is the tester's role after verification.
2. **Always set to `idle` before moving queues.** A `working` task in a handoff queue is ambiguous.
3. **Set to `idle` when pausing.** Leaving a task in `working` when you're not actively working on it creates false signals.
4. **Set to `working` when starting.** Other agents may pick up the same task if it remains `idle`.
5. **Status changes must be accompanied by a comment.** Explain why the status changed.

### 5.3 Status Anti-Patterns

| Anti-Pattern | Why It's Bad | Correct Approach |
|---|---|---|
| Developer marks `complete` | QA hasn't verified the work | Developer sets `idle` and moves to `ready-for-qa` |
| Task left in `working` during handoff | Receiving agent doesn't know if someone is still working on it | Set to `idle` before moving to handoff queue |
| Task in `working` with no comment | No one knows when work started or what progress has been made | Always add a start comment |
| `complete` without verification comment | No audit trail of what was verified | Tester adds closure comment before marking `complete` |
| Pausing without updating status | Others think work is progressing | Set to `idle` and document progress in a comment |

---

## 6. Queue Discipline

### 6.1 Standard Queues

| Queue | Purpose | Responsible Role |
|---|---|---|
| `ready-for-development` | Tasks assigned to a developer for implementation | Developer (`tko-sword`) |
| `ready-for-testing` | Defect fixes that need re-verification by the reporter | Tester (`tko-shield`) |
| `ready-for-qa` | Feature work completed by developer, ready for final QA review | Tester (`tko-shield`) |
| `ready-for-code-review` | Implementation ready for developer-to-developer review | Reviewing developer |
| `blocked` | Tasks waiting on a dependency | Any (monitored by coordinator) |
| `triage` | Tasks being evaluated for routing | Coordinator / lead |
| `backlog` | Tasks not yet scheduled for a sprint | Any |

### 6.2 Queue Transition Rules

| From | To | Trigger | Who |
|---|---|---|---|
| (new) | `ready-for-development` | Task created for dev work | Any agent |
| `ready-for-development` | `ready-for-qa` | Developer completes feature | Developer |
| `ready-for-development` | `ready-for-testing` | Developer fixes defect | Developer |
| `ready-for-development` | `ready-for-code-review` | Developer requests code review | Developer |
| `ready-for-testing` | `ready-for-development` | QA finds issue, kicks back | Tester |
| `ready-for-code-review` | `ready-for-development` | Reviewer requests changes | Reviewer |
| `ready-for-code-review` | `ready-for-qa` | Reviewer approves | Reviewer |
| `ready-for-qa` | (complete) | QA verifies and closes | Tester |
| Any | `blocked` | Task is blocked by a dependency | Any agent |
| `blocked` | `ready-for-development` | Dependency resolved | Any agent |

### 6.3 Queue Rules

1. **Always add a comment when moving between queues** explaining the reason.
2. **Always update the assignee to match the destination queue's role.** A task in `ready-for-qa` assigned to a developer is confusing.
3. **Never leave a task in `working` status when moving it to another queue.** Set it to `idle` first.
4. **Use `ready-for-testing` for defect fix verifications**, not `ready-for-qa`. `ready-for-qa` is for feature completions.
5. **Use the `blocked` queue** for tasks waiting on dependencies. Don't leave blocked tasks in active queues.
6. **Custom queues are allowed** (e.g., `triage`, `backlog`, `research`) but should be documented and communicated to all agents.

### 6.4 Queue Management Best Practices

- **Regularly check your queue** at the start of each session:
  ```bash
  tinytask queue view --mine
  ```

- **Check queue statistics** to understand workload distribution:
  ```bash
  tinytask queue stats ready-for-development
  ```

- **Clear stale tasks** from queues periodically. Tasks that have been `idle` for a long time should be reviewed, re-prioritized, or archived.

- **Don't clear queues blindly.** `tinytask queue clear <queue> --yes` removes queue assignments but doesn't archive tasks. Always verify contents before clearing:
  ```bash
  tinytask queue tasks <queue> --json
  ```

---

## 7. Comment Etiquette

### 7.1 When to Comment

Comments are the primary inter-agent communication channel. **Always comment when:**

| Action | Comment Content |
|---|---|
| Starting work on a task | What you're starting, any initial findings |
| Pausing work | What's done, what's left, branch/commit reference |
| Completing implementation | What was implemented, how it was tested, what QA should focus on |
| Moving a task between queues | Why the task is being moved |
| Reassigning a task | Why the task is being transferred, context for the new assignee |
| Setting a dependency | Why the dependency exists |
| Resolving a dependency | That the blocker is complete, dependents can proceed |
| Filing a bug | Reproduction context, severity rationale, what to check |
| Fixing a bug | Root cause, what was changed, how it was tested |
| Verifying a fix (pass) | What was verified, test results, closure confirmation |
| Verifying a fix (fail) | What failed, exact steps, expected vs. actual |
| Escalating a conflict | Each agent's position, tradeoffs, proposed resolution |
| Archiving a task | Why the task is being archived |

### 7.2 Comment Quality Standards

**Good comments are:**

- **Specific**: Include task IDs, file names, line numbers, branch names, commit hashes.
- **Actionable**: The reader should know what to do next.
- **Concise**: Get to the point. Use numbered lists for multiple items.
- **Referenced**: Link related tasks (e.g., "See #20260724_05 for schema design").

**Comment templates:**

**Start comment:**
```
Started work. <Brief summary of approach>. Branch: <branch-name>.
```

**Pause comment:**
```
Pausing to handle <reason>. Progress: <X% done>. Remaining: <list>. Branch: <branch>. Last commit: <hash>.
```

**Completion comment:**
```
Implementation complete.
- What was done: <summary>
- How tested: <test details and results>
- QA focus: <areas to verify>
- Branch: <branch>
- PR: #<number> (if applicable)
```

**Fix summary comment:**
```
Fix complete.
- Root cause: <explanation>
- Changes: <list of changes with file references>
- Tests: <new/updated tests, results>
- Branch: <branch>. Commit: <hash>.
```

**Verification pass comment:**
```
Verified. Original reproduction steps now pass. <Test details>. Closing.
```

**Verification fail comment:**
```
Verification FAILED. <What didn't work>.
Re-tested:
1. <step>
2. <step>
Expected: <expected>
Actual: <actual>
```

### 7.3 What to Avoid in Comments

| Anti-Pattern | Example | Better Alternative |
|---|---|---|
| Vague comment | "Looks good" | "Reviewed the rate limiting implementation. The sliding window logic in `src/auth/rate-limit.ts:42` is correct. CI passes." |
| No context | "Fixed" | "Fixed. Root cause was missing URL decode in `login.ts:31`. Added `decodeURIComponent()` call. New test covers +, &, = characters." |
| Status-only comment | "Done" | "Implementation complete. POST /auth/login now accepts special character passwords. 8 tests passing. Branch: fix/login-chars." |
| Wall of text | *(500 words of unstructured prose)* | Break into sections with headers or numbered lists |
| Unlinked reference | "See the other task" | "See #20260724_05 for schema design" |
| Deleting with responses | Deleting a comment that was answered | Update the comment with a correction note instead |
| Comment instead of update | "I'm assigning this to tko-shield" | Use `tinytask task update --assigned-to tko-shield` then add a comment explaining why |

---

## 8. Subtask Conventions

### 8.1 When to Decompose

Create subtasks when a task is too large to complete in a **single focused work session**. Signs that decomposition is needed:

- The task spans multiple components or files
- The task has multiple independent acceptance criteria
- Multiple agents could work on parts of it in parallel
- The task description reads like a project plan, not a unit of work

### 8.2 Decomposition Rules

1. **Each subtask should be independently completable.** If a subtask can't be finished without another subtask being done, it's a dependency, not a subtask.
2. **Each subtask should be independently verifiable.** QA should be able to test each subtask on its own.
3. **Don't over-decompose.** If a subtask takes less than 15 minutes, it probably doesn't need to be tracked separately. Merge it into the parent or a sibling.
4. **Don't under-decompose.** If a subtask spans multiple components, files, or concerns, it's still too large.
5. **Document the decomposition** in a parent task comment explaining the breakdown and dependencies.

### 8.3 Subtask Tree Health

- **Regularly view the tree** to stay oriented:
  ```bash
  tinytask subtask tree <parent-id> --recursive
  ```

- **The parent should not be marked `complete` until all subtasks are complete.**
- **Each subtask follows the full lifecycle** — it has its own status, queue, assignee, and comments.
- **When all subtasks are done, the parent needs to be handed off too.** Don't leave the parent in `working` status.
- **Archive completed subtasks** to keep the tree clean, but only after QA verification.

### 8.4 Nested Subtasks

- **Limit nesting depth to 2–3 levels.** Deeply nested trees are hard to navigate and understand.
- **If a subtask needs further decomposition**, it may be better to create a new parent task rather than nesting deeper.
- **When moving a subtask with children**, the entire subtree moves together.

---

## 9. Dependency Conventions

### 9.1 When to Use `blocked_by_task_id`

Use formal dependencies (`blocked_by_task_id`) only for **true hard dependencies** — where one task literally cannot start until another is complete.

| Situation | Use `blocked_by`? | Alternative |
|---|---|---|
| Task B requires Task A's output (e.g., schema before endpoint) | ✅ Yes | — |
| Task B is more efficient after Task A (e.g., shared module) | ❌ No | Use a comment and coordinate ordering |
| Task B is related to Task A (same feature area) | ❌ No | Use a link with `[related]` type |
| Task B is a duplicate of Task A | ❌ No | Use a link with `[duplicate]` type |

### 9.2 Dependency Rules

1. **Always add a comment explaining the dependency** — the `blocked_by_task_id` field shows *what* blocks the task, but not *why*.
2. **Notify the blocking task's assignee** by adding a comment to the blocking task so they know others are waiting.
3. **Move blocked tasks to the `blocked` queue** for visibility. Don't leave them in active queues.
4. **When a blocking task completes, manually move unblocked tasks back** to active queues. The system doesn't do this automatically.
5. **Avoid circular dependencies.** The system prevents direct cycles (A↔B) but indirect cycles (A→B→C→A) should be avoided through careful planning.
6. **Don't set dependencies on already-complete tasks.** If the blocking task is `complete`, `is_currently_blocked` will be `false` and the dependency is a no-op.

### 9.3 CLI Limitation

The `tinytask` CLI does not currently expose a `--blocked-by` flag. To set `blocked_by_task_id`:

- **Via MCP tool** (preferred for agents): `update_task({ id, blocked_by_task_id })`
- **Via REST API**: `PATCH /api/v1/tasks/<id>` with `{"blocked_by_task_id": "<blocking-id>"}`
- **CLI workaround**: Move to `blocked` queue and add a comment documenting the dependency

---

## 10. Linking Conventions

### 10.1 Link Types (Convention)

While the link model is URL-based with no formal `type` field, use the following **description prefix convention** to encode relationship types:

| Prefix | Meaning | Example |
|---|---|---|
| `[blocks]` | Task A blocks Task B | `[blocks] Task #105 depends on this task` |
| `[related]` | Tasks are related but not blocking | `[related] Both tasks touch the auth middleware` |
| `[duplicate]` | Tasks describe the same work | `[duplicate] Same issue as #195, consolidating here` |
| *(no prefix)* | General reference (PR, doc, external) | `Pull request: Login endpoint implementation` |

### 10.2 Linking Rules

1. **Always provide a meaningful description.** A bare URL with no description is unhelpful.
2. **Link both directions** when connecting two TinyTask tasks. Add a link on each task pointing to the other.
3. **Use links for reference relationships, not blocking.** For true blocking, use `blocked_by_task_id`.
4. **Update or remove stale links.** If a PR is superseded or a document is moved, update the link.
5. **Link PRs and external references** (issue trackers, design docs, CI runs) to provide verifiable context.

### 10.3 Common Link Targets

| Target | URL Format | Example |
|---|---|---|
| Pull request | Full GitHub/GitLab PR URL | `https://github.com/org/repo/pull/42` |
| External issue | Full tracker URL | `https://jira.example.com/browse/PROJ-123` |
| Documentation | Full doc URL | `https://docs.example.com/api-spec` |
| Another TinyTask task | `tasks/<task-id>` | `tasks/20260724_05` |
| CI/CD pipeline | Full pipeline URL | `https://ci.example.com/job/12345` |

---

## 11. Defect Reporting Standards

### 11.1 Bug Task Requirements

Every defect task **must** include:

| Element | Requirement |
|---|---|
| Title | Prefixed with `BUG:`, specific and descriptive |
| Description | Steps to reproduce, expected behavior, actual behavior, environment |
| Priority | Based on user impact, not developer convenience |
| Tags | Must include `bug` plus the affected component |
| Assignee | The developer responsible for the affected code |
| Queue | `ready-for-development` |

### 11.2 Bug Description Template

```
When a user <action>, the system <behavior>.

Steps to reproduce:
1. <step 1>
2. <step 2>
3. <step 3>

Expected: <what should happen>
Actual: <what actually happens>

Environment: <server/build/version>
Severity: <urgent|high|medium|low> — <why this severity>
```

### 11.3 Filing Rules

- **Reproduce before filing.** If you can't reproduce, note that in the description. Intermittent bugs still need filing but should be marked as intermittent.
- **One bug per task.** Don't combine multiple unrelated issues into a single task.
- **Link to related tasks.** If the bug is a regression or relates to a feature task, link them.
- **Set realistic priority.** A cosmetic issue is `low`. A production-blocking issue is `urgent`. Most bugs are `high`.
- **Include environment details.** Server URL, build version, or relevant config.

### 11.4 Regression Bugs

If the defect is a regression (something that previously worked is now broken):

- Reference the task or PR that introduced the change
- Link the introducing PR to the regression task
- Tag with `regression` in addition to `bug`

```bash
tinytask comment add <defect-id> "Regression: was working in build f1e0d2a. Broke after PR #42."
tinytask link add <defect-id> "https://github.com/org/repo/pull/42" -d "PR that introduced the regression"
```

---

## 12. Development Conventions

### 12.1 Pre-Task Checklist

Before starting development work on a task, verify:

- [ ] Read the full task description and acceptance criteria
- [ ] Reviewed all comments and task history
- [ ] Checked for dependencies or blocking tasks
- [ ] Identified the branch to work on
- [ ] Set task status to `working`
- [ ] Added a start comment

### 12.2 Pre-Handoff Checklist

Before handing off a task to QA or code review, verify:

- [ ] All acceptance criteria in the description are met
- [ ] Code is committed and pushed to a branch
- [ ] Local tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] No TypeScript compilation errors
- [ ] No unused imports, variables, or functions
- [ ] Completion comment written (what was done, how tested, QA focus areas)
- [ ] PR or branch linked to the task
- [ ] Status set back to `idle`
- [ ] Task moved to the correct handoff queue
- [ ] Task reassigned to the appropriate agent

### 12.3 Code Quality Standards

These conventions are drawn from the project's [AGENTS.md](../../AGENTS.md):

| Standard | Rule |
|---|---|
| **SOLID/DRY** | Follow SOLID principles; don't repeat yourself |
| **TypeScript** | Never use `any` in production code. Use `unknown` for dynamic types |
| **Type assertions** | Use specific assertions (`as string`, `as CreateTaskParams`) |
| **Zod schemas** | Use `z.ZodRawShape` instead of `any` |
| **Test mocks** | Use `Partial<T>` for partial mocks; cast with `as any as SpecificType` in tests |
| **Unused code** | Remove unused imports, variables, and functions |
| **Test coverage** | New features require corresponding tests |
| **Test integrity** | Never remove existing tests because they're failing — fix them |
| **Architectural boundaries** | Don't cross layer boundaries (transport → MCP → service → database) |
| **Autonomous decisions** | Halt and collaborate before making architectural or scope decisions |

### 12.4 Testing Requirements

- All tests use **Vitest** (not Jest or XUnit)
- New features require corresponding tests
- Test coverage should be maintained or improved
- **You break a test, you fix it** — never remove tests to make them pass
- Tests should cover the specific defect scenario for bug fixes
- Run the full test suite to check for regressions, not just the new test

### 12.5 Running the Application

- **Do NOT run the application from the command line.** The developer normally has it running.
- Running from CLI tends to cause hanging processes.
- When it's time to run and test, notify the developer to test manually.

---

## 13. Verification Standards (QA)

### 13.1 Verification Process

When verifying a task (feature or defect fix), the tester must:

1. **Read the developer's completion/fix summary comment** before testing.
2. **Re-run the original reproduction steps** (for defects) or test against acceptance criteria (for features).
3. **Run the full test suite** or at least the affected component's tests to check for regressions.
4. **Test edge cases** beyond the specific scenario — boundary conditions, empty inputs, concurrent access.
5. **Document results** in a closure or kickback comment.

### 13.2 Verification Rules

- **Never close a defect without reproducing.** "The developer said it's fixed" is not verification.
- **Never mark `complete` without a closure comment.** The closure comment is the historical record.
- **If verification fails, kick back properly.** Set to `idle`, move to `ready-for-development`, reassign to the developer, and add a detailed failure comment.
- **If verification passes, close and optionally archive.** Add a closure comment, mark `complete`, and archive if the task is no longer needed for active reference.

### 13.3 Kickback Etiquette

When kicking back a defect fix:

- **Be specific**: Include exact steps, expected vs. actual, and test output.
- **Don't fix it yourself**: The developer should fix it. Your job is to report what failed.
- **Extend test coverage context**: Note which test case exposed the issue.
- **Escalate after 3 cycles**: If a defect has been kicked back 3+ times, escalate per [E5: Conflict Resolution & Escalation](./05-Scenario-Group-E-Collaboration-and-Communication.md#e5-conflict-resolution--escalation).

---

## 14. Coordination Conventions

### 14.1 Coordination Hub Pattern

When multiple agents work on related tasks, designate a **hub task** (typically the parent task) and use its comment thread as the coordination channel.

**Hub comment format:**

```
COORDINATION PLAN:
- <agent>: #<task-id> (<description>)
- <agent>: #<task-id> (<description>)
- Dependency: #<task-id> depends on #<task-id>
- Shared file: <file path> — <agent> goes first

All agents: report progress here when starting, completing, and unblocking dependencies.
```

### 14.2 Coordination Rules

1. **Always designate a hub** for multi-agent work. Don't communicate in silos.
2. **Report start and completion** on the hub task so others know the status of their dependencies.
3. **Notify when dependencies clear** so dependent agents can start their work.
4. **Coordinate on shared files** — if two tasks modify the same file, sequence them explicitly.
5. **Post periodic progress updates** for long-running coordinated work.
6. **Don't work on another agent's task** without coordination via comments.

### 14.3 Conflict Resolution

When agents disagree on approach:

1. **Document the conflict** — state each agent's position and the tradeoffs.
2. **Propose a resolution** — offer a concrete path forward, not just flagging the problem.
3. **Seek consensus via comments** — allow all parties to respond.
4. **Escalate if consensus fails** — raise priority, create a decision task, link them together.
5. **Block the conflicted task** — move to `blocked` queue pending the decision.
6. **Document the decision** on both the original task and the decision task.
7. **Create follow-up tasks** for any deferred work.

---

## 15. Archival Conventions

### 15.1 When to Archive

| Situation | Archive? | Rationale |
|---|---|---|
| Task is `complete` and no longer needed for active reference | ✅ Yes | Keep active list clean |
| Task is `complete` but high-severity / may be referenced for audits | ❌ No (keep un-archived) | Historical reference value |
| Task was cancelled (not completed) | ✅ Yes | Clean up active list |
| Task is still `working` or `idle` | ❌ No | Active work should not be archived |
| Parent task with active subtasks | ❌ No | Resolve subtasks first |

### 15.2 Archival Rules

1. **Only archive tasks that are `complete` or explicitly cancelled.**
2. **Archive subtasks before the parent** — never archive a parent with active subtasks.
3. **Add a final comment** before archiving explaining why.
4. **Prefer `archive` over `delete`.** Archive is a soft-delete (recoverable). Delete is permanent.
5. **Archived tasks don't appear in default list views.** Use `--include-archived` to see them.

### 15.3 Batch Archival

When cleaning up multiple completed tasks (e.g., at end of sprint):

```bash
# Always verify the set first
tinytask task list --status complete --json | jq -r '.[].id'

# Then archive each
for task_id in $(tinytask task list --status complete --json | jq -r '.[].id'); do
  tinytask task archive "$task_id"
done
```

**Before batch operations**, export a backup:
```bash
tinytask task list --include-archived --json > backup.json
```

---

## 16. CLI Usage Conventions

### 16.1 Output Formats

| Format | When to Use | How to Set |
|---|---|---|
| `table` (default) | Interactive use, human reading | Default; no action needed |
| `json` | Scripting, piping to `jq`, programmatic use | `--json` flag |
| `csv` | Spreadsheet export, reporting | `tinytask config set outputFormat csv` or `TINYTASK_FORMAT=csv` |
| `compact` | Minimal output, quick scans | `tinytask config set outputFormat compact` or `TINYTASK_FORMAT=compact` |

> **Note:** `csv` and `compact` formats are set via config or environment variable — there are no dedicated `--csv` or `--compact` CLI flags. Use `--json` for one-off scripting.

### 16.2 Scripting Patterns

When using the CLI in scripts:

- **Use `--json` for parsing**:
  ```bash
  tinytask task list --json | jq -r '.[] | .id'
  ```

- **Use `--yes` to skip confirmations** in non-interactive scripts:
  ```bash
  tinytask link delete 5 --yes
  tinytask queue clear triage --yes
  ```

- **Always verify before destructive bulk operations**:
  ```bash
  # Review first
  tinytask queue tasks triage --json
  # Then act
  tinytask queue clear triage --yes
  ```

### 16.3 Profile Usage

Use profiles for different environments (staging, production, local):

```bash
tinytask config profile add staging --url http://staging:3000/mcp --agent tko-sword
tinytask --profile staging task list
```

---

## 17. Common Mistakes Reference

This section consolidates the most frequently cited mistakes from across all scenario documents.

### 17.1 Task Creation

| Mistake | Impact | Prevention |
|---|---|---|
| Vague title | Tasks can't be distinguished in queue views | Use action verb + specific subject |
| Missing description | Assignee lacks context | Include what, why, acceptance criteria |
| Wrong queue | Task lands in wrong agent's queue | Verify queue matches the responsible role |
| No initial comment | Context lost | Add a comment when context is non-obvious |
| Missing tags | Filtering and reporting breaks | Tag with component/concern at creation |

### 17.2 Task Lifecycle

| Mistake | Impact | Prevention |
|---|---|---|
| Developer marks `complete` | QA never verified | Only testers mark `complete` |
| `working` status during handoff | Ambiguous state | Set to `idle` before moving queues |
| No start comment | No audit trail of when work began | Always comment when starting |
| No completion comment | QA doesn't know what to test | Document what was done and how |
| Leaving blocked tasks in active queues | Queue clutter | Move to `blocked` queue |

### 17.3 Communication

| Mistake | Impact | Prevention |
|---|---|---|
| Vague comments | No actionable information | Be specific with IDs, files, line numbers |
| No coordination hub | Agents work in silos | Designate a hub task for multi-agent work |
| Silent status changes | Other agents are unaware | Always comment on status/queue changes |
| Not acknowledging responses | Communication loops stay open | Acknowledge when a question is answered |
| Not notifying dependents | Blocked agents don't know they're unblocked | Post to dependent tasks when blocking task completes |

### 17.4 Dependencies

| Mistake | Impact | Prevention |
|---|---|---|
| No comment on dependency | "What" is clear but "why" is unknown | Always explain the reasoning |
| Circular dependencies | Tasks can never proceed | Plan dependency graph carefully |
| Not resuming unblocked tasks | Unblocked tasks sit idle | Manually detect and move unblocked tasks |
| Using links instead of `blocked_by` | No `is_currently_blocked` tracking | Use `blocked_by_task_id` for true blocking |

### 17.5 Defect Management

| Mistake | Impact | Prevention |
|---|---|---|
| Filing without reproducing | May not be a real bug | Reproduce first; note if intermittent |
| Wrong handoff queue | `ready-for-qa` vs `ready-for-testing` confusion | Use `ready-for-testing` for defect fixes |
| Not reassigning to creator | Reporter doesn't see the fix | Reassign defect fixes to `created_by` |
| Kickback without details | Developer can't reproduce the failure | Include exact steps, expected vs. actual |
| Infinite kickback loop | Defect never resolves | Escalate after 3 cycles |

### 17.6 Code Quality

| Mistake | Impact | Prevention |
|---|---|---|
| Using `any` in production code | Lint warnings, type safety loss | Use `unknown` or specific types |
| Removing failing tests | Test coverage degrades | Fix the test, don't remove it |
| Not running lint | Issues accumulate | Run `npm run lint` during development |
| Running app from CLI | Hanging processes | Let the developer handle runtime testing |
| Making autonomous architecture decisions | Wrong direction without input | Halt, document, and seek approval |

---

## 18. Quick Reference: Convention Checklist

### At Task Creation

- [ ] Title starts with action verb, under 80 characters
- [ ] Description includes what, why, and acceptance criteria
- [ ] Priority set based on impact
- [ ] Tags include component/concern (lowercase, hyphenated)
- [ ] Assigned to the correct agent
- [ ] Placed in the correct queue
- [ ] Initial comment added (if context is non-obvious)

### At Task Pickup

- [ ] Reviewed full task description
- [ ] Checked comments and history
- [ ] Verified dependencies are resolved
- [ ] Set status to `working`
- [ ] Added start comment with branch reference

### At Task Handoff

- [ ] All acceptance criteria met
- [ ] Tests pass, lint passes, code formatted
- [ ] Completion comment written
- [ ] PR/branch linked
- [ ] Status set to `idle`
- [ ] Moved to correct handoff queue
- [ ] Reassigned to appropriate agent

### At Task Verification (QA)

- [ ] Read developer's completion/fix summary
- [ ] Re-ran original reproduction steps / tested acceptance criteria
- [ ] Checked for regressions
- [ ] Tested edge cases
- [ ] Closure or kickback comment written
- [ ] Status updated (`complete` or kicked back)

### At Task Archival

- [ ] Task is `complete` or cancelled
- [ ] All subtasks resolved
- [ ] Final comment added
- [ ] Archive command executed (not delete)

---

## Cross-References

| Topic | Reference |
|---|---|
| Core concepts, data model, roles, queues, lifecycle | [00-Foundation.md](./00-Foundation.md) |
| Task lifecycle scenarios (create, start, complete, archive) | [Scenario Group A](./01-Scenario-Group-A-Core-Task-Lifecycle.md) |
| Development workflows (subtask decomposition, parallel work, code review) | [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) |
| QA & bug workflows (filing, fixing, verifying, kickbacks) | [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) |
| Task dependencies, linking, reorganization, bulk operations | [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) |
| Comments, cross-queue handoffs, coordination, conflict resolution | [Scenario Group E](./05-Scenario-Group-E-Collaboration-and-Communication.md) |
| CLI command syntax and options | [CLI Command Reference](./06-CLI-Command-Reference.md) |
| Project-level development rules, TypeScript standards, testing | [AGENTS.md](../../AGENTS.md) |

---

*This document is part of the TinyTask Process Manual. See [00-Foundation.md](./00-Foundation.md) for core concepts and [other scenario documents](.) for specialized workflows.*