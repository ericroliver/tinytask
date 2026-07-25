# Scenario Group E: Collaboration & Communication

> **Prerequisite:** Read [00-Foundation.md](./00-Foundation.md) for core concepts, data model, roles, and queue rules.
> **Scope:** Scenarios that cover inter-agent communication via comments, cross-queue handoffs between roles, multi-agent coordination on related work, progress broadcasting for awareness, and conflict resolution or escalation through the task system.

---

## Scenarios Covered

| # | Scenario | Summary |
|---|---|---|
| E1 | Comment-Based Communication | Using comments as the primary inter-agent communication channel |
| E2 | Cross-Queue Handoffs | Moving tasks between queues when responsibility shifts between roles |
| E3 | Multi-Agent Coordination | Synchronizing work across multiple agents on related tasks |
| E4 | Status Broadcasting & Awareness | Using task status, comments, and queue placement to broadcast progress |
| E5 | Conflict Resolution & Escalation | Resolving disagreements and escalating issues through the task system |

---

## E1: Comment-Based Communication

### When to Use

You need to communicate with another agent about a task — to ask a clarifying question, provide additional context, report a finding, or document a decision. Comments are the primary mechanism for inter-agent communication within the TinyTask task system. Unlike external chat or messaging, comments are attached to the task and persist as part of the task's history.

### Who Can Perform

Any agent can add comments to any task. Comments carry an `author` field identifying who wrote them.

### Prerequisites

- The `tinytask` CLI is installed and configured.
- You know the task ID you want to comment on.
- You have something meaningful to add — context, a question, a decision, or a status update.

### Step-by-Step Process

#### Step 1: Identify the Task and Your Message

Determine which task needs a comment and what you want to communicate. Common comment types:

- **Context**: Additional information for the assignee ("The API spec for this endpoint is in docs/api-spec.md, section 3.2")
- **Question**: A clarifying question for the creator or another agent ("Should this endpoint support pagination, or is the result set expected to be small?")
- **Decision**: Documenting a design or approach decision ("Decided to use a sliding window for rate limiting instead of fixed window — see discussion in #20260724_10")
- **Progress update**: A status report ("50% done. Schema migration is complete, working on the endpoint handler now.")
- **Handoff note**: Information for the next agent picking up the task ("Handing off. Current state: 80% done. See my earlier comment for remaining work.")

#### Step 2: Add the Comment

```bash
tinytask comment add 20260724_01 "Question for @tko-shield: The bug report mentions 'special characters' but doesn't specify which ones. Should I handle all ASCII printable characters (0x20-0x7E), or just the reserved URI characters (&, =, +, %, #)?"
```

The comment is timestamped and attributed to you.

#### Step 3: Reference Related Tasks (if applicable)

If your comment relates to another task, reference it by ID so future readers can follow the thread:

```bash
tinytask comment add 20260724_01 "This endpoint depends on the schema from #20260724_05. The users table must have the email column indexed before this endpoint can be performance-tested. See #20260724_05 for the schema design."
```

#### Step 4: Check for Responses

Other agents will see your comment when they review the task. To check for responses:

```bash
tinytask comment list 20260724_01
```

Review the full comment thread to see if your question was answered or if additional context was added.

#### Step 5: Acknowledge Responses (Optional but Recommended)

When another agent answers your question or provides context, acknowledge it:

```bash
tinytask comment add 20260724_01 "Thanks @tko-shield. I'll handle all reserved URI characters as you suggested. Updating the test coverage to include &, =, +, %, and #."
```

### Variations

#### Using Comments for Design Discussions

When a task requires a design decision, use comments to document the discussion and the final decision:

```bash
tinytask comment add 20260724_10 "Design question: Should the session token be stored in the database or be stateless (JWT)? 

Arguments for database sessions: revocable, no secret management needed.
Arguments for JWT: stateless, scales better, no DB lookup per request.

Leaning toward database sessions for v1 since we need revocation support for the security requirements. Will implement JWT in a future iteration if performance requires it."

# Later, after discussion:
tinytask comment add 20260724_10 "Decision: Database sessions for v1. @tko-sword please implement with the sessions table from #20260724_05. Add an index on session_token for fast lookups."
```

#### Commenting on Another Agent's Task

When you need to provide input on a task assigned to someone else (e.g., you discovered a related issue):

```bash
tinytask comment add 20260724_13 "Heads up @tko-shield: While testing the auth flow, I noticed the login endpoint doesn't set a rate-limit header (X-RateLimit-Remaining). The spec mentions this header in section 4.3. Might be worth adding to your test cases."
```

#### Updating a Comment

If you need to correct or refine a comment you've already made:

```bash
# Get the comment ID first
tinytask comment list 20260724_01

# Update it
tinytask comment update 15 "Corrected question: Should I handle all reserved URI characters per RFC 3986 (sub-delims: !, $, &, ', (, ), *, +, ,, ;, =, and also %, #)?"
```

#### Deleting a Comment

If a comment was made in error or is no longer relevant:

```bash
tinytask comment delete 15
# Or skip confirmation:
tinytask comment delete 15 --yes
```

Use sparingly — comments are part of the task's audit trail. Prefer updating over deleting when possible.

### Common Mistakes to Avoid

- **Vague comments**: "Looks good" or "Not working" provide no value. Always include specific details, references, or actionable information.
- **Using comments instead of task updates**: If the status, priority, or assignee needs to change, update the task fields — don't just comment about it. Comments supplement field updates; they don't replace them.
- **Not referencing related tasks**: If your comment relates to another task, include the task ID (e.g., "See #20260724_05"). Unlinked references are hard to trace.
- **Long, unstructured comments**: Break up long comments with clear sections or numbered lists. Wall-of-text comments are hard to parse.
- **Not acknowledging responses**: When another agent answers your question, acknowledge it so they know the communication loop is closed.
- **Deleting comments that have responses**: If a comment has been responded to, deleting it breaks the conversation thread. Update it instead, noting the correction.

---

## E2: Cross-Queue Handoffs

### When to Use

A task needs to move from one role's queue to another's because responsibility has shifted. This is the core handoff mechanism in TinyTask — it routes tasks to the right agent at the right stage of the workflow. Cross-queue handoffs are distinct from simple reassignment (see [A4](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a4-task-reassignment)) because they involve moving between role-specific queues, not just changing the assignee within the same role.

### Who Can Perform

Any agent can perform a cross-queue handoff. Typically:
- Developers hand off to QA (`ready-for-qa`) or testers (`ready-for-testing`).
- Testers hand off back to developers (`ready-for-development`) via kickback, or close out tasks.
- Coordinators or lead developers may move tasks between queues for triage or rebalancing.

### Prerequisites

- The task exists and is in a queue.
- You know which queue the task should move to (see [Foundation, Section 6](./00-Foundation.md#6-queue-transition-rules) for queue transition rules).
- You have a reason for the handoff (to document in a comment).
- The task's status is `idle` (never move a `working` task — set it to `idle` first).

### Step-by-Step Process

#### Step 1: Set the Task to Idle

Before moving a task between queues, ensure it is not in `working` status:

```bash
tinytask task update 20260724_01 --status idle
```

A task in `working` status being moved to another queue creates a confusing state — it implies someone is actively working on it in a queue where no one should be.

#### Step 2: Add a Handoff Comment

Document why the task is being handed off and what the receiving agent should know:

```bash
tinytask comment add 20260724_01 "Implementation complete. All acceptance criteria met. 12 unit tests passing. Ready for QA verification. See linked PR #42 for code review."
```

#### Step 3: Move the Task to the Destination Queue

```bash
tinytask queue move 20260724_01 ready-for-qa
```

Or use the update command:

```bash
tinytask task update 20260724_01 --queue ready-for-qa
```

#### Step 4: Reassign to the Appropriate Agent

Update the assignee to match the role responsible for the destination queue:

```bash
tinytask task update 20260724_01 --assigned-to tko-shield
```

Or use the move command to combine reassignment with a comment:

```bash
tinytask move 20260724_01 tko-shield --comment "Handing off to QA. Implementation is complete, all tests pass. Please verify against the acceptance criteria in the description."
```

#### Step 5: Verify the Handoff

```bash
tinytask task get 20260724_01
```

Confirm:
- `status` = `idle`
- `queue_name` = the destination queue
- `assigned_to` = the receiving agent

Also verify the receiving queue has the task:

```bash
tinytask queue tasks ready-for-qa
```

### Variations

#### Developer → QA Handoff (Standard Feature Completion)

When a developer finishes implementing a feature:

```bash
tinytask comment add 20260724_01 "Implementation complete. POST /tasks now supports limit/offset pagination. Default limit=50, max=200. Total count in X-Total-Count header. 8 unit tests passing. Ready for QA."
tinytask task update 20260724_01 --status idle
tinytask queue move 20260724_01 ready-for-qa
tinytask task update 20260724_01 --assigned-to tko-shield
```

See [A3: Task Completion & Handoff](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a3-task-completion--handoff) for the full workflow.

#### Developer → Tester Handoff (Defect Fix)

When a developer fixes a defect, the handoff goes to `ready-for-testing` (not `ready-for-qa`) and is reassigned to the task's original reporter:

```bash
tinytask comment add 20260724_30 "Fix complete. Root cause was missing URL decoding. See fix summary in previous comment. Please re-test with the original reproduction steps."
tinytask task update 20260724_30 --status idle
tinytask queue move 20260724_30 ready-for-testing
tinytask task update 20260724_30 --assigned-to tko-shield
```

See [C3: Defect Fix Handoff & Verification](./03-Scenario-Group-C-QA-and-Bug-Workflows.md#c3-defect-fix-handoff--verification) for the full workflow.

#### Tester → Developer Handoff (Kickback)

When a tester verifies a fix and it fails, the task is kicked back to the developer:

```bash
tinytask comment add 20260724_30 "Verification FAILED. The '+' character is fixed but '&' still causes a 500. See my detailed comment above. Please re-fix."
tinytask task update 20260724_30 --status idle
tinytask queue move 20260724_30 ready-for-development
tinytask task update 20260724_30 --assigned-to tko-sword
```

See [C4: Kickback & Re-fix Cycle](./03-Scenario-Group-C-QA-and-Bug-Workflows.md#c4-kickback--refine-cycle) for the full workflow.

#### Triage Handoff (Moving to a Custom Queue)

When a task needs to be triaged or evaluated before being routed to development:

```bash
tinytask comment add 20260724_40 "Moving to triage. Need to determine if this is a bug or a feature request. Will assign to the appropriate queue after evaluation."
tinytask task update 20260724_40 --status idle
tinytask queue move 20260724_40 triage
```

#### Handoff to a Blocked Queue

When a task is blocked by a dependency, move it to a `blocked` queue for visibility:

```bash
tinytask comment add 20260724_01 "Blocked by #20260724_05 (schema design). Moving to 'blocked' queue until the dependency is resolved."
tinytask task update 20260724_01 --status idle
tinytask queue move 20260724_01 blocked
```

See [D2: Managing Blocked Tasks](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md#d2-managing-blocked-tasks) for the full workflow.

### Common Mistakes to Avoid

- **Moving a `working` task**: Always set status to `idle` before moving between queues. A `working` task in a handoff queue is ambiguous — is someone still working on it, or was it left in the wrong state?
- **No handoff comment**: The receiving agent needs to know why the task arrived in their queue and what they should do with it. Always add a comment.
- **Wrong destination queue**: Use `ready-for-qa` for feature completions, `ready-for-testing` for defect fix verifications, and `ready-for-development` for kickbacks. Mixing these up causes confusion.
- **Not updating the assignee**: A task in `ready-for-qa` assigned to a developer is confusing. Always update the assignee to match the destination queue's role.
- **Forgetting to link PRs or external references**: If the handoff involves a code change, link the PR or branch so the receiving agent can review the code.
- **Handing off without verifying your own work**: Before handing off to QA, confirm your implementation actually meets the acceptance criteria. Don't use QA as a first-pass tester.

---

## E3: Multi-Agent Coordination

### When to Use

Multiple agents need to work on related tasks simultaneously, and their work has dependencies, shared components, or ordering constraints. Coordination ensures that agents don't duplicate work, conflict on shared files, or proceed in the wrong order. This scenario extends the parallel development pattern from [B3](./02-Scenario-Group-B-Development-Workflows.md#b3-parallel-development) to cover cross-role and cross-queue coordination.

### Who Can Perform

Any agent involved in coordinated work. The lead developer (typically the parent task's assignee or the coordinator) is responsible for establishing the coordination plan. All participating agents contribute via comments and status updates.

### Prerequisites

- Multiple related tasks exist (possibly under a common parent or linked together).
- At least two agents are assigned to different tasks in the set.
- There are dependencies, shared components, or ordering constraints between the tasks.

### Step-by-Step Process

#### Step 1: Establish a Coordination Hub

Identify a "hub" task — typically the parent task or the most central task — and use its comment thread as the coordination channel:

```bash
tinytask comment add 20260724_10 "COORDINATION PLAN:
- tko-sword: #20260724_11 (schema design), #20260724_17 (session middleware)
- tko-shield: #20260724_12 (password hashing utility)
- Dependency: #20260724_13 (login endpoint) depends on #20260724_11 and #20260724_12
- Dependency: #20260724_14 (registration endpoint) depends on #20260724_11 and #20260724_12
- Shared file: src/api/auth/shared.ts — tko-sword goes first, then tko-shield

All agents: please report progress here when starting, when completing, and when unblocking dependencies."
```

#### Step 2: Agents Report Start

Each agent posts a start comment on the hub task when they begin their assigned work:

```bash
# tko-sword starts
tinytask comment add 20260724_10 "Starting #20260724_11 (schema design). Estimated 2 hours. Will post when done."

# tko-shield starts
tinytask comment add 20260724_10 "Starting #20260724_12 (password hashing). Estimated 1 hour. Will post when done."
```

#### Step 3: Agents Report Completion and Unblock Dependents

When an agent completes a task that others are waiting on, they post to the hub:

```bash
# tko-shield completes password hashing
tinytask comment add 20260724_12 "Implementation complete. bcrypt utility ready at src/utils/password.ts. Exports hashPassword() and verifyPassword()."
tinytask task update 20260724_12 --status idle
tinytask queue move 20260724_12 ready-for-qa

# Notify the hub that the dependency is cleared
tinytask comment add 20260724_10 "DEPENDENCY CLEARED: #20260724_12 (password hashing) is done. #20260724_13 (login endpoint) can now start if #20260724_11 (schema) is also done."
```

#### Step 4: Agents Check Dependencies Before Starting

Before picking up a dependent task, an agent checks the hub for the status of its dependencies:

```bash
# tko-sword checks if both dependencies are clear for the login endpoint
tinytask comment list 20260724_10
# Reviews the hub to confirm #20260724_11 and #20260724_12 are both done

tinytask comment add 20260724_10 "Both dependencies clear (#20260724_11 and #20260724_12). Starting #20260724_13 (login endpoint) now."
tinytask task update 20260724_13 --status working
```

#### Step 5: Coordinate on Shared Components

When two tasks modify the same file or module, explicitly coordinate who goes first:

```bash
tinytask comment add 20260724_10 "SHARED FILE ALERT: src/api/auth/shared.ts is touched by both #20260724_13 (login) and #20260724_14 (registration). tko-sword will do #20260724_13 first, then tko-shield can start #20260724_14 after the shared module is established. Please don't modify shared.ts simultaneously."
```

After the first agent finishes the shared component:

```bash
tinytask comment add 20260724_10 "Shared module (src/api/auth/shared.ts) is now established by #20260724_13. tko-shield, you're clear to start #20260724_14. The token validation function is exported as validateToken() — please reuse it for registration."
```

#### Step 6: Report Progress Periodically

Post progress updates to the hub so all agents have visibility:

```bash
tinytask comment add 20260724_10 "Progress update: #20260724_13 (login endpoint) is 60% done. The endpoint handler and credential validation are working. Still need: session token generation, rate limiting, and integration tests. ETA: 2 more hours."
```

#### Step 7: Finalize and Hand Off

When all coordinated work is complete, the lead developer posts a summary and hands off the parent:

```bash
tinytask comment add 20260724_10 "ALL SUBTASKS COMPLETE.
- #20260724_11 (schema): done, handed to QA
- #20260724_12 (password hashing): done, handed to QA
- #20260724_13 (login endpoint): done, handed to QA
- #20260724_14 (registration endpoint): done, handed to QA
- #20260724_17 (session middleware): done, handed to QA

All subtasks verified locally. Full test suite: 48 tests passing. Ready for QA verification of the parent."
tinytask task update 20260724_10 --status idle
tinytask queue move 20260724_10 ready-for-qa
```

### Variations

#### Cross-Role Coordination (Developer + Tester)

When a developer and tester need to coordinate on a verification cycle:

```bash
# Developer notifies tester that a fix is ready on a specific branch
tinytask comment add 20260724_30 "Fix is on branch fix/auth-special-chars, commit d4e8a7f. Deployed to staging. @tko-shield, please verify against staging URL when ready. The fix covers +, &, =, %, and # characters."

# Tester acknowledges and coordinates
tinytask comment add 20260724_30 "Acknowledged. Starting verification on staging. Will report results within 30 minutes."
```

#### Coordination with External Dependencies

When coordinated work depends on an external system or non-task-tracked work:

```bash
tinytask comment add 20260724_10 "EXTERNAL DEPENDENCY: The CI/CD pipeline needs to be updated to run the new auth integration tests. This is tracked outside TinyTask (DevOps ticket #CI-145). @tko-sword — please coordinate with the DevOps team before marking the parent complete. The tests won't run in CI until CI-145 is done."
```

#### Coordinating a Bug Bash

When multiple testers are investigating different aspects of the same feature:

```bash
# Hub task for the bug bash
tinytask comment add 20260724_50 "BUG BASH: Authentication feature. 
- tko-shield: testing login endpoint edge cases
- ab-shield: testing registration endpoint edge cases
- enigma-shield: testing session management and token expiry

Please file individual defects as separate tasks and link them to this hub. Post a summary of findings here when done."
```

After the bug bash, each tester links their findings:

```bash
tinytask link add 20260724_50 "tasks/20260724_51" -d "[bug] Login returns 500 on special chars (tko-shield)"
tinytask link add 20260724_50 "tasks/20260724_52" -d "[bug] Registration allows duplicate emails (ab-shield)"
tinytask link add 20260724_50 "tasks/20260724_53" -d "[bug] Session token not expiring (enigma-shield)"
```

### Common Mistakes to Avoid

- **No coordination hub**: Without a central task for coordination, agents communicate in silos. Always designate a hub (parent task or central task) and use its comment thread.
- **Not reporting start/completion**: Other agents can't know if their dependencies are clear if you don't report. Always post when starting and when done.
- **Working on shared files simultaneously**: If two tasks modify the same file, sequence them. Don't rely on merge conflict resolution — coordinate upfront.
- **Assuming dependencies are clear**: Before starting a dependent task, explicitly check the hub comments. Don't assume a dependency is done just because time has passed.
- **No progress updates**: In long-running coordinated work, periodic progress updates help all agents stay aligned and catch delays early.
- **Not linking related tasks**: When filing bugs or subtasks discovered during coordination, link them to the hub task so the full picture is visible.

---

## E4: Status Broadcasting & Awareness

### When to Use

You need to make sure other agents are aware of a task's state — that it's started, paused, blocked, unblocked, or completed. Status broadcasting is about using the task system's built-in mechanisms (status field, queue placement, comments) to keep all interested agents informed without requiring direct one-to-one communication.

### Who Can Perform

Any agent. The agent currently working on or responsible for a task is expected to broadcast status changes.

### Prerequisites

- You are responsible for a task that other agents may be interested in (waiting on it, depending on it, or coordinating around it).
- You are about to change the task's status, queue, or have a significant progress update.

### Step-by-Step Process

#### Step 1: Identify Who Needs to Know

Before making a status change, think about who is affected:
- Is anyone waiting on this task (dependency)?
- Is this task part of a coordinated effort with a hub task?
- Was this task previously kicked back and forth?
- Are there linked tasks that reference this one?

```bash
# Check for tasks that depend on this one
tinytask task list --json | grep 20260724_01

# Check linked tasks
tinytask link list 20260724_01

# Check if this is a subtask — the parent task's assignee needs to know
tinytask task get 20260724_01 --json
```

#### Step 2: Update the Task Status

The status field is the primary broadcast mechanism. Set it accurately:

```bash
# Starting work
tinytask task update 20260724_01 --status working
tinytask comment add 20260724_01 "Started work on the pagination implementation."

# Pausing work
tinytask task update 20260724_01 --status idle
tinytask comment add 20260724_01 "Pausing to handle urgent production issue #20260724_20. Will resume after. Current state: 70% done, need to add tests and update docs."

# Completing and handing off
tinytask task update 20260724_01 --status idle
tinytask queue move 20260724_01 ready-for-qa
tinytask comment add 20260724_01 "Implementation complete. Ready for QA verification."
```

#### Step 3: Broadcast to the Hub Task (if applicable)

If the task is part of a coordinated effort, post the status change to the hub task:

```bash
tinytask comment add 20260724_10 "STATUS UPDATE: #20260724_13 (login endpoint) is now idle — pausing for urgent production issue. Will resume in ~2 hours. This does not block any other subtasks."
```

#### Step 4: Notify Dependent Tasks (if applicable)

If other tasks are blocked by this one, and the status change affects them (e.g., this task is now complete, unblocking dependents):

```bash
# Notify the dependent task that its blocker is resolved
tinytask comment add 20260724_15 "UNBLOCKED: Dependency #20260724_01 (pagination) is now complete and handed to QA. This task is no longer blocked. Ready to start."
```

#### Step 5: Use Queue Placement for Visibility

Moving a task to a specific queue is itself a broadcast — it signals what stage the task is in:

```bash
# Moving to blocked queue signals that this task is waiting
tinytask task update 20260724_01 --status idle
tinytask queue move 20260724_01 blocked
tinytask comment add 20260724_01 "Moved to 'blocked' queue. Waiting on #20260724_05 (schema design) to complete."

# Moving back to active development signals unblock
tinytask queue move 20260724_01 ready-for-development
tinytask comment add 20260724_01 "Unblocked. Schema is done. Moving back to development queue."
```

#### Step 6: Add Links for External References

If the status change involves an external resource (PR, deployment, CI run), link it so agents can verify:

```bash
tinytask link add 20260724_01 "https://github.com/org/tinytask/pull/42" -d "PR: Pagination implementation"
tinytask link add 20260724_01 "https://ci.example.com/job/12345" -d "CI pipeline run — all tests passing"
```

### Variations

#### Broadcasting a Block

When you discover your task is blocked and others may be waiting on your task (cascade blocking):

```bash
tinytask comment add 20260724_01 "BLOCKED: Can't proceed — the database migration in #20260724_05 hasn't been deployed to staging yet. I'm blocked until that happens. If anyone is waiting on my task, please be aware of this delay."
tinytask task update 20260724_01 --status idle
tinytask queue move 20260724_01 blocked

# If there's a hub, notify it too
tinytask comment add 20260724_10 "BLOCKED: #20260724_01 is blocked waiting on staging deployment of #20260724_05. This may cascade — if #20260724_15 depends on #20260724_01, it's also effectively blocked."
```

#### Broadcasting an Unblock

When a blocking task completes and dependent tasks can proceed:

```bash
# On the blocking task
tinytask comment add 20260724_05 "COMPLETE. Schema migration deployed to staging. All dependent tasks can now proceed."

# On each dependent task
tinytask comment add 20260724_01 "UNBLOCKED: #20260724_05 (schema) is complete and deployed. Resuming work."
tinytask task update 20260724_01 --status working
tinytask queue move 20260724_01 ready-for-development
```

#### Broadcasting Across Queues

When a task moves between role-specific queues, the queue change itself broadcasts the stage transition. Ensure comments explain the transition for agents who check the task later:

```bash
tinytask comment add 20260724_01 "Handoff: Development → QA. Implementation is complete, all unit tests pass. Moving to ready-for-qa queue. @tko-shield please verify."
```

### Common Mistakes to Avoid

- **Silent status changes**: Changing a task's status or queue without a comment leaves other agents guessing why. Always add a comment explaining the change.
- **Not notifying dependents**: If your task is blocked or delayed, and other tasks depend on it, those agents need to know. Post to both your task and the dependent task.
- **Stale status**: Leaving a task in `working` status when you're not actively working on it. Other agents may think progress is being made when it isn't.
- **Not using the blocked queue**: A blocked task in `ready-for-development` clutters the active queue. Move it to `blocked` for visibility.
- **Forgetting to broadcast unblocks**: When a blocking issue is resolved, don't just resume your own work — notify the dependent tasks so they can also proceed.
- **Not linking external references**: A comment saying "CI is green" is less useful than a link to the actual CI run. Link external references for verifiability.

---

## E5: Conflict Resolution & Escalation

### When to Use

Two or more agents disagree on the approach for a task, a fix introduces conflicts with another agent's work, or a task is stuck in a kickback cycle with no resolution in sight. The task system provides structured mechanisms for resolving conflicts and escalating issues when agents can't reach consensus through comments alone.

### Who Can Perform

Any agent can initiate conflict resolution or escalation. The agent who identifies the conflict or stalemate is responsible for documenting it and proposing a path forward.

### Prerequisites

- A conflict, disagreement, or stalemate exists on a task.
- Direct communication via comments has not resolved the issue.
- You have documented the positions of all involved agents.

### Step-by-Step Process

#### Step 1: Document the Conflict

Clearly state what the disagreement is about, the positions of each agent, and why it's blocking progress:

```bash
tinytask comment add 20260724_13 "CONFLICT:

@tko-sword proposes: Use a sliding window rate limiter (more accurate, slightly more complex).
@tko-shield proposes: Use a fixed window rate limiter (simpler, acceptable for v1).

Both approaches are valid. The disagreement is on complexity vs. accuracy tradeoff for the v1 implementation. Neither party has convinced the other via comments. This is blocking the login endpoint from being handed off to QA.

Suggesting escalation for a decision."
```

#### Step 2: Propose a Resolution Path

Offer a concrete path forward rather than just flagging the problem:

```bash
tinytask comment add 20260724_13 "PROPOSED RESOLUTION: Implement the fixed window approach for v1 (per @tko-shield's suggestion) to unblock the handoff. Create a follow-up task for the sliding window optimization with medium priority. This way we ship v1 faster and can refine later. @tko-shield — does this work for you?"
```

#### Step 3: Seek Consensus via Comments

Allow the other agent(s) to respond:

```bash
# tko-shield responds
tinytask comment add 20260724_13 "Agreed. Fixed window for v1, sliding window as follow-up. Let's proceed."
```

If consensus is reached, document the decision and proceed with implementation.

#### Step 4: Escalate if Consensus Fails

If the agents cannot reach consensus through comments, escalate by:

**Raising the priority** to signal urgency:

```bash
tinytask task update 20260724_13 --priority 9
tinytask comment add 20260724_13 "ESCALATION: Unable to reach consensus after 3 comment exchanges. Raising priority to 9. Requesting operator/lead decision on the rate limiter approach."
```

**Creating a separate decision task** to track the escalation:

```bash
tinytask task create "DECISION: Rate limiter approach for auth endpoints (sliding vs fixed window)" \
  -d "Conflict on #20260724_13. tko-sword proposes sliding window, tko-shield proposes fixed window. Need a decision to unblock the login endpoint handoff.

Context:
- Sliding window: more accurate, slightly more complex implementation
- Fixed window: simpler, acceptable for v1, potential for burst at boundaries

Related task: #20260724_13 (login endpoint implementation, blocked on this decision)" \
  --priority 9 \
  --tags "decision,auth,rate-limiting"
tinytask queue add 20260724_60 triage

# Link the decision task to the blocked task
tinytask link add 20260724_60 "tasks/20260724_13" -d "Blocked task awaiting decision"
tinytask link add 20260724_13 "tasks/20260724_60" -d "Decision task for rate limiter approach"
```

#### Step 5: Block the Conflicted Task (Optional)

If the conflict is blocking progress, move the task to a blocked state until the decision is made:

```bash
tinytask task update 20260724_13 --status idle
tinytask queue move 20260724_13 blocked
tinytask comment add 20260724_13 "Moved to 'blocked' queue pending decision in #20260724_60. Will resume once the rate limiter approach is decided."
```

#### Step 6: Implement the Decision

Once a decision is made (by the operator, lead, or consensus), document it and resume work:

```bash
# On the decision task
tinytask comment add 20260724_60 "DECISION: Fixed window for v1. Sliding window as follow-up task. Rationale: v1 needs to ship quickly, fixed window is good enough, and the rate limit accuracy is not critical for the initial launch."

# On the blocked task
tinytask comment add 20260724_13 "DECISION RECEIVED: Fixed window rate limiter for v1. Resuming implementation."
tinytask task update 20260724_13 --status working
tinytask queue move 20260724_13 ready-for-development
```

#### Step 7: Create Follow-Up Tasks (if applicable)

If the resolution involves deferring work, create a follow-up task:

```bash
tinytask task create "Implement sliding window rate limiter for auth endpoints" \
  -d "Follow-up from decision in #20260724_60. v1 uses fixed window; this task tracks the upgrade to sliding window for better accuracy." \
  --assigned-to tko-sword \
  --priority 4 \
  --tags "enhancement,auth,rate-limiting"
tinytask queue add 20260724_61 ready-for-development

tinytask link add 20260724_61 "tasks/20260724_13" -d "Follow-up to v1 rate limiter implementation"
```

### Variations

#### Resolving a Merge Conflict

When two agents' changes conflict at the code level:

```bash
# Agent 1 notices the conflict
tinytask comment add 20260724_14 "MERGE CONFLICT: My changes to src/api/auth/shared.ts conflict with #20260724_13's changes. Both modified the validateToken function. @tko-sword — your version is in feature/login-endpoint, mine is in feature/registration-endpoint. Can we coordinate? I can rebase onto your branch once it's merged."

# Agent 2 responds
tinytask comment add 20260724_14 "Acknowledged. I'll merge feature/login-endpoint first. Once it's in main, please rebase your branch. I'll review the shared.ts changes to make sure we don't lose anything."
```

#### Escalating a Kickback Cycle

When a defect has been kicked back multiple times (see [C4](./03-Scenario-Group-C-QA-and-Bug-Workflows.md#c4-kickback--refine-cycle)):

```bash
tinytask comment add 20260724_30 "ESCALATION: This defect has been kicked back 3 times. Root cause analysis suggests the password handling pipeline needs a comprehensive rewrite, not incremental fixes. 

Proposing:
1. Decompose this into subtasks for a proper input normalization layer (see [B1](./02-Scenario-Group-B-Development-Workflows.md#b1-subtask-decomposition))
2. Increase priority to urgent
3. Block the auth feature parent (#20260724_10) until this is properly resolved"

tinytask task update 20260724_30 --priority 9
tinytask comment add 20260724_10 "BLOCKED: #20260724_30 has been kicked back 3 times. Pausing feature work until the password handling issue is properly resolved. See #20260724_30 for details."
```

#### Resolving Duplicate Work

When two agents discover they're working on the same or overlapping tasks:

```bash
tinytask comment add 20260724_70 "DUPLICATE WORK DETECTED: This task and #20260724_71 both implement password reset functionality. I started #20260724_70 (focused on the API endpoint) before seeing #20260724_71 (focused on the email flow). 

Proposing: Consolidate into #20260724_70 (API endpoint). @tko-shield — can we close #20260724_71 and track the email flow as a subtask of #20260724_70?"

# Link as duplicates
tinytask link add 20260724_70 "tasks/20260724_71" -d "[duplicate] Overlapping work — consolidating here"
tinytask link add 20260724_71 "tasks/20260724_70" -d "[duplicate] Consolidated into this task"

# Close the duplicate
tinytask comment add 20260724_71 "Consolidated into #20260724_70. Closing as duplicate. The email flow will be tracked as a subtask of #20260724_70."
tinytask task update 20260724_71 --status complete
```

### Common Mistakes to Avoid

- **Conflict without documentation**: "We disagree" is not enough. Document each agent's position, the tradeoffs, and the impact of the conflict.
- **Escalating too early**: Try to reach consensus through comments first. Escalate only after genuine attempts at resolution fail.
- **Escalating too late**: If a conflict has been unresolved for multiple comment exchanges, escalate. Don't let stalemates drag on.
- **Not creating a decision task**: When escalating, create a separate decision task so the escalation is tracked and doesn't get lost in the original task's comment thread.
- **Not linking the conflict and decision tasks**: The blocked task and the decision task should be linked so future readers can trace the resolution.
- **Not creating follow-up tasks**: If the resolution defers work, create a follow-up task. Don't rely on a comment to remember the deferred work.
- **Resolving without documenting**: When a decision is made, document it on both the original task and the decision task. Future readers need to understand what was decided and why.

---

## Quick Reference: Collaboration & Communication Command Sequences

### Comment-Based Communication

```bash
# Add a comment
tinytask comment add <task-id> "<message>"

# List comments
tinytask comment list <task-id>

# Update a comment
tinytask comment update <comment-id> "<updated text>"

# Delete a comment
tinytask comment delete <comment-id> --yes
```

### Cross-Queue Handoff

```bash
# 1. Set to idle
tinytask task update <task-id> --status idle

# 2. Add handoff comment
tinytask comment add <task-id> "<handoff reason and context>"

# 3. Move to destination queue
tinytask queue move <task-id> <destination-queue>

# 4. Reassign to the appropriate agent
tinytask task update <task-id> --assigned-to <agent>

# Or combine steps 2 and 4:
tinytask move <task-id> <agent> --comment "<handoff reason>"
```

### Multi-Agent Coordination

```bash
# 1. Establish a coordination hub
tinytask comment add <hub-task-id> "COORDINATION PLAN: <agents, tasks, dependencies, shared files>"

# 2. Agents report start
tinytask comment add <hub-task-id> "Starting #<task-id>. <details>"

# 3. Agents report completion and unblock dependents
tinytask comment add <hub-task-id> "DEPENDENCY CLEARED: #<task-id> is done. #<dependent-id> can start."

# 4. Check dependencies before starting
tinytask comment list <hub-task-id>
tinytask comment add <hub-task-id> "Starting #<task-id>. Both dependencies clear."

# 5. Final summary and handoff
tinytask comment add <hub-task-id> "ALL SUBTASKS COMPLETE. <summary>. Ready for QA."
tinytask task update <hub-task-id> --status idle
tinytask queue move <hub-task-id> ready-for-qa
```

### Status Broadcasting

```bash
# Broadcast start
tinytask task update <task-id> --status working
tinytask comment add <task-id> "Started work. <details>"
tinytask comment add <hub-task-id> "STATUS: #<task-id> started."

# Broadcast block
tinytask task update <task-id> --status idle
tinytask queue move <task-id> blocked
tinytask comment add <task-id> "BLOCKED: <reason>. Waiting on #<blocking-id>."

# Broadcast unblock
tinytask comment add <dependent-id> "UNBLOCKED: #<blocking-id> is done. Ready to start."
tinytask task update <dependent-id> --status working
tinytask queue move <dependent-id> ready-for-development

# Broadcast completion
tinytask task update <task-id> --status idle
tinytask queue move <task-id> ready-for-qa
tinytask comment add <task-id> "Complete. Ready for QA."
tinytask comment add <hub-task-id> "STATUS: #<task-id> complete and handed to QA."
```

### Conflict Resolution & Escalation

```bash
# 1. Document the conflict
tinytask comment add <task-id> "CONFLICT: <positions of each agent, tradeoffs>"

# 2. Propose resolution
tinytask comment add <task-id> "PROPOSED RESOLUTION: <path forward>"

# 3. If consensus fails, escalate
tinytask task update <task-id> --priority 9
tinytask comment add <task-id> "ESCALATION: Unable to reach consensus. Requesting decision."

# 4. Create a decision task
tinytask task create "DECISION: <topic>" -d "<context, positions, related task>" --priority 9 --tags "decision"
tinytask link add <decision-id> "tasks/<task-id>" -d "Blocked task awaiting decision"

# 5. Block the conflicted task
tinytask task update <task-id> --status idle
tinytask queue move <task-id> blocked

# 6. After decision, resume
tinytask comment add <task-id> "DECISION RECEIVED: <decision>. Resuming."
tinytask task update <task-id> --status working
tinytask queue move <task-id> ready-for-development

# 7. Create follow-up task for deferred work
tinytask task create "Follow-up: <deferred work>" -d "<context>" --assigned-to <agent> --priority <n>
tinytask link add <followup-id> "tasks/<original-id>" -d "Follow-up to <original>"
```

---

## Cross-References

| Topic | Reference |
|---|---|
| Core task lifecycle (create, start, complete, archive) | [Scenario Group A](./01-Scenario-Group-A-Core-Task-Lifecycle.md) |
| Development workflows (subtask decomposition, parallel work, code review) | [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) |
| QA & bug workflows (filing, fixing, verifying defects) | [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) |
| Task dependencies, blocked tasks, linking, bulk operations | [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) |
| Core concepts: comments, queues, roles | [00-Foundation.md](./00-Foundation.md) — Sections 2.3, 2.4, 3 |
| Queue transition rules | [00-Foundation.md](./00-Foundation.md) — Section 6 |
| Comment commands | See `tinytask comment --help` |
| Queue management commands | See `tinytask queue --help` |
| Link commands | See `tinytask link --help` |

### Key Handoff Points

- **E1 → A4**: When a comment reveals that a task needs to be reassigned, follow the standard reassignment workflow (A4).
- **E2 → A3**: Cross-queue handoffs for feature completion are the same as the standard completion & handoff (A3), with the queue and assignee explicitly updated.
- **E2 → C3**: Cross-queue handoffs for defect fixes follow the defect fix handoff workflow (C3), using `ready-for-testing` and reassigning to the creator.
- **E3 → B3**: Multi-agent coordination extends parallel development (B3) to cross-role and cross-queue scenarios.
- **E3 → B1**: When coordination reveals that a task is too large, decompose it into subtasks (B1).
- **E4 → D2**: Status broadcasting for blocked/unblocked tasks follows the dependency management workflow (D2).
- **E5 → C4**: Escalating a kickback cycle uses the conflict resolution process (E5) to break out of the re-fix loop in C4.
- **E5 → B1**: When a conflict resolution involves decomposing a stuck task, use subtask decomposition (B1).

---

*This document is part of the TinyTask Process Manual. See [00-Foundation.md](./00-Foundation.md) for core concepts and [other scenario documents](.) for specialized workflows.*
