# Scenario Group D: Task Organization & Dependencies

> **Prerequisite:** Read [00-Foundation.md](./00-Foundation.md) for core concepts, data model, roles, and queue rules.
> **Scope:** Scenarios that cover task dependencies (blocking relationships), linking related tasks, reorganizing task hierarchies, and bulk task management operations.

---

## Scenarios Covered

| # | Scenario | Summary |
|---|---|---|
| D1 | Setting Up Task Dependencies | Establishing `blocked_by` relationships between tasks |
| D2 | Managing Blocked Tasks | Tracking, monitoring, and unblocking dependent tasks |
| D3 | Linking Tasks | Using links for related, duplicate, and reference relationships |
| D4 | Task Reorganization | Moving subtasks, restructuring hierarchies, reparenting |
| D5 | Bulk Task Management | Queue clearing, batch archival, and batch reorganization |

---

## D1: Setting Up Task Dependencies

### When to Use

A task cannot begin until another task is completed. You need to formally express this blocking relationship so that agents can see which tasks are waiting and which tasks are gating others. This is the primary mechanism for managing ordered work in TinyTask.

### Who Can Perform

Any agent can set a `blocked_by_task_id` on a task. Typically the task creator or the lead developer establishes dependencies during planning or decomposition.

### Prerequisites

- Both the blocking task and the blocked task exist in the system.
- You know the task IDs of both tasks.
- The blocking task is not yet `complete` (if it is already complete, there's no need to set a dependency).

> **CLI Note:** The `tinytask` CLI does not currently expose a `--blocked-by` flag on `task create` or `task update`. To set `blocked_by_task_id`, use the MCP tool or the REST API. See the approaches below.

### Step-by-Step Process

#### Step 1: Identify the Dependency

Determine which task blocks which. For example:
- Task #100 "Design database schema" must be completed before Task #105 "Build login API endpoint" can start.
- Task #100 is the **blocking task**.
- Task #105 is the **blocked task**.

#### Step 2: Set the Blocked-By Relationship

**Via MCP Tool (preferred for agents):**

The `update_task` MCP tool accepts a `blocked_by_task_id` parameter:

```
update_task({
  id: 105,
  blocked_by_task_id: 100
})
```

**Via REST API:**

```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/105 \
  -H "Content-Type: application/json" \
  -d '{"blocked_by_task_id": 100}'
```

#### Step 3: Add a Comment Explaining the Dependency

Always document why the dependency exists:

```bash
tinytask comment add 105 "Blocked by #100 (database schema design). Cannot implement the login endpoint until the users and sessions tables are defined. Will start once #100 is complete."
```

#### Step 4: Notify on the Blocking Task (Optional but Recommended)

Add a comment to the blocking task so the assignee knows others are waiting:

```bash
tinytask comment add 100 "Task #105 (login endpoint) is blocked by this task. Please notify when schema design is complete so #105 can start."
```

#### Step 5: Verify

```bash
tinytask task get 105
```

Confirm that `blocked_by_task_id` is set to `100` and `is_currently_blocked` is `true`.

### Variations

#### Setting a Dependency at Task Creation

When creating a task via MCP, include `blocked_by_task_id` in the creation call:

```
create_task({
  title: "Build login API endpoint",
  description: "POST /auth/login. Validate credentials, issue session token.",
  assigned_to: "tko-sword",
  priority: 7,
  tags: ["api", "auth"],
  blocked_by_task_id: 100
})
```

Via REST API:

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build login API endpoint",
    "description": "POST /auth/login. Validate credentials, issue session token.",
    "assigned_to": "tko-sword",
    "priority": 7,
    "tags": ["api", "auth"],
    "blocked_by_task_id": 100
  }'
```

#### Setting Dependencies Across Parent-Subtask Boundaries

A subtask can be blocked by a task outside its parent hierarchy. For example, a subtask under "Implement user authentication" might be blocked by a task under "Set up CI/CD pipeline":

```
update_task({
  id: 115,
  blocked_by_task_id: 200
})
```

```bash
tinytask comment add 115 "Blocked by #200 (CI/CD pipeline setup). The integration tests for this subtask require the test runner to be configured first."
```

#### Using Comments as a CLI Workaround

When only the CLI is available and you cannot set `blocked_by_task_id` directly, use comments and queue placement to communicate the dependency:

```bash
# Move the task to a 'blocked' queue
tinytask task update 105 --queue blocked
tinytask comment add 105 "BLOCKED by #100 (database schema). Moving to 'blocked' queue until #100 is complete. Manually track this dependency via comments."
```

This is a workaround — the formal `blocked_by_task_id` field should be set via MCP or REST API when possible for proper tracking and the `is_currently_blocked` indicator.

### Common Mistakes to Avoid

- **Not commenting on the dependency**: The `blocked_by_task_id` field shows *what* blocks the task, but not *why*. Always add a comment explaining the reasoning.
- **Setting circular dependencies**: The system prevents direct circular blocking (A blocked by B, B blocked by A), but indirect cycles (A→B→C→A) should be avoided through careful planning.
- **Self-blocking**: The system prevents a task from blocking itself, but be mindful when setting dependencies on closely related tasks.
- **Forgetting to notify the blocking task's assignee**: The assignee of the blocking task may not know others are waiting. Leave a comment on the blocking task.
- **Setting a dependency on an already-complete task**: If the blocking task is already `complete`, the `is_currently_blocked` flag will be `false` and the dependency is effectively a no-op. Only set dependencies on tasks that are still in progress or not yet started.

---

## D2: Managing Blocked Tasks

### When to Use

You need to monitor which tasks are blocked, identify tasks that have become unblocked, and resume work on tasks once their dependencies are resolved. This is the ongoing management of the dependency lifecycle.

### Who Can Perform

Any agent can monitor and manage blocked tasks. The lead developer or task coordinator is typically responsible for tracking the overall dependency graph.

### Prerequisites

- One or more tasks have `blocked_by_task_id` set (see [D1](#d1-setting-up-task-dependencies)).
- You have access to the CLI and/or MCP tools for querying task status.

### Step-by-Step Process

#### Step 1: Identify Blocked Tasks

List all tasks and look for the `Blocked By` column:

```bash
tinytask task list
```

Tasks with a value in the `Blocked By` column have a dependency set. The `is_currently_blocked` field (visible in JSON output) indicates whether the blocking task is still incomplete:

```bash
tinytask task list --json | jq '[.[] | select(.blocked_by_task_id != null)] | .[] | {id, title, blocked_by_task_id, is_currently_blocked}'
```

#### Step 2: Check the Status of Blocking Tasks

For each blocked task, verify the status of its blocking task:

```bash
# If task #105 is blocked by #100, check #100's status
tinytask task get 100 --json
```

If the blocking task's `status` is `complete`, the blocked task is no longer actively blocked (`is_currently_blocked` will be `false`).

#### Step 3: Move a Task to the Blocked Queue (Optional)

For visibility, move blocked tasks to a dedicated `blocked` queue so they don't clutter active work queues:

```bash
tinytask task update 105 --queue blocked
tinytask comment add 105 "Moved to 'blocked' queue. Waiting for #100 to complete."
```

#### Step 4: Detect When a Blocking Task Completes

When a blocking task is completed (verified by QA), the blocked task's `is_currently_blocked` flag automatically becomes `false`. To find tasks that have become unblocked:

```bash
# List tasks that have a blocked_by_task_id but are no longer actively blocked
tinytask task list --json | jq '[.[] | select(.blocked_by_task_id != null and .is_currently_blocked == false)] | .[] | {id, title, blocked_by_task_id}'
```

#### Step 5: Resume Work on Unblocked Tasks

Once a task is unblocked, move it back to an active queue and notify the assignee:

```bash
# Move back to the development queue
tinytask task update 105 --queue ready-for-development

# Notify the assignee
tinytask comment add 105 "Dependency #100 is now complete. This task is unblocked and ready to start."
```

The assignee then picks up the task following the standard process (see [A2: Task Pickup & Start](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a2-task-pickup--start)).

#### Step 6: Clear the Dependency (Optional)

Once the blocking task is complete and the dependency is resolved, you may optionally clear the `blocked_by_task_id` for cleanliness. This does not affect the `is_currently_blocked` flag (which is already `false`), but removes the historical reference:

**Via MCP Tool:**

```
update_task({
  id: 105,
  blocked_by_task_id: null
})
```

**Via REST API:**

```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/105 \
  -H "Content-Type: application/json" \
  -d '{"blocked_by_task_id": null}'
```

> **CLI Note:** The CLI does not currently support clearing `blocked_by_task_id`. Use the MCP tool or REST API.

Alternatively, leave the `blocked_by_task_id` set — it serves as a historical record of the dependency. The `is_currently_blocked` flag will remain `false` since the blocking task is complete.

### Variations

#### Monitoring a Chain of Dependencies

When tasks form a dependency chain (A blocks B, B blocks C), monitor the entire chain:

```bash
# Check the full chain
tinytask task get 100 --json  # Blocking task — is it complete?
tinytask task get 105 --json  # Blocked by 100 — is it unblocked yet?
tinytask task get 110 --json  # Blocked by 105 — still waiting
```

As each task in the chain completes, the next becomes unblocked. Add comments to track the cascade:

```bash
tinytask comment add 105 "Dependency #100 is complete. Starting work now. Once this is done, #110 will be unblocked."
```

#### Using the Blocked Queue for Visibility

Create and use a `blocked` queue to separate blocked tasks from active work:

```bash
# View all tasks in the blocked queue
tinytask queue tasks blocked

# Check queue statistics
tinytask queue stats blocked
```

This makes it easy to see at a glance how many tasks are waiting on dependencies.

#### Handling a Cancelled Blocking Task

If a blocking task is cancelled or archived without being completed, the blocked task's `is_currently_blocked` flag will become `false` (since the blocking task is no longer in an active state). However, you should manually review and decide whether the blocked task should proceed or be re-evaluated:

```bash
tinytask comment add 105 "Blocking task #100 was cancelled (not completed). Re-evaluating whether this task can proceed without the schema design. Decision: proceeding with an alternative schema approach."
tinytask task update 105 --queue ready-for-development
```

### Common Mistakes to Avoid

- **Leaving blocked tasks in active queues**: Blocked tasks in `ready-for-development` create noise. Move them to a `blocked` queue for clarity.
- **Not checking `is_currently_blocked`**: A task with `blocked_by_task_id` set may not actually be blocked if the blocking task is complete. Always check the `is_currently_blocked` flag.
- **Forgetting to resume unblocked tasks**: When a blocking task completes, the blocked task doesn't automatically move back to an active queue. Someone must manually detect the unblock and move the task.
- **Not documenting the unblock**: When resuming a previously blocked task, add a comment noting that the dependency is resolved. Future readers need to understand the timeline.
- **Over-relying on dependencies for sequencing**: Not every ordered task needs a formal `blocked_by` relationship. Reserve it for true hard dependencies where one task literally cannot start without the other being complete.

---

## D3: Linking Tasks

### When to Use

You need to associate a task with related tasks, external resources, or reference materials. Links are the mechanism for attaching URLs — whether they point to other tasks, pull requests, documentation, external issue trackers, or any other web-accessible resource — to a task.

### Who Can Perform

Any agent can add, update, or delete links on a task.

### Prerequisites

- The `tinytask` CLI is installed and configured.
- You know the task ID you want to link to.
- You have a URL to attach (this can be a task reference, a PR URL, documentation, etc.).

### Step-by-Step Process

#### Step 1: Determine the Link Target

Links are URL-based references. Common link targets include:
- **Pull requests**: `https://github.com/org/repo/pull/42`
- **External issue trackers**: `https://jira.example.com/browse/PROJ-123`
- **Documentation**: `https://docs.example.com/api-spec`
- **Other TinyTask tasks**: Use a descriptive URL format such as `tasks/105` or a full URL to the task in a web UI

Decide on the URL and a meaningful description that conveys the relationship.

#### Step 2: Add the Link

```bash
tinytask link add 105 "https://github.com/org/tinytask/pull/42" -d "Pull request: Login endpoint implementation"
```

For linking to another TinyTask task, use a task reference URL:

```bash
tinytask link add 105 "tasks/100" -d "Related: Schema design task (dependency)"
```

#### Step 3: Add a Comment Explaining the Link (Optional but Recommended)

When linking tasks together, add a comment to provide context:

```bash
tinytask comment add 105 "Linked to #100 (schema design). This task depends on the schema being defined first. See the linked task for details."
```

#### Step 4: Verify

```bash
tinytask link list 105
```

Confirm the link appears with the correct URL and description.

### Variations

#### Linking for Cross-Task Relationships

The Foundation document describes three relationship types for links: `blocks`, `related`, and `duplicate`. While the link model is URL-based (no formal `type` field), you can encode the relationship type in the description:

```bash
# "blocks" relationship
tinytask link add 100 "tasks/105" -d "[blocks] Task #105 depends on this task"

# "related" relationship
tinytask link add 105 "tasks/110" -d "[related] Both tasks touch the auth middleware"

# "duplicate" relationship
tinytask link add 200 "tasks/195" -d "[duplicate] Same issue as #195, consolidating here"
```

Use the `[blocks]`, `[related]`, or `[duplicate]` prefix in the description to indicate the relationship type. This is a convention — the system does not enforce these types.

#### Linking to External Resources

Links are not limited to task-to-task references. Use them for any relevant URL:

```bash
# Link to documentation
tinytask link add 105 "https://docs.example.com/api/auth" -d "API spec for auth endpoints"

# Link to a design document
tinytask link add 105 "https://docs.google.com/document/d/abc123" -d "Design doc: Authentication architecture"

# Link to a CI/CD pipeline run
tinytask link add 105 "https://ci.example.com/job/12345" -d "CI pipeline run for this branch"
```

#### Updating a Link

If a URL changes or the description needs refinement:

```bash
tinytask link update 5 --url "https://github.com/org/tinytask/pull/55" -d "Updated PR: Login endpoint with fix"
```

Use `tinytask link list <task-id>` to find the link ID first.

#### Removing a Link

When a link is no longer relevant:

```bash
tinytask link delete 5
```

Or with confirmation skip:

```bash
tinytask link delete 5 --yes
```

#### Linking Duplicate Tasks

When two tasks describe the same work, link them as duplicates and consolidate:

```bash
# Link the duplicate to the primary
tinytask link add 200 "tasks/195" -d "[duplicate] Same issue as #195. Consolidating work in #195."

# Add comments to both tasks
tinytask comment add 200 "This is a duplicate of #195. All work will be tracked there. This task will be archived."
tinytask comment add 195 "Duplicate task #200 has been identified. Work continues here."

# Archive the duplicate
tinytask task archive 200
```

### Common Mistakes to Avoid

- **Vague link descriptions**: "See here" or just a URL with no description is unhelpful. Always describe what the link points to and why it's relevant.
- **Not encoding the relationship type**: When linking related tasks, use the `[blocks]`, `[related]`, or `[duplicate]` convention in the description so the relationship is clear.
- **Linking instead of using `blocked_by`**: Links are for *reference* relationships. For true blocking dependencies, use `blocked_by_task_id` (see [D1](#d1-setting-up-task-dependencies)). Links can supplement this with additional context.
- **Leaving stale links**: If a PR is superseded or a document is moved, update or remove the link. Stale links create confusion.
- **Not linking both directions**: When linking two related tasks, add links on both tasks pointing to each other. This ensures the relationship is discoverable from either task.

---

## D4: Task Reorganization

### When to Use

You need to restructure the task hierarchy — moving a subtask to a different parent, promoting a subtask to a top-level task, or reorganizing the subtask tree as the project evolves. This is common when initial decomposition turns out to be incorrect or when scope changes reveal a better structure.

### Who Can Perform

Any agent can reorganize tasks. The lead developer (parent task assignee) is typically responsible for restructuring within their area.

### Prerequisites

- The tasks to be reorganized exist in the system.
- You have reviewed the current hierarchy using `tinytask subtask tree`.
- You understand the implications of moving tasks (queue assignments, assignees, and dependencies are preserved, but the parent-child relationship changes).

### Step-by-Step Process

#### Step 1: Review the Current Hierarchy

Before making changes, get a complete picture of the current structure:

```bash
tinytask subtask tree 100 --recursive
```

This shows the parent, all subtasks, and nested sub-subtasks with their status and assignee.

#### Step 2: Identify What Needs to Move

Determine which subtask(s) need to be reparented. For example:
- Subtask #112 "Write integration tests for login" was under parent #100 "Implement user authentication" but should move under #105 "Build login API endpoint" since it's more specific to that endpoint.

#### Step 3: Move the Subtask to a New Parent

```bash
tinytask subtask move 112 105
```

This changes the `parent_task_id` of task #112 from #100 to #105. The task retains its status, assignee, queue, and all other fields.

#### Step 4: Add a Comment Explaining the Reorganization

```bash
tinytask comment add 112 "Reparented from #100 to #105. The integration tests are specific to the login endpoint and belong under that subtask for better organization."
```

#### Step 5: Notify on the Old and New Parents (Optional but Recommended)

```bash
tinytask comment add 100 "Subtask #112 (login integration tests) moved to #105 (login endpoint). Restructuring for better task organization."
tinytask comment add 105 "Subtask #112 (login integration tests) moved here from #100. Tests are now nested under the endpoint they cover."
```

#### Step 6: Verify the New Structure

```bash
tinytask subtask tree 100 --recursive
tinytask subtask tree 105 --recursive
```

Confirm that #112 now appears under #105 and no longer under #100.

### Variations

#### Promoting a Subtask to Top-Level

Sometimes a subtask outgrows its parent and should become an independent task:

```bash
# Make task #112 a top-level task (remove parent relationship)
tinytask subtask move 112
```

This sets `parent_task_id` to `null`, making #112 a standalone task.

```bash
tinytask comment add 112 "Promoted to top-level task. This work is significant enough to track independently rather than as a subtask."
```

You can also use the update command:

```bash
tinytask task update 112 --parent null
```

#### Demoting a Top-Level Task to a Subtask

Conversely, a top-level task may be better tracked as a subtask of an existing parent:

```bash
tinytask task update 115 --parent 100
```

Or using the subtask move command:

```bash
tinytask subtask move 115 100
```

```bash
tinytask comment add 115 "Demoted to subtask of #100. This work is part of the authentication feature and should be tracked under it."
```

#### Restructuring an Entire Subtask Tree

When a major reorganization is needed, plan the changes first, then execute them in order:

```bash
# Current tree:
# #100: Auth feature
#   ├── #105: Login endpoint
#   │   └── #112: Login tests
#   ├── #106: Registration endpoint
#   │   └── #113: Registration tests
#   └── #107: Session middleware

# Desired tree (group by component, not by feature):
# #100: Auth feature
#   ├── #120: API endpoints (new parent)
#   │   ├── #105: Login endpoint
#   │   │   └── #112: Login tests
#   │   └── #106: Registration endpoint
#   │       └── #113: Registration tests
#   └── #121: Middleware (new parent)
#       └── #107: Session middleware

# Step 1: Create the new intermediate parents
tinytask subtask create 100 "API endpoints" -d "Grouping for all auth API endpoint subtasks." --assigned-to tko-sword
tinytask subtask create 100 "Middleware" -d "Grouping for all auth middleware subtasks." --assigned-to tko-sword

# Step 2: Move existing subtasks under the new parents
tinytask subtask move 105 120
tinytask subtask move 112 105  # Already under 105, but verify
tinytask subtask move 106 120
tinytask subtask move 113 106  # Already under 106, but verify
tinytask subtask move 107 121

# Step 3: Document the restructure
tinytask comment add 100 "Restructured subtask tree: grouped endpoints under #120 and middleware under #121 for better component-based organization."
```

#### Moving a Subtask with Its Own Children

When a subtask has its own sub-subtasks, moving it moves the entire subtree. The children maintain their relationship to the moved task:

```bash
# #105 has child #112
# Moving #105 to a new parent also moves #112 with it
tinytask subtask move 105 120

# Verify the subtree moved together
tinytask subtask tree 120 --recursive
```

### Common Mistakes to Avoid

- **Moving without commenting**: Future readers need to understand why the hierarchy changed. Always document reorganizations.
- **Not notifying affected agents**: If a moved task is assigned to another agent, they may be confused by the change. Add a comment and coordinate.
- **Creating circular hierarchies**: The system prevents a task from being moved under its own descendant, but be careful when restructuring large trees. Always verify with `subtask tree` after changes.
- **Moving tasks that are in `working` status**: While technically possible, moving a task that someone is actively working on can cause confusion. Consider setting the task to `idle` first and notifying the assignee.
- **Forgetting to update queue assignments**: Moving a subtask to a new parent doesn't change its queue. If the new parent is in a different workflow stage, manually update the queue as needed.

---

## D5: Bulk Task Management

### When to Use

You need to perform operations on multiple tasks at once — clearing a queue, archiving a batch of completed tasks, reassigning multiple tasks, or performing bulk reorganization. This is essential for cleanup, sprint transitions, and maintaining an organized task system.

### Who Can Perform

Any agent can perform bulk operations. The lead developer or coordinator is typically responsible for queue management and batch cleanup.

### Prerequisites

- The `tinytask` CLI is installed and configured.
- You have identified the set of tasks to operate on (by queue, status, or explicit list).
- For destructive operations (queue clear, batch archive), you have verified the tasks are in the appropriate state.

### Step-by-Step Process

#### Step 1: Identify the Target Task Set

Before performing bulk operations, identify and verify the tasks you'll be operating on:

```bash
# List all tasks in a specific queue
tinytask queue tasks ready-for-qa

# List all completed tasks
tinytask task list --status complete

# List all tasks with a specific tag
tinytask task list --json | jq '[.[] | select(.tags | index("bug"))]'
```

#### Step 2: Review the Task Set

Verify that the tasks are in the expected state before performing bulk operations:

```bash
# Check queue statistics
tinytask queue stats ready-for-qa

# Review the full list
tinytask queue tasks ready-for-qa --json
```

#### Step 3: Perform the Bulk Operation

##### Batch Archival

Archive multiple completed tasks in a script:

```bash
# Get all completed task IDs
TASK_IDS=$(tinytask task list --status complete --json | jq -r '.[].id')

# Archive each one
for task_id in $TASK_IDS; do
  echo "Archiving task #$task_id..."
  tinytask task archive "$task_id"
done

echo "Batch archival complete."
```

##### Queue Clearing

Remove all tasks from a queue (this removes the queue assignment, not the tasks themselves):

```bash
# Clear all tasks from a queue
tinytask queue clear ready-for-qa --yes
```

> **Warning:** `queue clear` removes all tasks from the specified queue. The tasks themselves are not deleted or archived — they simply lose their queue assignment. Verify the queue contents before clearing.

##### Batch Reassignment

Reassign multiple tasks to a different agent:

```bash
# Reassign all tasks in a queue to a different agent
TASK_IDS=$(tinytask queue tasks ready-for-development --json | jq -r '.[].id')

for task_id in $TASK_IDS; do
  tinytask move "$task_id" tko-shield --comment "Bulk reassignment: shifting all dev queue tasks to tko-shield for sprint rebalancing."
done
```

##### Batch Queue Move

Move all tasks from one queue to another:

```bash
# Move all tasks from one queue to another
TASK_IDS=$(tinytask queue tasks triage --json | jq -r '.[].id')

for task_id in $TASK_IDS; do
  tinytask queue move "$task_id" ready-for-development
  tinytask comment add "$task_id" "Bulk moved from 'triage' to 'ready-for-development' during sprint planning."
done
```

##### Batch Status Update

Set multiple tasks to a specific status:

```bash
# Set all tasks in a queue back to idle (e.g., after a sprint reset)
TASK_IDS=$(tinytask queue tasks ready-for-development --json | jq -r '.[].id')

for task_id in $TASK_IDS; do
  tinytask task update "$task_id" --status idle
done

tinytask comment add 0 "Bulk status update: all tasks in ready-for-development set to idle for sprint reset." 2>/dev/null || \
  echo "Bulk update complete. All tasks set to idle."
```

#### Step 4: Verify the Results

```bash
# Verify the queue is cleared
tinytask queue tasks <queue-name>

# Verify tasks are archived
tinytask task list --include-archived --json | jq '[.[] | select(.archived_at != null)] | length'

# Verify queue statistics
tinytask queue stats <queue-name>
```

### Variations

#### Sprint Transition Cleanup

At the end of a sprint, archive all completed tasks and reset remaining tasks:

```bash
echo "=== Sprint Transition Cleanup ==="

# 1. Archive all completed tasks
COMPLETED=$(tinytask task list --status complete --json | jq -r '.[].id')
for task_id in $COMPLETED; do
  tinytask task archive "$task_id"
  echo "  Archived #$task_id"
done

# 2. Move remaining idle tasks back to the backlog
IDLE=$(tinytask task list --status idle --json | jq -r '.[].id')
for task_id in $IDLE; do
  tinytask task update "$task_id" --queue backlog
  echo "  Moved #$task_id to backlog"
done

# 3. Check for orphaned working tasks
WORKING=$(tinytask task list --status working --json | jq -r '.[].id')
if [ -n "$WORKING" ]; then
  echo "  WARNING: The following tasks are still in 'working' status:"
  echo "$WORKING" | while read task_id; do
    echo "    #$task_id"
  done
  echo "  Review these before completing the sprint transition."
fi

echo "=== Sprint transition complete ==="
```

#### Batch Archival with Parent-Child Awareness

When archiving a parent task and its subtasks, archive children first:

```bash
# Archive all subtasks of a parent, then the parent
archive_tree() {
  local parent_id=$1
  
  # Get all subtasks
  local children=$(tinytask subtask list "$parent_id" --json | jq -r '.[].id')
  
  for child_id in $children; do
    archive_tree "$child_id"  # Recurse for nested subtasks
  done
  
  # Archive the parent after all children are archived
  tinytask task archive "$parent_id"
  echo "Archived #$parent_id"
}

# Usage
archive_tree 100
```

#### Bulk Linking

Add the same link to multiple related tasks:

```bash
# Link all auth-related tasks to the design document
TASK_IDS=$(tinytask task list --json | jq -r '[.[] | select(.tags | index("auth"))] | .[].id')

for task_id in $TASK_IDS; do
  tinytask link add "$task_id" "https://docs.example.com/design/auth-architecture" -d "Auth architecture design document"
done

echo "Linked all auth tasks to the design document."
```

#### Clearing the Blocked Queue

When dependencies are resolved and blocked tasks need to be moved back:

```bash
# Move all tasks from the 'blocked' queue back to development
TASK_IDS=$(tinytask queue tasks blocked --json | jq -r '.[].id')

for task_id in $TASK_IDS; do
  tinytask queue move "$task_id" ready-for-development
  tinytask comment add "$task_id" "Bulk move: cleared from 'blocked' queue. Dependencies resolved."
done

echo "Cleared blocked queue — all tasks moved to ready-for-development."
```

### Common Mistakes to Avoid

- **Not verifying before bulk operations**: Always list and review the target task set before performing bulk operations. A wrong filter can affect the wrong tasks.
- **Not backing up state**: Before large bulk operations, export the current state for rollback if needed: `tinytask task list --include-archived --json > backup.json`.
- **Archiving non-complete tasks**: Only archive tasks that are `complete` or explicitly cancelled. Archiving active tasks removes them from default views and can cause work to be lost.
- **Queue clear without understanding**: `queue clear` removes queue assignments, not tasks. Don't use it expecting tasks to be deleted — use `task delete` or `task archive` for that.
- **No comments on bulk changes**: When performing bulk operations, add comments to affected tasks (or at least to a parent/coordination task) explaining what was done and why. Future readers need to understand the batch change.
- **Not handling parent-child relationships in batch archive**: When archiving a parent, ensure all subtasks are archived first or handled appropriately. Archiving a parent with active subtasks creates orphaned active tasks.

---

## Quick Reference: Task Organization Command Sequences

### Setting Up Dependencies (MCP / REST API)

```bash
# Via MCP tool (for agents):
#   update_task({ id: <blocked-id>, blocked_by_task_id: <blocking-id> })

# Via REST API:
curl -X PATCH http://localhost:3000/api/v1/tasks/<blocked-id> \
  -H "Content-Type: application/json" \
  -d '{"blocked_by_task_id": <blocking-id>}'

# Always add a comment explaining the dependency
tinytask comment add <blocked-id> "Blocked by #<blocking-id>. <reason>."

# Move to blocked queue for visibility
tinytask task update <blocked-id> --queue blocked
```

### Clearing Dependencies (MCP / REST API)

```bash
# Via MCP tool:
#   update_task({ id: <task-id>, blocked_by_task_id: null })

# Via REST API:
curl -X PATCH http://localhost:3000/api/v1/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -d '{"blocked_by_task_id": null}'

# Move back to active queue
tinytask task update <task-id> --queue ready-for-development
tinytask comment add <task-id> "Dependency resolved. Unblocked and ready to start."
```

### Linking Tasks

```bash
# Add a link
tinytask link add <task-id> "<url>" -d "<description>"

# List links
tinytask link list <task-id>

# Update a link
tinytask link update <link-id> --url "<new-url>" -d "<new-description>"

# Delete a link
tinytask link delete <link-id> --yes
```

### Reorganizing Tasks

```bash
# Move subtask to different parent
tinytask subtask move <subtask-id> <new-parent-id>

# Promote subtask to top-level
tinytask subtask move <subtask-id>
# or:
tinytask task update <task-id> --parent null

# Demote top-level task to subtask
tinytask task update <task-id> --parent <parent-id>

# View the tree
tinytask subtask tree <parent-id> --recursive
```

### Bulk Operations

```bash
# Clear a queue
tinytask queue clear <queue-name> --yes

# Batch archive completed tasks
for id in $(tinytask task list --status complete --json | jq -r '.[].id'); do
  tinytask task archive "$id"
done

# Batch reassign tasks
for id in $(tinytask queue tasks <queue> --json | jq -r '.[].id'); do
  tinytask move "$id" <agent> --comment "Bulk reassignment: <reason>"
done

# Batch move between queues
for id in $(tinytask queue tasks <from-queue> --json | jq -r '.[].id'); do
  tinytask queue move "$id" <to-queue>
done
```

---

## Cross-References

| Topic | Reference |
|---|---|
| Core task lifecycle (create, start, complete, archive) | [Scenario Group A](./01-Scenario-Group-A-Core-Task-Lifecycle.md) |
| Development workflows (subtask decomposition, parallel work) | [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) |
| QA & bug workflows (filing, fixing, verifying defects) | [Scenario Group C](./03-Scenario-Group-C-QA-and-Bug-Workflows.md) |
| Comments, cross-queue handoffs, coordination | [Scenario Group E](./05-Scenario-Group-E-Collaboration-and-Communication.md) |
| Core concepts: dependencies, links, subtasks | [00-Foundation.md](./00-Foundation.md) — Sections 2.2, 2.5, 7.5 |
| Queue management commands | See `tinytask queue --help` |
| Subtask commands | See `tinytask subtask --help` |
| Link commands | See `tinytask link --help` |

### Key Handoff Points

- **D1 → B1**: When decomposing a parent task (B1), set up `blocked_by` dependencies (D1) between subtasks that have a strict ordering.
- **D2 → A2**: When a blocked task becomes unblocked, the assignee picks it up following the standard task pickup process (A2).
- **D3 → C1**: When filing a bug (C1), link it to the related feature task or PR using the link workflow (D3).
- **D3 → C5**: When closing a defect (C5), use links to record regression relationships and reference the original fix PR.
- **D4 → B2**: After reorganizing a subtask tree (D4), use the subtask tree management workflow (B2) to continue working within the new structure.
- **D5 → A5**: Batch archival (D5) is the bulk equivalent of individual task archival (A5), following the same rules (only archive complete or cancelled tasks).
- **D5 → D4**: Bulk reorganization (D5) may involve reparenting multiple subtasks (D4) as part of a sprint transition or major restructuring.

---

*This document is part of the TinyTask Process Manual. See [00-Foundation.md](./00-Foundation.md) for core concepts and [other scenario documents](.) for specialized workflows.*
