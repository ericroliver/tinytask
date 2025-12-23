# TinyTask MCP API Design

## Overview
The MCP server exposes both **Tools** (for actions/mutations) and **Resources** (for data queries) to enable LLM agents to collaborate on tasks.

## Tools

### Task Management

#### create_task
Creates a new task.

**Parameters:**
- `title` (string, required): Task title
- `description` (string, optional): Task description
- `assigned_to` (string, optional): Agent name to assign to
- `created_by` (string, optional): Agent name creating the task
- `priority` (number, optional): Priority level (default: 0)
- `tags` (string[], optional): Array of tag strings

**Returns:** Task object with generated ID

**Example:**
```json
{
  "title": "Implement user authentication",
  "description": "Add OAuth2 support",
  "assigned_to": "code-agent",
  "created_by": "product-agent",
  "priority": 10,
  "tags": ["backend", "security"]
}
```

#### update_task
Updates an existing task. Only provided fields are updated.

**Parameters:**
- `id` (number, required): Task ID
- `title` (string, optional): New title
- `description` (string, optional): New description
- `status` (string, optional): New status (idle/working/complete)
- `assigned_to` (string, optional): New assignee
- `priority` (number, optional): New priority
- `tags` (string[], optional): New tags (replaces existing)

**Returns:** Updated task object

#### get_task
Retrieves a single task with all its comments and links.

**Parameters:**
- `id` (number, required): Task ID

**Returns:** Task object with embedded comments and links arrays

#### delete_task
Deletes a task (hard delete). Use sparingly - prefer archiving.

**Parameters:**
- `id` (number, required): Task ID

**Returns:** Success confirmation

#### archive_task
Archives a task (soft delete).

**Parameters:**
- `id` (number, required): Task ID

**Returns:** Updated task object with archived_at timestamp

#### list_tasks
Lists tasks with optional filtering.

**Parameters:**
- `assigned_to` (string, optional): Filter by assignee
- `status` (string, optional): Filter by status
- `include_archived` (boolean, optional): Include archived tasks (default: false)
- `limit` (number, optional): Max results (default: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Returns:** Array of task objects (without comments/links)

#### get_my_queue
Convenience method for agents to get their assigned open tasks.

**Parameters:**
- `agent_name` (string, required): Agent's name

**Returns:** Array of tasks assigned to agent with status idle or working, sorted by priority

### Comment Management

#### add_comment
Adds a comment to a task.

**Parameters:**
- `task_id` (number, required): Task ID
- `content` (string, required): Comment text
- `created_by` (string, optional): Agent name

**Returns:** Comment object with generated ID

#### update_comment
Updates an existing comment.

**Parameters:**
- `id` (number, required): Comment ID
- `content` (string, required): New comment text

**Returns:** Updated comment object

#### delete_comment
Deletes a comment.

**Parameters:**
- `id` (number, required): Comment ID

**Returns:** Success confirmation

#### list_comments
Lists all comments for a task.

**Parameters:**
- `task_id` (number, required): Task ID

**Returns:** Array of comment objects

### Link Management

#### add_link
Adds a link/artifact reference to a task.

**Parameters:**
- `task_id` (number, required): Task ID
- `url` (string, required): Link/path/reference
- `description` (string, optional): Description of the artifact
- `created_by` (string, optional): Agent name

**Returns:** Link object with generated ID

#### update_link
Updates an existing link.

**Parameters:**
- `id` (number, required): Link ID
- `url` (string, optional): New URL
- `description` (string, optional): New description

**Returns:** Updated link object

#### delete_link
Deletes a link.

**Parameters:**
- `id` (number, required): Link ID

**Returns:** Success confirmation

#### list_links
Lists all links for a task.

**Parameters:**
- `task_id` (number, required): Task ID

**Returns:** Array of link objects

---

## Resources

Resources provide convenient URI-based access to data. Agents can reference these in their context.

### Task Resources

#### task://{id}
Get a specific task with all comments and links.

**URI Template:** `task://{id}`
**Example:** `task://42`

**Returns:** Full task object with comments and links

#### task://{id}/comments
Get all comments for a task.

**URI Template:** `task://{id}/comments`
**Example:** `task://42/comments`

**Returns:** Array of comments

#### task://{id}/links
Get all links for a task.

**URI Template:** `task://{id}/links`
**Example:** `task://42/links`

**Returns:** Array of links

### Queue Resources

#### queue://{agent_name}
Get an agent's queue (open tasks assigned to them).

**URI Template:** `queue://{agent_name}`
**Example:** `queue://code-agent`

**Returns:** Array of open tasks for the agent

#### queue://{agent_name}/summary
Get a summary of an agent's queue.

**URI Template:** `queue://{agent_name}/summary`
**Example:** `queue://code-agent/summary`

**Returns:** JSON object with counts by status

### List Resources

#### tasks://active
List all active (non-archived) tasks.

**URI:** `tasks://active`

**Returns:** Array of active tasks

#### tasks://archived
List all archived tasks.

**URI:** `tasks://archived`

**Returns:** Array of archived tasks

---

## Error Handling

All tools return errors in this format:

```json
{
  "content": [{
    "type": "text",
    "text": "Error message here"
  }],
  "isError": true
}
```

Common error scenarios:
- Task not found (404)
- Invalid status value (400)
- Database errors (500)
- Missing required parameters (400)

## Data Types

### Task Object
```typescript
{
  id: number;
  title: string;
  description: string | null;
  status: 'idle' | 'working' | 'complete';
  assigned_to: string | null;
  created_by: string | null;
  priority: number;
  tags: string[];
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
  archived_at: string | null;  // ISO 8601
  comments?: Comment[];  // Only in get_task
  links?: Link[];  // Only in get_task
}
```

### Comment Object
```typescript
{
  id: number;
  task_id: number;
  content: string;
  created_by: string | null;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}
```

### Link Object
```typescript
{
  id: number;
  task_id: number;
  url: string;
  description: string | null;
  created_by: string | null;
  created_at: string;  // ISO 8601
}
```

## Usage Patterns

### Agent Workflow Example

1. **Product Agent** creates task:
   ```
   create_task({
     title: "Add dark mode",
     description: "Users want dark mode",
     assigned_to: "architect-agent",
     created_by: "product-agent"
   })
   ```

2. **Architect Agent** checks queue:
   ```
   get_my_queue({ agent_name: "architect-agent" })
   ```

3. **Architect Agent** updates status and adds comments:
   ```
   update_task({ id: 1, status: "working" })
   add_comment({ 
     task_id: 1, 
     content: "Analyzing requirements...",
     created_by: "architect-agent"
   })
   ```

4. **Architect Agent** adds design doc link:
   ```
   add_link({
     task_id: 1,
     url: "/docs/dark-mode-design.md",
     description: "Technical design document"
   })
   ```

5. **Architect Agent** reassigns to code agent:
   ```
   update_task({ 
     id: 1, 
     assigned_to: "code-agent",
     status: "idle"
   })
   add_comment({
     task_id: 1,
     content: "Design complete. Ready for implementation.",
     created_by: "architect-agent"
   })
   ```

6. **Code Agent** picks up from queue, implements, marks complete:
   ```
   get_my_queue({ agent_name: "code-agent" })
   update_task({ id: 1, status: "working" })
   // ... do work ...
   add_link({ task_id: 1, url: "/src/theme.ts", description: "Dark mode implementation" })
   update_task({ id: 1, status: "complete" })
   ```

7. **Integration Agent** archives completed task:
   ```
   archive_task({ id: 1 })
   ```
