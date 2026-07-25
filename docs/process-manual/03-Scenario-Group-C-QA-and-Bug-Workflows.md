# Scenario Group C: QA & Bug Workflows

> **Prerequisite:** Read [00-Foundation.md](./00-Foundation.md) for core concepts, data model, roles, and queue rules.
> **Scope:** Scenarios that cover the full bug lifecycle — from initial discovery and reporting through fix implementation, verification, kickbacks, and closure.

---

## Scenarios Covered

| # | Scenario | Summary |
|---|---|---|
| C1 | Bug Reporting | A tester discovers a defect and files a bug task for development |
| C2 | Defect Fix Pickup & Implementation | A developer picks up a defect task and implements the fix |
| C3 | Defect Fix Handoff & Verification | The developer completes the fix and hands back to the tester for verification |
| C4 | Kickback & Re-fix Cycle | Verification fails; the tester kicks the defect back to the developer |
| C5 | Defect Closure & Cleanup | The fix is verified, the bug is closed, and related tasks are cleaned up |

---

## C1: Bug Reporting

### When to Use

A tester (or any agent acting in the QA role) discovers a defect during testing, manual exploration, or automated test runs. The defect needs to be tracked as a task so it can be routed to a developer for fixing.

### Who Can Perform

The tester (`tko-shield`) or any agent acting in the QA role. The reporter is recorded in the `created_by` field.

### Prerequisites

- The `tinytask` CLI is installed and configured.
- You have reproduced the defect and can describe the steps.
- You know which component or endpoint is affected.

### Step-by-Step Process

#### Step 1: Reproduce and Document the Defect

Before filing, ensure you can reliably reproduce the issue. Document:

- **Steps to reproduce**: The exact sequence of actions or API calls.
- **Expected behavior**: What should happen per the spec or design.
- **Actual behavior**: What actually happens.
- **Environment**: Server URL, build version, or relevant config.
- **Severity**: How impactful is this? (`urgent`, `high`, `medium`, `low`)
- **Component**: Which part of the system is affected (for tagging).

#### Step 2: Create the Defect Task

Create a task with a clear, action-oriented title and a detailed description:

```bash
tinytask task create "BUG: POST /api/auth/login returns 500 on valid credentials when password contains special characters" \
  -d "When a user submits a login request with a password containing characters like '+' or '&', the server returns HTTP 500 instead of 200 with a valid session token.

Steps to reproduce:
1. POST /api/auth/login with body: {\"email\": \"test@example.com\", \"password\": \"p@ss+word&123\"}
2. Observe 500 Internal Server Error response

Expected: 200 OK with session token
Actual: 500 Internal Server Error with message 'Unexpected token in query'

Environment: staging server, build a3f2b1c
Severity: high — blocks users with special character passwords from logging in" \
  --assigned-to tko-sword \
  --priority 8 \
  --tags "bug,api,auth"
```

The CLI returns the created task with its auto-generated ID (e.g., `20260724_30`).

#### Step 3: Assign to the Development Queue

Move the defect to the queue monitored by developers:

```bash
tinytask queue add 20260724_30 ready-for-development
```

Or use the update command:

```bash
tinytask task update 20260724_30 --queue ready-for-development
```

#### Step 4: Link to Related Tasks (Optional but Recommended)

If the bug is related to a feature task, a previous fix, or a duplicate report, link them:

```bash
# Link to the original feature task
tinytask link add 20260724_30 "tasks/20260724_10" -d "Related feature: user authentication implementation"

# Link to a PR or external issue tracker
tinytask link add 20260724_30 "https://github.com/org/tinytask/issues/77" -d "External issue tracker entry"
```

#### Step 5: Add a Filing Comment

Provide context for the developer who will pick this up:

```bash
tinytask comment add 20260724_30 "Filed by QA during auth endpoint testing. Reproduced 3 times consistently. See description for exact steps. This is high priority — it blocks a subset of users from logging in. Assignee should check URL encoding in the login handler."
```

#### Step 6: Verify

```bash
tinytask task get 20260724_30
```

Confirm: `status` = `idle`, `assigned_to` = `tko-sword`, `queue_name` = `ready-for-development`, `tags` include `bug`.

### Variations

#### Filing a Bug Found During Automated Tests

If an automated test suite catches the defect, include the test name and output in the description:

```bash
tinytask task create "BUG: Integration test 'should handle concurrent logins' fails intermittently" \
  -d "Test: tests/integration/auth.test.ts > 'should handle concurrent logins'

Failure output:
  AssertionError: Expected status 200 but got 500
  at Object.<anonymous> (tests/integration/auth.test.ts:142:18)

This test passes in isolation but fails ~30% of the time under concurrent load. Likely a race condition in session token generation." \
  --assigned-to tko-sword \
  --priority 7 \
  --tags "bug,testing,race-condition"
```

#### Filing a Bug Against a Specific Developer's Work

If you know which developer implemented the affected code, assign directly to them:

```bash
tinytask task create "BUG: DELETE /api/organizations/{id} returns 500 instead of 204" \
  -d "DELETE /api/organizations/123 returns HTTP 500 with 'FOREIGN KEY constraint failed'. Expected 204 No Content per API spec." \
  --assigned-to tko-sword \
  --priority 9 \
  --tags "bug,api,organizations"
tinytask queue add 20260724_31 ready-for-development
```

#### Filing a Regression Bug

If the defect is a regression (something that previously worked is now broken), reference the task or PR that introduced the change:

```bash
tinytask comment add 20260724_30 "Regression: This was working in build f1e0d2a. Broke after PR #42 (login endpoint refactor). The refactored password validation no longer handles URL-encoded special characters."
tinytask link add 20260724_30 "https://github.com/org/tinytask/pull/42" -d "PR that introduced the regression"
```

### Common Mistakes to Avoid

- **Vague reproduction steps**: "It doesn't work" is not a bug report. Always include exact steps, expected vs. actual, and environment.
- **No severity assessment**: Without priority, the developer can't triage. Always set a realistic priority based on user impact.
- **Missing tags**: Always tag with `bug` and the affected component. This makes filtering and reporting easier.
- **Filing without reproducing**: If you can't reproduce it, note that in the description. Intermittent bugs are harder to fix but still need filing.
- **Not linking related tasks**: If the bug is a regression or relates to a feature task, link them. This provides critical context.

---

## C2: Defect Fix Pickup & Implementation

### When to Use

A developer picks up a defect task from their queue and implements the fix. This is the developer's side of the bug lifecycle.

### Who Can Perform

The developer assigned to the defect task (e.g., `tko-sword`).

### Prerequisites

- A defect task exists in your queue (`ready-for-development`) with status `idle`.
- You have reviewed the task description, reproduction steps, and comments.
- You can access the affected codebase and environment.

### Step-by-Step Process

#### Step 1: Check Your Queue for Defects

```bash
tinytask queue view --mine
```

Look for tasks tagged `bug` or with titles starting with `BUG:`. These are defects that need fixing.

#### Step 2: Review the Full Task

Read the task details, reproduction steps, and any comments or links:

```bash
tinytask task get 20260724_30 --json
tinytask comment list 20260724_30
tinytask link list 20260724_30
```

Pay special attention to:
- Exact reproduction steps
- Expected vs. actual behavior
- Environment details
- Linked PRs or related tasks
- Any additional context from comments

#### Step 3: Reproduce the Bug Locally

Before writing a fix, confirm you can reproduce the issue:

```bash
# Example: reproduce the login special character bug
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "p@ss+word&123"}'

# Observe the 500 error
```

If you cannot reproduce the bug, add a comment and ask the reporter for clarification:

```bash
tinytask comment add 20260724_30 "Unable to reproduce locally with the given steps. Using build a3f2b1c, same as reported. @tko-shield — can you confirm the environment and provide any additional context (headers, auth state, etc.)?"
```

Do not set the task to `working` until you can reproduce or have enough context to investigate.

#### Step 4: Set Status to Working

Once you've confirmed the issue and are ready to implement a fix:

```bash
tinytask task update 20260724_30 --status working
tinytask comment add 20260724_30 "Confirmed reproduction. The password validation handler doesn't URL-decode the input before checking. Starting fix on branch fix/login-special-chars."
```

#### Step 5: Implement the Fix

Write the code fix. Follow the same development practices as feature work (see [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) for development workflows).

#### Step 6: Write or Update Tests

Add a test that covers the specific defect scenario:

```bash
# Example: add a test case for special character passwords
tinytask comment add 20260724_30 "Added integration test: 'should handle passwords with special characters (+, &, =)'. Test fails before fix, passes after."
```

#### Step 7: Verify the Fix Locally

Run the reproduction steps again to confirm the fix works:

```bash
# Re-run the original reproduction
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "p@ss+word&123"}'

# Should now return 200 with a session token
```

Also run the full test suite to check for regressions:

```bash
npm test
```

### Variations

#### Fixing an Intermittent Bug

Intermittent bugs (e.g., race conditions) require more investigation. Document your findings:

```bash
tinytask comment add 20260724_30 "Root cause: session token generation uses a non-atomic read-modify-write sequence. Under concurrent load, two requests can read the same counter value and generate duplicate tokens. Fix: use an atomic increment (SQLite UPDATE ... RETURNING) for the counter."
```

#### Fixing a Bug That Requires Architectural Changes

If the fix requires significant changes, decompose it into subtasks (see [B1: Subtask Decomposition](./02-Scenario-Group-B-Development-Workflows.md#b1-subtask-decomposition)):

```bash
tinytask subtask create 20260724_30 "Refactor session token generation to use atomic increment" \
  -d "Replace the read-modify-write counter with an atomic SQLite UPDATE...RETURNING operation." \
  --assigned-to tko-sword
```

#### Bug That Turns Out Not to Be a Bug

If investigation reveals the reported behavior is actually correct (e.g., a misunderstanding of the spec):

```bash
tinytask comment add 20260724_30 "Investigated: this is expected behavior per the API spec (section 4.2). The endpoint correctly returns 422 for passwords exceeding 128 characters. Not a defect. Recommending closure."
tinytask task update 20260724_30 --status idle
tinytask queue move 20260724_30 ready-for-testing
tinytask task update 20260724_30 --assigned-to tko-shield
tinytask comment add 20260724_30 "Reassigning to @tko-shield for review. Please verify against the spec and close if confirmed not a bug."
```

### Common Mistakes to Avoid

- **Fixing without reproducing**: If you can't reproduce the bug, you can't verify your fix works. Always reproduce first.
- **No test for the fix**: Always add a test that would fail before the fix and pass after. This prevents regressions.
- **Not checking for regressions**: Run the full test suite, not just the new test. A fix in one area can break another.
- **Vague progress comments**: "Working on it" is not useful. Document what you've found, what you're changing, and why.
- **Starting work before setting `working`**: Other agents may pick up the same defect if it remains `idle`.

---

## C3: Defect Fix Handoff & Verification

### When to Use

The developer has completed the defect fix and needs to hand it back to the tester who filed the bug for verification. This is the critical handoff point in the QA & Bug workflow.

### Who Can Perform

The developer (`tko-sword`) who implemented the fix. The tester (`tko-shield`) who filed the bug performs the verification.

### Prerequisites

- The defect task is in `working` status and assigned to you (the developer).
- The fix is implemented, tested locally, and committed.
- You know the `created_by` value of the defect task (this is who will verify).

### Step-by-Step Process

#### Step 1: Verify Your Fix Is Complete

Before handing off, ensure:
- The original reproduction steps no longer produce the defect.
- New tests covering the defect scenario pass.
- The full test suite passes (no regressions).
- Code is committed and pushed to a branch.

#### Step 2: Write a Comprehensive Fix Summary

Document what was wrong, what was changed, and how it was tested:

```bash
tinytask comment add 20260724_30 "Fix complete. Root cause: the login handler was not URL-decoding the password field before validation, causing special characters (+, &, =) to trigger a parser error in the SQL query builder.

Changes:
1. Added URL decoding in the login request handler (src/api/auth/login.ts:42)
2. Added input sanitization to prevent SQL injection via decoded characters
3. Added integration test: 'should handle passwords with special characters' (tests/integration/auth.test.ts:155)

Testing:
- Reproduction steps from the bug report now return 200 OK with valid session token
- New test passes
- Full suite: 142 tests passing, 0 failures
- No regressions detected

Branch: fix/login-special-chars
Commit: d4e8a7f"
```

#### Step 3: Add the PR Link (if applicable)

```bash
tinytask link add 20260724_30 "https://github.com/org/tinytask/pull/55" -d "Fix PR: URL-decode password field in login handler"
```

#### Step 4: Set Status Back to Idle

Per the Foundation rules, developers never mark tasks `complete`. Set back to `idle`:

```bash
tinytask task update 20260724_30 --status idle
```

#### Step 5: Move to the Verification Queue

Defect fixes go to `ready-for-testing` (not `ready-for-qa`), because they need re-verification by the original reporter:

```bash
tinytask queue move 20260724_30 ready-for-testing
```

#### Step 6: Reassign to the Original Reporter

Per Foundation rules, defect fixes are reassigned to the task creator (e.g., `tko-shield`) for verification:

```bash
# Check who created the task if unsure
tinytask task get 20260724_30 --json

# Reassign to the creator
tinytask task update 20260724_30 --assigned-to tko-shield
```

Or use the move command with a comment:

```bash
tinytask move 20260724_30 tko-shield --comment "Defect fixed. Please re-test using the original reproduction steps and verify the fix. See my fix summary comment for details."
```

#### Step 7: Verify the Handoff

```bash
tinytask task get 20260724_30
```

Confirm: `status` = `idle`, `queue_name` = `ready-for-testing`, `assigned_to` = `tko-shield` (the creator/reporter).

#### Step 8: Tester Picks Up for Verification

The tester (`tko-shield`) follows the standard pickup process:

```bash
# Tester checks their queue
tinytask queue view tko-shield

# Tester reviews the fix
tinytask task get 20260724_30 --json
tinytask comment list 20260724_30

# Tester starts verification
tinytask task update 20260724_30 --status working
tinytask comment add 20260724_30 "Starting verification. Will re-run original reproduction steps against the fix branch."
```

#### Step 9: Tester Verifies the Fix

The tester reproduces the original steps against the fixed code:

```bash
# Tester re-runs the original reproduction
curl -X POST http://staging.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "p@ss+word&123"}'

# Confirms 200 OK with valid session token
```

#### Step 10: Tester Closes the Bug

If verification passes, the tester marks the defect as complete:

```bash
tinytask comment add 20260724_30 "Verified. Original reproduction steps now return 200 OK with valid session token. Special character passwords (+, &, =) are handled correctly. New integration test confirmed. Closing this defect."
tinytask task update 20260724_30 --status complete
```

### Variations

#### Handoff with a Known Limitation

If the fix addresses the primary issue but has a known limitation, document it:

```bash
tinytask comment add 20260724_30 "Fix complete with known limitation: passwords with Unicode characters above U+007F are not yet handled (tracked separately in #20260724_35). The fix covers the reported ASCII special characters (+, &, =, %). Please verify against the original steps."
```

#### Verification on a Specific Environment

If the bug only manifests in a specific environment (staging, production), note this:

```bash
tinytask comment add 20260724_30 "Fix deployed to staging (build d4e8a7f). Please verify against staging URL: https://staging.example.com. Use the same reproduction steps from the bug report."
tinytask link add 20260724_30 "https://staging.example.com/api/auth/login" -d "Staging endpoint for verification"
```

#### Multiple Defects Fixed in One Batch

If fixing multiple related defects, hand them all off together with a summary:

```bash
for task_id in 20260724_30 20260724_31 20260724_32; do
  tinytask task update "$task_id" --status idle
  tinytask queue move "$task_id" ready-for-testing
  tinytask task update "$task_id" --assigned-to tko-shield
done
tinytask comment add 20260724_30 "Batch fix: #20260724_30, #20260724_31, and #20260724_32 all fixed in the same PR (#55). Please verify all three against staging."
```

### Common Mistakes to Avoid

- **Moving to `ready-for-qa` instead of `ready-for-testing`**: Defect fixes go to `ready-for-testing` for re-verification by the reporter. `ready-for-qa` is for new feature handoffs. See [A3](./01-Scenario-Group-A-Core-Task-Lifecycle.md#a3-task-completion--handoff) for the distinction.
- **Not reassigning to the creator**: Per Foundation rules, defect fixes must be reassigned to the task creator for verification. Don't leave it assigned to yourself.
- **Leaving status as `working`**: Always set to `idle` before moving to the verification queue.
- **No fix summary comment**: The tester needs to know what changed, how to test, and what the root cause was. A one-line "fixed" comment is insufficient.
- **Tester verifying without reading the fix summary**: The developer's comment explains what to test and what limitations exist. Always read it first.
- **Tester marking `complete` without reproducing**: Always re-run the original reproduction steps. Don't just trust the developer's local testing.

---

## C4: Kickback & Re-fix Cycle

### When to Use

The tester has verified a defect fix and found that the issue is not fully resolved, or the fix introduced a new problem. The tester kicks the defect back to the developer for additional work.

### Who Can Perform

The tester (`tko-shield`) initiates the kickback. The developer (`tko-sword`) performs the re-fix.

### Prerequisites

- The defect task is in `ready-for-testing` queue, assigned to the tester, and in `working` status.
- The tester has attempted verification and confirmed the fix is insufficient.
- The tester has documented what failed during verification.

### Step-by-Step Process

#### Step 1: Document the Verification Failure

The tester adds a detailed comment explaining what didn't work:

```bash
tinytask comment add 20260724_30 "Verification FAILED. The fix addresses the '+' character, but the '&' character still causes a 500 error.

Re-tested:
1. POST /api/auth/login with password 'p@ss+word&123'
2. Still returns 500: 'Unexpected token &'

The '+' encoding issue is fixed, but '&' is not handled by the URL-decode logic. Please see the new test case output:

  AssertionError: Expected status 200 but got 500
  at tests/integration/auth.test.ts:155

Also noticed: passwords with '=' are also still failing. The fix appears to only handle the '+' character case."
```

#### Step 2: Tester Sets Status Back to Idle

```bash
tinytask task update 20260724_30 --status idle
```

#### Step 3: Tester Moves Back to Development Queue

```bash
tinytask queue move 20260724_30 ready-for-development
```

#### Step 4: Tester Reassigns to the Developer

Per Foundation rules, the tester reassigns the kicked-back task to the developer:

```bash
tinytask task update 20260724_30 --assigned-to tko-sword
```

Or use the move command with a comment:

```bash
tinytask move 20260724_30 tko-sword --comment "Kickback: fix is incomplete. '&' and '=' characters still cause 500 errors. See my verification comment for details. Please re-fix and re-submit."
```

#### Step 5: Verify the Kickback State

```bash
tinytask task get 20260724_30
```

Confirm: `status` = `idle`, `queue_name` = `ready-for-development`, `assigned_to` = `tko-sword`.

#### Step 6: Developer Picks Up the Kickback

The developer reviews the tester's feedback and resumes work:

```bash
# Review the verification failure comment
tinytask comment list 20260724_30

# Set back to working
tinytask task update 20260724_30 --status working
tinytask comment add 20260724_30 "Picking up kickback. The URL-decode only handled '+' because I used decodeURIComponent which converts '+' to space. Need to use a proper URL-decode that handles all reserved characters (&, =, %, +). Investigating a more robust fix."
```

#### Step 7: Developer Implements the Re-fix

Fix the remaining issues. Extend the test coverage to include all special characters:

```bash
tinytask comment add 20260724_30 "Re-fix complete. Switched from decodeURIComponent to a proper URL-decode utility that handles all reserved characters (&, =, %, +, #). Updated the integration test to cover all special characters mentioned in the bug report plus additional edge cases (%, #). All tests passing. Branch updated: fix/login-special-chars. Commit: f8c2e9d."
```

#### Step 8: Developer Hands Off Again

Follow the same handoff process as C3:

```bash
tinytask task update 20260724_30 --status idle
tinytask queue move 20260724_30 ready-for-testing
tinytask move 20260724_30 tko-shield --comment "Re-fix complete. All special characters (&, =, %, #, +) now handled correctly. Please re-verify."
```

#### Step 9: Tester Re-verifies

The tester picks up the re-fix and verifies again:

```bash
tinytask task update 20260724_30 --status working
tinytask comment add 20260724_30 "Re-verification started. Testing all special character cases."
```

If verification passes this time, proceed to closure (see [C5](#c5-defect-closure--cleanup)). If it fails again, repeat the kickback cycle.

### Variations

#### Kickback Due to a New Issue Introduced by the Fix

If the fix resolved the original bug but introduced a new problem:

```bash
tinytask comment add 20260724_30 "Verification PARTIAL PASS. The original bug is fixed — special character passwords now work. However, the fix introduced a new issue: passwords that are exactly 128 characters long now return 422 instead of 200. This appears to be an off-by-one error in the new validation logic.

Re-test steps:
1. POST /api/auth/login with a 128-character password → 422 (expected 200)
2. POST /api/auth/login with a 129-character password → 422 (correct)

Please fix the length check boundary."
```

Then proceed with the kickback as usual (Steps 2-5).

#### Kickback with a New Defect Task

If the fix introduced a separate, distinct issue, the tester may file a new defect and link it:

```bash
# File a new defect for the introduced issue
tinytask task create "BUG: Login rejects 128-character passwords (off-by-one in fix for #20260724_30)" \
  -d "Introduced by fix for #20260724_30. The new validation logic has an off-by-one error: passwords of exactly 128 characters are rejected with 422 instead of accepted with 200." \
  --assigned-to tko-sword \
  --priority 7 \
  --tags "bug,api,auth,regression"
tinytask queue add 20260724_36 ready-for-development

# Link the new defect to the original
tinytask link add 20260724_36 "tasks/20260724_30" -d "Regression from fix for this bug"

# Kick back the original if the tester considers it not fully fixed
tinytask comment add 20260724_30 "Verification FAILED. Original issue fixed but new off-by-one introduced. See linked #20260724_36. Kicking back for re-fix."
tinytask task update 20260724_30 --status idle
tinytask queue move 20260724_30 ready-for-development
tinytask move 20260724_30 tko-sword --comment "Kickback: fix introduced off-by-one. See #20260724_36."
```

#### Multiple Kickback Cycles

If a defect goes through multiple kickback cycles, each cycle should be clearly documented:

```bash
# First kickback
tinytask comment add 20260724_30 "Kickback #1: '&' and '=' not handled. See comment above."

# Second kickback (after re-fix attempt)
tinytask comment add 20260724_30 "Kickback #2: Fix for '&' and '=' works, but now introduces a regression on Unicode passwords (U+0080 to U+00FF). Reverting to use decodeURIComponent for those ranges."
```

If a defect goes through more than 2-3 kickback cycles, consider escalating:

```bash
tinytask comment add 20260724_30 "ESCALATION: This defect has been kicked back 3 times. The root cause appears to be deeper than URL encoding — the password handling pipeline needs a comprehensive review. Suggesting we decompose into: (1) a proper input normalization layer, (2) updated validation, (3) comprehensive test matrix. See [B1](./02-Scenario-Group-B-Development-Workflows.md#b1-subtask-decomposition) for decomposition approach."
tinytask task update 20260724_30 --priority 9
```

### Common Mistakes to Avoid

- **Kickback without details**: "Still broken" is not a useful kickback comment. Always include what you tested, what happened, and how it differs from expected.
- **Not reassigning to the developer**: After kicking back, the task must be reassigned to the developer. Don't leave it assigned to yourself in the development queue.
- **Not reading prior kickback comments**: When picking up a kickback, always read the full comment history. The tester's feedback is critical context.
- **Fixing only the reported symptom**: If the kickback reveals a pattern (e.g., multiple characters failing), fix the root cause, not just the specific characters mentioned.
- **Not updating tests on re-fix**: Each re-fix should extend test coverage to catch the case that was missed. Don't just fix the code — fix the test gap that allowed the bug through.
- **Infinite kickback loop**: If a defect keeps getting kicked back, escalate. Multiple failed fix attempts indicate a deeper architectural issue.

---

## C5: Defect Closure & Cleanup

### When to Use

The tester has verified that a defect fix is correct and complete. The bug needs to be formally closed, and any related tasks, links, or documentation need to be cleaned up.

### Who Can Perform

The tester (`tko-shield`) who performed the verification. The developer may assist with cleanup of related tasks.

### Prerequisites

- The defect task is in `working` status, assigned to the tester, in the `ready-for-testing` queue.
- The tester has successfully verified the fix against the original reproduction steps.
- All related subtasks or regression tasks are resolved.

### Step-by-Step Process

#### Step 1: Confirm Verification Is Complete

Ensure you have:
- Re-run the original reproduction steps and confirmed the defect is fixed.
- Checked for regressions (run the full test suite or at least the affected component's tests).
- Reviewed the developer's fix summary and confirmed all points are addressed.

#### Step 2: Write a Closure Comment

Document the final verification results:

```bash
tinytask comment add 20260724_30 "VERIFIED AND CLOSED.

Verification results:
- Original reproduction steps: PASS (200 OK with valid session token for passwords with +, &, =, %, #)
- Integration tests: PASS (all special character test cases pass)
- Regression check: PASS (full suite 145 tests, 0 failures)
- Edge cases tested: empty password, max-length password, Unicode passwords (U+0080-U+00FF), all ASCII special characters

Fix summary confirmed:
- Root cause: URL decoding not applied to password field
- Fix: Proper URL-decode utility handles all reserved characters
- Tests: Comprehensive integration test added

Defect is resolved. Closing."
```

#### Step 3: Mark the Defect as Complete

Only the tester/QA role can mark a task as `complete`:

```bash
tinytask task update 20260724_30 --status complete
```

#### Step 4: Check for Related Tasks

Look for subtasks, linked tasks, or regression tasks that need closure:

```bash
# Check for subtasks
tinytask subtask list 20260724_30

# Check for linked tasks
tinytask link list 20260724_30

# Search for tasks that reference this defect
tinytask task list --json | grep 20260724_30
```

If there are open related tasks (e.g., a regression task filed during a kickback), verify and close them too:

```bash
# Close the regression task if it was also fixed
tinytask comment add 20260724_36 "Fixed as part of #20260724_30 re-fix. The off-by-one boundary issue is resolved. Verified — 128-character passwords now accepted."
tinytask task update 20260724_36 --status complete
```

#### Step 5: Update the Original Feature Task (if applicable)

If the defect was against a feature task, add a closure note to the feature task:

```bash
tinytask comment add 20260724_10 "Defect #20260724_30 (special character password bug) verified and closed. Fix is in the login handler. No further action needed on the feature task."
```

#### Step 6: Archive the Defect Task

Once complete and no longer needed for active reference, archive the defect:

```bash
tinytask comment add 20260724_30 "Archiving — defect resolved and verified."
tinytask task archive 20260724_30
```

#### Step 7: Verify

```bash
tinytask task get 20260724_30
```

Confirm: `status` = `complete`, `completed_at` is set, `archived_at` is set. The task should no longer appear in default list views.

```bash
tinytask task list
# Should not show 20260724_30

tinytask task list --include-archived
# Should show 20260724_30 with archived_at set
```

### Variations

#### Closure Without Archival (Keep for Reference)

If the defect is high-severity or may be referenced later, skip archival:

```bash
tinytask comment add 20260724_30 "Verified and closed. Keeping this task un-archived for reference — this was a high-severity auth bug and may be relevant for future security audits."
tinytask task update 20260724_30 --status complete
```

#### Closing a Bug That Was Not Reproducible

If the tester cannot reproduce the original bug (even before the fix):

```bash
tinytask comment add 20260724_30 "Unable to reproduce after multiple attempts across environments. Developer also unable to reproduce (see comment above). Closing as 'cannot reproduce'. If this resurfaces, please re-file with updated reproduction steps."
tinytask task update 20260724_30 --status complete
```

#### Closing a Bug as "Won't Fix" or "By Design"

If the team decides not to fix the bug (e.g., it's actually intended behavior):

```bash
tinytask comment add 20260724_30 "After review with the team, this is working as designed. The API spec (section 4.2) specifies that passwords must be ASCII-printable. Special characters like '+' and '&' are not supported by design. Closing as 'by design'. Recommend updating the API documentation to explicitly state this constraint."
tinytask task update 20260724_30 --status complete
```

#### Archiving a Batch of Closed Defects

When cleaning up multiple closed defects:

```bash
for task_id in 20260724_30 20260724_31 20260724_32 20260724_36; do
  tinytask task archive "$task_id"
done
tinytask comment add 20260724_10 "Batch archive: defects #20260724_30, #20260724_31, #20260724_32, and #20260724_36 all verified and closed. Archiving for cleanup."
```

### Common Mistakes to Avoid

- **Closing without verification**: Never close a defect without re-running the original reproduction steps. "The developer said it's fixed" is not verification.
- **Not checking for related tasks**: A defect may have subtasks, linked regressions, or references in other tasks. Always check and close/archive the full set.
- **Archiving too quickly**: If the defect was high-severity or may be relevant for audits, keep it un-archived for a reasonable period.
- **Not updating the feature task**: If the defect was against a specific feature, leave a closure note on the feature task so future readers know the issue was found and resolved.
- **Closing without a final comment**: The closure comment is the historical record of what was verified and how. Future readers (or auditors) need this to understand the resolution.

---

## Quick Reference: QA & Bug Workflow Command Sequences

### Bug Filing (Tester → Developer)

```bash
# 1. Create the defect task
tinytask task create "BUG: <description>" \
  -d "<steps to reproduce, expected, actual, environment>" \
  --assigned-to tko-sword \
  --priority <n> \
  --tags "bug,<component>"

# 2. Route to development queue
tinytask queue add <defect-id> ready-for-development

# 3. Add filing comment
tinytask comment add <defect-id> "<context for developer>"

# 4. Link related tasks (optional)
tinytask link add <defect-id> "<url or task ref>" -d "<description>"
```

### Defect Fix Handoff (Developer → Tester)

```bash
# 1. Write fix summary
tinytask comment add <defect-id> "Fix complete. <root cause, changes, testing details>. Branch: <branch>. Commit: <hash>."

# 2. Link PR (if applicable)
tinytask link add <defect-id> "<pr-url>" -d "Fix PR"

# 3. Set to idle
tinytask task update <defect-id> --status idle

# 4. Move to verification queue
tinytask queue move <defect-id> ready-for-testing

# 5. Reassign to the original reporter
tinytask task update <defect-id> --assigned-to <reporter>
# or:
tinytask move <defect-id> <reporter> --comment "Defect fixed. Please re-test."
```

### Verification & Closure (Tester)

```bash
# 1. Pick up for verification
tinytask task update <defect-id> --status working
tinytask comment add <defect-id> "Starting verification."

# 2. If verification PASSES:
tinytask comment add <defect-id> "Verified. <details>. Closing."
tinytask task update <defect-id> --status complete
# (Optional) archive
tinytask task archive <defect-id>

# 3. If verification FAILS (kickback):
tinytask comment add <defect-id> "Verification FAILED. <what didn't work, steps, expected vs actual>"
tinytask task update <defect-id> --status idle
tinytask queue move <defect-id> ready-for-development
tinytask move <defect-id> <developer> --comment "Kickback: <reason>. Please re-fix."
```

### Full Bug Lifecycle (Summary)

```
Report → Fix → Verify → (Pass: Close) or (Fail: Kickback → Re-fix → Re-verify → ...)
```

```bash
# C1: Tester files bug
tinytask task create "BUG: ..." --assigned-to tko-sword --tags "bug,..." --priority <n>
tinytask queue add <id> ready-for-development

# C2: Developer picks up and fixes
tinytask task update <id> --status working
# ... implement fix ...
tinytask comment add <id> "Fix complete. <details>"

# C3: Developer hands off to tester
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-testing
tinytask move <id> <reporter> --comment "Defect fixed. Please verify."

# C4: Tester verifies — if fail, kickback
tinytask task update <id> --status working
# ... verify ...
# If fail:
tinytask comment add <id> "Verification FAILED. <details>"
tinytask task update <id> --status idle
tinytask queue move <id> ready-for-development
tinytask move <id> <developer> --comment "Kickback. <reason>"

# C5: Tester verifies — if pass, close
tinytask comment add <id> "Verified. <details>. Closing."
tinytask task update <id> --status complete
tinytask task archive <id>
```

---

## Cross-References

| Topic | Reference |
|---|---|
| Core task lifecycle (create, start, complete, archive) | [Scenario Group A](./01-Scenario-Group-A-Core-Task-Lifecycle.md) |
| Development workflows (subtask decomposition, parallel work, code review) | [Scenario Group B](./02-Scenario-Group-B-Development-Workflows.md) |
| Task dependencies, blocked tasks, and organization | [Scenario Group D](./04-Scenario-Group-D-Task-Organization-and-Dependencies.md) |
| Comments, cross-queue handoffs, coordination | [Scenario Group E](./05-Scenario-Group-E-Collaboration-and-Communication.md) |
| Queue management commands | See `tinytask queue --help` |
| Comment commands | See `tinytask comment --help` |
| Link commands | See `tinytask link --help` |

### Key Handoff Points

- **C1 → A2**: After filing a bug, the developer picks it up using the standard task pickup process (A2).
- **C2 → B5**: The developer may prepare the fix for code review before handing off to QA (B5), or go directly to verification (C3).
- **C3 → A3**: The defect fix handoff is a variation of the standard completion & handoff (A3), with the key difference being the queue (`ready-for-testing` vs `ready-for-qa`) and the reassignment to the creator.
- **C4 → C2**: A kickback returns the task to the developer, who follows the same pickup and fix process (C2).
- **C4 → C1**: If a kickback reveals a new, distinct issue, the tester files a new defect (C1) and links it to the original.
- **C5 → A5**: Defect closure follows the same archival process as standard task completion (A5).

### Queue Transition Summary for Defects

| From Queue | To Queue | Trigger | Who |
|---|---|---|---|
| (new) | `ready-for-development` | Bug filed | Tester |
| `ready-for-development` | `ready-for-testing` | Fix complete, needs verification | Developer |
| `ready-for-testing` | `ready-for-development` | Verification failed (kickback) | Tester |
| `ready-for-testing` | (complete) | Verification passed | Tester |

---

*This document is part of the TinyTask Process Manual. See [00-Foundation.md](./00-Foundation.md) for core concepts and [other scenario documents](.) for specialized workflows.*
