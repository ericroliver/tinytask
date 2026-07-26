# Scenario Group B: Development Workflows

> **Prerequisite:** Read [00-Foundation.md](./00-Foundation.md) for core concepts, data model, roles, and queue rules.
> **Scope:** Scenarios that cover how developers work with tasks during active development — decomposition, subtask management, parallel work, context switching, and code review preparation.

---

## Scenarios Covered

| # | Scenario | Summary |
|---|---|---|
| B1 | Subtask Decomposition | Breaking a large task into manageable subtasks |
| B2 | Working with Subtask Trees | Managing nested hierarchies during development |
| B3 | Parallel Development | Multiple agents working on different subtasks concurrently |
| B4 | Context Switching & Task Interruption | Pausing and resuming work without losing context |
| B5 | Development Handoff & Code Review Prep | Preparing work for review before QA |

---

## B1: Subtask Decomposition

### When to Use

You've been assigned a task that is too large or complex to complete in a single work session. Breaking it into subtasks allows you to track progress, parallelize work, and hand off components to other agents.

### Who Can Perform

The developer assigned to the parent task. The developer decides the decomposition and creates subtasks, assigning them to themselves or other agents as appropriate.

### Prerequisites

- The parent task exists and is assigned to you (or you are the lead developer for the effort).
- The parent task is in `working` status (you've already started per [A2](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a2-task-pickup--start)).
- You have reviewed the task description, acceptance criteria, and any linked resources.

### Step-by-Step Process

#### Step 1: Analyze the Parent Task

Before creating subtasks, read the full task description and identify natural work boundaries:

```bash
tinytask task get 20260724_10 --json
tinytask comment list 20260724_10
```

Ask yourself:
- What are the independent components or phases?
- Which subtasks can be worked in parallel?
- Which subtasks have dependencies on others?
- What is the smallest unit of work that can be independently verified?

#### Step 2: Plan the Decomposition

Sketch the subtask tree mentally or in a comment. A typical decomposition might look like:

```
Task #20260724_10: Implement user authentication
├── Subtask 1: Design database schema
├── Subtask 2: Implement password hashing utility
├── Subtask 3: Build login API endpoint
│   └── Sub-subtask: Write integration tests
├── Subtask 4: Build registration API endpoint
│   └── Sub-subtask: Write integration tests
└── Subtask 5: Add session management middleware
```

#### Step 3: Create Subtasks

Create each subtask under the parent:

```bash
tinytask subtask create 20260724_10 "Design database schema" \
  -d "Create users and sessions tables. Include indexes for email and session_token." \
  --assigned-to tko-sword \
  --priority 8 \
  --tags "database,schema"
```

```bash
tinytask subtask create 20260724_10 "Implement password hashing utility" \
  -d "Create bcrypt-based hashing module. Support configurable rounds (default 12)." \
  --assigned-to tko-sword \
  --priority 7 \
  --tags "security,utils"
```

```bash
tinytask subtask create 20260724_10 "Build login API endpoint" \
  -d "POST /auth/login. Validate credentials, issue session token. Return 401 on failure." \
  --assigned-to tko-sword \
  --priority 7 \
  --tags "api,auth"
```

#### Step 4: Create Nested Subtasks (Optional)

For subtasks that themselves need further breakdown, nest sub-subtasks:

```bash
# First, get the subtask ID from the previous creation (e.g., 20260724_12)
tinytask subtask create 20260724_12 "Write integration tests for login endpoint" \
  -d "Cover: valid login, invalid password, missing user, rate limiting." \
  --assigned-to tko-sword \
  --tags "testing,integration"
```

#### Step 5: Document the Decomposition

Add a comment to the parent task explaining the breakdown:

```bash
tinytask comment add 20260724_10 "Decomposed into subtasks: schema design, password hashing, login endpoint, registration endpoint, session middleware. Schema and hashing are prerequisites for the API endpoints. Tests will be nested under each endpoint subtask."
```

#### Step 6: Assign Subtasks to Queues

Place each subtask in the appropriate queue:

```bash
tinytask queue add 20260724_11 ready-for-development
tinytask queue add 20260724_12 ready-for-development
tinytask queue add 20260724_13 ready-for-development
```

Or assign them directly to different agents for parallel work:

```bash
tinytask task update 20260724_12 --assigned-to tko-shield
tinytask queue add 20260724_12 ready-for-development
```

#### Step 7: Verify the Tree

Confirm the structure is correct:

```bash
tinytask subtask tree 20260724_10 --recursive
```

Expected output:

```
Task #20260724_10: Implement user authentication [ready-for-development] (tko-sword)
├── Task #20260724_11: Design database schema (tko-sword)
├── Task #20260724_12: Implement password hashing utility (tko-sword)
├── Task #20260724_13: Build login API endpoint (tko-sword)
│   └── Task #20260724_15: Write integration tests for login endpoint (tko-sword)
├── Task #20260724_14: Build registration API endpoint (tko-sword)
│   └── Task #20260724_16: Write integration tests for registration endpoint (tko-sword)
└── Task #20260724_17: Add session management middleware (tko-sword)
```

### Variations

#### Decomposing for a Single Developer

If you're working alone, the decomposition is still valuable for progress tracking. Keep all subtasks assigned to yourself and work through them sequentially:

```bash
tinytask subtask create 20260724_10 "Step 1: Set up project structure" --assigned-to tko-sword
tinytask subtask create 20260724_10 "Step 2: Implement core logic" --assigned-to tko-sword
tinytask subtask create 20260724_10 "Step 3: Add error handling" --assigned-to tko-sword
```

#### Decomposing with External Dependencies

If some subtasks depend on work tracked in separate tasks, document the dependency in a comment:

```bash
tinytask comment add 20260724_13 "Depends on #20260724_12 (password hashing) and #20260724_11 (schema). Do not start until both are complete."
```

See [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) for formal dependency tracking.

### Common Mistakes to Avoid

- **Over-decomposing**: Don't create subtasks for trivial work. If a subtask takes less than 15 minutes, it probably doesn't need to be tracked separately.
- **Under-decomposing**: If a subtask spans multiple components, files, or concerns, it's probably still too large.
- **No dependency documentation**: If subtask B requires subtask A to be done first, say so in a comment. Don't rely on implied ordering.
- **Forgetting to add subtasks to queues**: Subtasks created without a queue assignment won't appear in queue views. Always assign to a queue.

---

## B2: Working with Subtask Trees

### When to Use

You are working within a subtask hierarchy and need to navigate, update, and manage the tree structure as development progresses. This includes tracking which subtasks are done, which are in progress, and which are blocked.

### Who Can Perform

Any developer working on tasks within the hierarchy. The lead developer (typically the parent task's assignee) is responsible for overall tree health.

### Prerequisites

- A parent task with at least one subtask exists (see [B1](#b1-subtask-decomposition)).
- You are assigned to at least one task within the tree.

### Step-by-Step Process

#### Step 1: View the Full Tree

Start by getting a complete picture of the hierarchy:

```bash
tinytask subtask tree 20260724_10 --recursive
```

This shows the parent, all subtasks, and nested sub-subtasks with their status and assignee.

#### Step 2: Identify Your Tasks Within the Tree

Filter the tree to see only tasks assigned to you:

```bash
tinytask task list --assigned-to tko-sword --parent 20260724_10
```

This lists your direct subtasks under the parent. For nested assignments, use `--recursive` or check specific branches.

#### Step 3: Work Through Subtasks in Dependency Order

Start with subtasks that have no dependencies. Mark each as `working` when you begin:

```bash
# Start with the schema design (no dependencies)
tinytask task update 20260724_11 --status working
tinytask comment add 20260724_11 "Starting schema design."

# ... do the work ...

tinytask comment add 20260724_11 "Schema complete. Users and sessions tables created with appropriate indexes."
tinytask task update 20260724_11 --status idle
tinytask queue move 20260724_11 ready-for-qa
```

#### Step 4: Handle Dependencies Between Siblings

When a subtask depends on a sibling, wait for the sibling to be completed before starting:

```bash
# Check status of the dependency
tinytask task get 20260724_12

# If still in progress, work on an independent subtask instead
tinytask task update 20260724_17 --status working
tinytask comment add 20260724_17 "Starting session middleware (no dependencies on other subtasks)."
```

#### Step 5: Move Subtasks Between Parents

If you discover that a subtask belongs under a different parent (or should be top-level), restructure:

```bash
# Move subtask to a different parent
tinytask subtask move 20260724_15 20260724_14

# Or make it top-level
tinytask subtask move 20260724_15
```

#### Step 6: Track Overall Progress

Periodically review the tree to assess progress:

```bash
tinytask subtask tree 20260724_10 --recursive
```

The tree shows status indicators. You can also get a count of remaining work:

```bash
tinytask subtask list 20260724_10 --recursive --json | jq '[.[] | select(.status != "complete")] | length'
```

#### Step 7: Complete the Parent Task

Once all subtasks are complete (or handed off to QA), the parent task can be prepared for handoff:

```bash
# Verify all subtasks are done
tinytask subtask list 20260724_10 --recursive

# Add a summary comment
tinytask comment add 20260724_10 "All subtasks complete. Login, registration, and session middleware implemented. Ready for QA."

# Set parent to idle and handoff
tinytask task update 20260724_10 --status idle
tinytask queue move 20260724_10 ready-for-qa
```

### Variations

#### Archiving Completed Subtasks During Development

As subtasks are verified and completed, you can archive them to keep the tree clean:

```bash
tinytask task archive 20260724_11
```

Archived subtasks won't appear in the default tree view but can be included:

```bash
tinytask subtask tree 20260724_10 --recursive
# Archived subtasks are excluded by default

tinytask subtask list 20260724_10 --include-archived
```

#### Handling a Subtask That Grows in Scope

If a subtask turns out to be larger than expected, decompose it further:

```bash
tinytask subtask create 20260724_13 "Extract token validation into shared module" \
  -d "Login and registration both need token validation. Extracting to avoid duplication." \
  --assigned-to tko-sword
```

### Common Mistakes to Avoid

- **Working on dependent subtasks prematurely**: Always check sibling status before starting a subtask with dependencies.
- **Leaving completed subtasks in `working` status**: Subtasks that are done should be set to `idle` and moved to the QA queue, just like top-level tasks.
- **Losing track of the tree**: When working on a deeply nested subtask, periodically view the full tree to stay oriented.
- **Forgetting to update the parent**: When all subtasks are done, the parent needs to be handed off too. Don't leave it in `working` status.

---

## B3: Parallel Development

### When to Use

A parent task has been decomposed into independent subtasks, and multiple agents can work on different subtasks simultaneously to accelerate delivery.

### Who Can Perform

Multiple developers, each assigned to a different subtask under the same parent. The lead developer (parent task assignee) coordinates.

### Prerequisites

- A parent task with multiple independent subtasks (see [B1](#b1-subtask-decomposition)).
- At least two agents are available to work on subtasks.
- Subtasks have been assigned to the appropriate agents and queues.

### Step-by-Step Process

#### Step 1: Assign Subtasks to Different Agents

Distribute independent subtasks across available developers:

```bash
# Assign schema work to tko-sword
tinytask task update 20260724_11 --assigned-to tko-sword
tinytask queue add 20260724_11 ready-for-development

# Assign password hashing to tko-shield
tinytask task update 20260724_12 --assigned-to tko-shield
tinytask queue add 20260724_12 ready-for-development

# Assign session middleware to tko-sword (independent of schema)
tinytask task update 20260724_17 --assigned-to tko-sword
tinytask queue add 20260724_17 ready-for-development
```

#### Step 2: Coordinate via Comments on the Parent Task

Use the parent task's comment thread as a coordination channel:

```bash
tinytask comment add 20260724_10 "Parallel work starting. tko-sword on schema + session middleware. tko-shield on password hashing. API endpoints will start once schema and hashing are done."
```

#### Step 3: Each Agent Picks Up Their Subtask

Each developer follows the standard pickup process (see [A2](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a2-task-pickup--start)):

```bash
# tko-sword picks up schema work
tinytask task update 20260724_11 --status working
tinytask comment add 20260724_11 "Starting schema design."

# tko-shield picks up password hashing
tinytask task update 20260724_12 --status working
tinytask comment add 20260724_12 "Starting bcrypt utility implementation."
```

#### Step 4: Communicate Progress

As each developer completes their subtask, they add a completion comment and notify via the parent:

```bash
# tko-sword completes schema
tinytask comment add 20260724_11 "Schema complete. Migration file created and tested."
tinytask task update 20260724_11 --status idle
tinytask queue move 20260724_11 ready-for-qa

# Notify that dependency is resolved
tinytask comment add 20260724_10 "Schema subtask (#20260724_11) is done. API endpoint subtasks can now start."
```

#### Step 5: Pick Up Dependent Subtasks as Dependencies Clear

Once a dependency is resolved, the developer assigned to the dependent subtask can begin:

```bash
# Now that schema is done, start the login endpoint
tinytask task update 20260724_13 --status working
tinytask comment add 20260724_13 "Schema dependency resolved. Starting login endpoint implementation."
```

#### Step 6: Monitor the Tree for Conflicts

The lead developer should periodically check the tree to ensure no two agents are working on the same file or component:

```bash
tinytask subtask tree 20260724_10 --recursive
```

If conflicts arise, coordinate via comments to reassign or sequence the work.

### Variations

#### Parallel Development with a Shared Component

When two subtasks both need to modify a shared module, coordinate who goes first:

```bash
tinytask comment add 20260724_13 "tko-sword taking the first pass on the shared auth module. tko-shield, please wait until I'm done before starting #20260724_14 to avoid merge conflicts."
```

#### Splitting a Subtask Mid-Development

If a subtask is taking longer than expected, split it to enable parallel work:

```bash
# Original subtask is the full login flow
# Split: one agent does the endpoint, another does the validation logic
tinytask subtask create 20260724_13 "Extract input validation logic" \
  -d "Move email/password validation into a separate module for reuse by registration." \
  --assigned-to tko-shield
```

### Common Mistakes to Avoid

- **Assigning dependent subtasks in parallel**: If subtask B depends on subtask A, don't start B until A is done. Use comments to signal when dependencies clear.
- **No coordination comments**: When multiple agents work on related subtasks, the parent task comment thread is the coordination channel. Use it.
- **File-level conflicts**: If two subtasks modify the same file, sequence them. The lead developer should catch this during decomposition.
- **Forgetting to notify on dependency resolution**: When you complete a subtask that others are waiting on, add a comment to the parent task to unblock them.

---

## B4: Context Switching & Task Interruption

### When to Use

You need to pause work on your current task to handle a higher-priority item, then resume the original task later. This is common when an urgent bug or production issue arrives mid-development.

### Who Can Perform

Any developer who is currently working on a task and needs to temporarily switch to different work.

### Prerequisites

- You have a task in `working` status.
- A higher-priority task has arrived in your queue or been assigned to you.
- You want to preserve the context of your current work for later resumption.

### Step-by-Step Process

#### Step 1: Document Your Current Progress

Before pausing, capture exactly where you are so you can resume efficiently:

```bash
tinytask comment add 20260724_13 "Pausing work to handle urgent production issue (#20260724_20). Current state: login endpoint is 80% done. POST /auth/login accepts credentials and validates against the database. Still need to: (1) generate session token, (2) add rate limiting, (3) write error response for locked accounts. Branch: feature/login-endpoint. Last commit: a3f2b1c."
```

#### Step 2: Set the Task Back to Idle

Signal that you're no longer actively working on it:

```bash
tinytask task update 20260724_13 --status idle
```

#### Step 3: Pick Up the Urgent Task

Follow the standard pickup process for the new task:

```bash
tinytask task get 20260724_20 --json
tinytask task update 20260724_20 --status working
tinytask comment add 20260724_20 "Picking up urgent production issue. Paused #20260724_13 to handle this."
```

#### Step 4: Complete the Urgent Task

Work through the urgent task following the normal lifecycle (see [A2](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a2-task-pickup--start) through [A3](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a3-task-completion--handoff)):

```bash
# After fixing the issue
tinytask comment add 20260724_20 "Fixed the production issue. The session table was missing an index causing slow lookups. Added migration and verified locally."
tinytask task update 20260724_20 --status idle
tinytask queue move 20260724_20 ready-for-qa
```

#### Step 5: Resume the Paused Task

Return to the original task, review your context comment, and resume:

```bash
# Re-read your progress comment
tinytask comment list 20260724_13

# Set back to working
tinytask task update 20260724_13 --status working
tinytask comment add 20260724_13 "Resuming work. Picking up from session token generation. Production issue #20260724_20 is resolved."
```

#### Step 6: Verify No State Was Lost

Check that the codebase, branch, and any external state are still as you left them:

```bash
git status
git log --oneline -5
```

If someone else made changes to the same files while you were away, review and merge before continuing.

### Variations

#### Multiple Interruptions

If you're interrupted multiple times, each pause should get its own context comment. The comment history becomes a work log:

```bash
# First interruption
tinytask comment add 20260724_13 "Pausing for #20260724_20. Progress: 80% done, need token gen + rate limiting."

# After resuming and being interrupted again
tinytask comment add 20260724_13 "Pausing again for #20260724_21. Progress: 90% done, only rate limiting left."
```

#### Handing Off a Paused Task

If you won't be able to resume the task yourself, hand it off with full context:

```bash
tinytask comment add 20260724_13 "Handing off to tko-shield. Task is 80% done. See my earlier comment for details on remaining work. Branch: feature/login-endpoint."
tinytask task update 20260724_13 --assigned-to tko-shield
tinytask task update 20260724_13 --status idle
```

See [B5](#b5-development-handoff--code-review-prep) for the full handoff workflow.

#### Pausing a Subtask Within a Tree

When pausing a subtask, also update the parent task to note the impact on the overall effort:

```bash
tinytask comment add 20260724_10 "Subtask #20260724_13 (login endpoint) paused for urgent production issue. This may delay the overall authentication feature by a few hours."
```

### Common Mistakes to Avoid

- **Pausing without a context comment**: If you don't document where you were, resuming will be slow and error-prone. Always write what's done, what's left, and your branch/commit.
- **Leaving status as `working`**: A task in `working` status that you're not actively working on blocks others and creates confusion. Set to `idle` when pausing.
- **Not noting the branch/commit**: Without the branch name and last commit hash, you may not be able to find your work later.
- **Forgetting to update the parent**: When pausing a subtask, the parent task's timeline is affected. Notify the lead developer via a parent comment.

---

## B5: Development Handoff & Code Review Prep

### When to Use

You've completed implementation work and need to prepare it for review by another developer before it goes to QA. This is distinct from the QA handoff in [A3](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a3-task-completion--handoff) — this is a developer-to-developer review, not a QA verification.

### Who Can Perform

The developer who completed the implementation. The reviewing developer picks up the task from the review queue.

### Prerequisites

- The implementation is complete and locally tested.
- Code is committed and pushed to a branch (or PR is created).
- You have reviewed your own changes for obvious issues.

### Step-by-Step Process

#### Step 1: Self-Review Your Changes

Before requesting a review, check your own work:

```bash
# Review your changes
git diff main...feature/login-endpoint --stat
git log main..feature/login-endpoint --oneline
```

Look for:
- Leftover debug code or console statements
- Missing error handling
- Inconsistent naming
- Tests that cover the new functionality

#### Step 2: Write a Comprehensive Completion Comment

Document what was implemented, how it was tested, and what the reviewer should focus on:

```bash
tinytask comment add 20260724_13 "Implementation complete. POST /auth/login now:
1. Validates email/password against the users table
2. Generates a session token using the hashing utility from #20260724_12
3. Stores session in the sessions table
4. Returns token in JSON response
5. Returns 401 for invalid credentials, 429 for rate limiting

Tests: 8 integration tests covering valid login, invalid password, missing user, rate limit, locked account, expired session, malformed input, and concurrent logins. All passing.

Reviewer focus: Please check the rate limiting implementation (sliding window approach) and the session token generation security. Branch: feature/login-endpoint. PR: #42."
```

#### Step 3: Add the PR Link

```bash
tinytask link add 20260724_13 "https://github.com/org/tinytask/pull/42" -d "Pull request: Login endpoint implementation"
```

#### Step 4: Set Status to Idle

```bash
tinytask task update 20260724_13 --status idle
```

#### Step 5: Move to the Code Review Queue

```bash
tinytask queue move 20260724_13 ready-for-code-review
```

#### Step 6: Assign the Reviewer

Assign to a specific developer for review:

```bash
tinytask task update 20260724_13 --assigned-to tko-shield
```

Or use the move command with a comment:

```bash
tinytask move 20260724_13 tko-shield --comment "Ready for code review. Please check rate limiting and token security. See my completion comment for details."
```

#### Step 7: Notify the Reviewer (Optional but Recommended)

If the reviewer needs a heads-up, add a comment or coordinate via the parent task:

```bash
tinytask comment add 20260724_10 "Subtask #20260724_13 (login endpoint) is ready for code review by tko-shield. This is on the critical path — the registration endpoint depends on the same patterns."
```

#### Step 8: Reviewer Picks Up the Task

The reviewing developer follows the standard pickup process:

```bash
tinytask task get 20260724_13 --json
tinytask comment list 20260724_13
tinytask task update 20260724_13 --status working
tinytask comment add 20260724_13 "Starting code review."
```

After reviewing, the reviewer adds feedback:

```bash
# If changes are needed
tinytask comment add 20260724_13 "Review complete with feedback:
1. Rate limiting: consider using a fixed window instead of sliding for simplicity
2. Token generation: use crypto.randomBytes instead of Math.random
3. Add a test for expired token refresh

Please address these and re-submit."
tinytask task update 20260724_13 --assigned-to tko-sword
tinytask queue move 20260724_13 ready-for-development
tinytask task update 20260724_13 --status idle
```

```bash
# If approved
tinytask comment add 20260724_13 "Code review passed. Implementation looks solid. Approving for QA handoff."
tinytask task update 20260724_13 --status idle
tinytask queue move 20260724_13 ready-for-qa
tinytask task update 20260724_13 --assigned-to tko-shield
```

### Variations

#### Review of a Parent Task with Multiple Subtasks

When the entire parent task needs review before QA, aggregate the subtask reviews:

```bash
# Move all completed subtasks to review
tinytask queue move 20260724_11 ready-for-code-review
tinytask queue move 20260724_12 ready-for-code-review
tinytask queue move 20260724_13 ready-for-code-review
tinytask queue move 20260724_14 ready-for-code-review
tinytask queue move 20260724_17 ready-for-code-review

# Assign all to the same reviewer for consistency
for task_id in 20260724_11 20260724_12 20260724_13 20260724_14 20260724_17; do
  tinytask task update "$task_id" --assigned-to tko-shield
done

tinytask comment add 20260724_10 "All subtasks moved to ready-for-code-review for tko-shield. Please review in dependency order: schema → hashing → endpoints → middleware."
```

#### Expedited Review (No Code Review Queue)

For small fixes or trivial changes, you may skip the code review queue and go directly to QA:

```bash
tinytask comment add 20260724_13 "Trivial fix: corrected typo in error message. Skipping code review, going directly to QA."
tinytask task update 20260724_13 --status idle
tinytask queue move 20260724_13 ready-for-qa
```

Use this only for genuinely trivial changes. When in doubt, request a review.

### Common Mistakes to Avoid

- **No completion comment**: The reviewer needs to know what was implemented and what to focus on. A vague "done" comment wastes their time.
- **No PR link**: Without a link to the code, the reviewer has to hunt for it. Always link the PR or branch.
- **Requesting review before self-reviewing**: Don't offload basic checks to the reviewer. Review your own diff first.
- **Sending to QA instead of code review**: If your team uses a code review step, don't skip it unless the change is trivial. See the expedited review variation above.
- **Not addressing review feedback promptly**: When a reviewer returns a task with feedback, address it quickly. The task should not linger in the development queue with unresolved comments.

---

## Quick Reference: Development Workflow Command Sequence

### Subtask Decomposition & Parallel Development

```bash
# 1. Decompose parent task
tinytask subtask create <parent-id> "Subtask title" -d "Desc" --assigned-to <agent> --priority <n>
tinytask queue add <subtask-id> ready-for-development

# 2. Assign to different agents for parallel work
tinytask task update <subtask-id> --assigned-to <other-agent>

# 3. View the tree
tinytask subtask tree <parent-id> --recursive

# 4. Coordinate via parent comments
tinytask comment add <parent-id> "Parallel work: agent A on subtask X, agent B on subtask Y"

# 5. Notify when dependencies clear
tinytask comment add <parent-id> "Subtask X complete, subtask Y can now start"
```

### Context Switching

```bash
# 1. Document progress
tinytask comment add <task-id> "Pausing. Progress: 80% done, remaining: token gen, rate limiting. Branch: feature/x. Commit: a3f2b1c."

# 2. Set to idle
tinytask task update <task-id> --status idle

# 3. Pick up urgent task
tinytask task update <urgent-id> --status working
tinytask comment add <urgent-id> "Starting urgent work. Paused <task-id>."

# 4. After urgent task is done, resume
tinytask comment list <task-id>
tinytask task update <task-id> --status working
tinytask comment add <task-id> "Resuming. Picking up from token generation."
```

### Code Review Handoff

```bash
# 1. Self-review
git diff main...<branch> --stat

# 2. Write completion comment
tinytask comment add <task-id> "Implementation complete. <details>. Reviewer focus: <areas>. Branch: <branch>. PR: #<n>."

# 3. Link the PR
tinytask link add <task-id> "https://github.com/org/repo/pull/<n>" -d "PR description"

# 4. Move to review
tinytask task update <task-id> --status idle
tinytask queue move <task-id> ready-for-code-review
tinytask move <task-id> <reviewer> --comment "Ready for review. Focus on <areas>."

# 5. After review (approved)
tinytask queue move <task-id> ready-for-qa
tinytask task update <task-id> --assigned-to <qa-agent>

# 5. After review (changes requested)
tinytask queue move <task-id> ready-for-development
tinytask task update <task-id> --assigned-to <original-dev>
```

---

## Cross-References

| Topic | Reference |
|---|---|
| Core task lifecycle (create, start, complete, archive) | [Scenario Group A](./01-Scenario-Group-A-Core-Task-Lifecycle.md) |
| QA verification and bug fix workflows | [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) |
| Task dependencies, blocked tasks, and organization | [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) |
| Comments, cross-queue handoffs, coordination | [Scenario Group E](./05-Scenario-Group-E-Collaboration-and-Communication.md) |
| Subtask creation commands | See `tinytask subtask create --help` |
| Queue management commands | See `tinytask queue --help` |

### Key Handoff Points

- **B1 → A2**: After creating subtasks, each subtask follows the standard pickup process (A2).
- **B2 → A3**: Completed subtasks are handed off to QA the same way as top-level tasks (A3).
- **B3 → B4**: When parallel work is interrupted by an urgent task, use the context switching workflow (B4).
- **B3 → E3**: Parallel development across multiple agents requires multi-agent coordination (E3).
- **B4 → B5**: When resuming and completing a paused task, follow the code review prep workflow (B5).
- **B4 → E4**: Pausing and resuming work requires status broadcasting for awareness (E4).
- **B5 → A3**: After code review approval, the task moves to the QA handoff (A3).
- **B5 → E2**: Code review handoff is a cross-queue handoff between developer roles (E2).

---

*This document is part of the TinyTask Process Manual. See [00-Foundation.md](./00-Foundation.md) for core concepts and [other scenario documents](.) for specialized workflows.*
