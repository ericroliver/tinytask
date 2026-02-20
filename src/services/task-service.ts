/**
 * Task service - Business logic for task operations
 */

import { DatabaseClient } from '../db/client.js';
import {
  Task,
  ParsedTask,
  TaskWithRelations,
  TaskWithSubtasks,
  CreateTaskParams,
  UpdateTaskParams,
  TaskFilters,
  TaskStatus,
  CommentData,
  LinkData,
} from '../types/index.js';

export class TaskService {
  constructor(private db: DatabaseClient) {}

  /**
   * Create a new task
   */
  create(params: CreateTaskParams): ParsedTask {
    // Use a transaction to ensure atomic execution and immediate lock release
    return this.db.transaction(() => {
      // Validate required fields
      if (!params.title || params.title.trim().length === 0) {
        throw new Error('Task title is required');
      }

      // Validate status if provided
      if (params.status && !this.isValidStatus(params.status)) {
        throw new Error(`Invalid status: ${params.status}`);
      }

      // Validate parent_task_id if provided
      let parentQueueName: string | null = null;
      if (params.parent_task_id !== undefined && params.parent_task_id !== null) {
        const parent = this.get(params.parent_task_id);
        if (!parent) {
          throw new Error(`Parent task not found: ${params.parent_task_id}`);
        }
        // Inherit queue_name from parent if not explicitly provided
        parentQueueName = parent.queue_name;
        
        // Validate nesting depth (max 3 levels)
        const depth = this.getTaskDepth(params.parent_task_id);
        if (depth >= 3) {
          throw new Error('Maximum nesting depth (3 levels) exceeded');
        }
      }

      // Validate blocked_by_task_id if provided
      if (params.blocked_by_task_id !== undefined && params.blocked_by_task_id !== null) {
        const blockingTask = this.get(params.blocked_by_task_id);
        if (!blockingTask) {
          throw new Error(`Blocking task not found: ${params.blocked_by_task_id}`);
        }
      }

      // Prepare data
      const status = params.status || 'idle';
      const priority = params.priority ?? 0;
      const tags = params.tags ? JSON.stringify(params.tags) : null;
      const queueName = params.queue_name !== undefined ? params.queue_name : parentQueueName;

      const result = this.db.execute(
        `INSERT INTO tasks (title, description, status, assigned_to, created_by, priority, tags, parent_task_id, queue_name, blocked_by_task_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          params.title.trim(),
          params.description || null,
          status,
          params.assigned_to || null,
          params.created_by || null,
          priority,
          tags,
          params.parent_task_id || null,
          queueName,
          params.blocked_by_task_id || null,
        ]
      );

      const task = this.db.queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [
        result.lastInsertRowid,
      ]);

      if (!task) {
        throw new Error('Failed to retrieve created task');
      }

      const parsedTask = this.parseTask(task);

      // If this is a subtask, update parent status
      if (params.parent_task_id != null) {
        this.updateParentStatus(params.parent_task_id);
      }

      return parsedTask;
    });
  }

  /**
   * Get task by ID
   */
  get(id: number, includeRelations = false): TaskWithRelations | null {
    const task = this.db.queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!task) {
      return null;
    }

    const parsedTask = this.parseTask(task);

    if (!includeRelations) {
      return parsedTask as TaskWithRelations;
    }

    // Include comments and links
    const comments = this.db.query<CommentData>(
      'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC',
      [id]
    );
    const links = this.db.query<LinkData>(
      'SELECT * FROM links WHERE task_id = ? ORDER BY created_at ASC',
      [id]
    );

    return {
      ...parsedTask,
      comments,
      links,
    };
  }

  /**
   * Update task fields
   */
  update(id: number, updates: UpdateTaskParams): ParsedTask {
    // Use a transaction to ensure atomic execution and immediate lock release
    return this.db.transaction(() => {
      // Check if task exists
      const existing = this.get(id);
      if (!existing) {
        throw new Error(`Task not found: ${id}`);
      }

      // Validate status if provided
      if (updates.status && !this.isValidStatus(updates.status)) {
        throw new Error(`Invalid status: ${updates.status}`);
      }

      // Validate parent_task_id if provided
      if (updates.parent_task_id !== undefined) {
        if (updates.parent_task_id !== null) {
          // Prevent task from being its own parent
          if (updates.parent_task_id === id) {
            throw new Error('Task cannot be its own parent');
          }

          // Validate parent exists
          const parent = this.get(updates.parent_task_id);
          if (!parent) {
            throw new Error(`Parent task not found: ${updates.parent_task_id}`);
          }

          // Prevent circular references
          if (this.wouldCreateCycle(id, updates.parent_task_id)) {
            throw new Error('Cannot create circular parent-child relationship');
          }

          // Validate nesting depth
          const depth = this.getTaskDepth(updates.parent_task_id);
          if (depth >= 3) {
            throw new Error('Maximum nesting depth (3 levels) exceeded');
          }
        }
      }

      // Validate blocked_by_task_id if provided
      if (updates.blocked_by_task_id !== undefined) {
        if (updates.blocked_by_task_id !== null) {
          // Prevent task from blocking itself
          if (updates.blocked_by_task_id === id) {
            throw new Error('Task cannot be blocked by itself');
          }

          // Validate blocking task exists
          const blockingTask = this.get(updates.blocked_by_task_id);
          if (!blockingTask) {
            throw new Error(`Blocking task not found: ${updates.blocked_by_task_id}`);
          }

          // Prevent circular blocking (A blocks B, B blocks A)
          if (blockingTask.blocked_by_task_id === id) {
            throw new Error('Cannot create circular blocking relationship');
          }
        }
      }

      // Build update query dynamically
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates.title !== undefined) {
        if (!updates.title || updates.title.trim().length === 0) {
          throw new Error('Task title cannot be empty');
        }
        fields.push('title = ?');
        values.push(updates.title.trim());
      }

      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description || null);
      }

      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }

      if (updates.assigned_to !== undefined) {
        // Check if assigned_to is actually changing
        const newAssignedTo = updates.assigned_to || null;
        const currentAssignedTo = existing.assigned_to;
        
        if (newAssignedTo !== currentAssignedTo) {
          // Save current assigned_to to previous_assigned_to
          fields.push('previous_assigned_to = ?');
          values.push(currentAssignedTo);
        }
        
        fields.push('assigned_to = ?');
        values.push(newAssignedTo);
      }

      if (updates.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updates.priority);
      }

      if (updates.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }

      if (updates.parent_task_id !== undefined) {
        fields.push('parent_task_id = ?');
        values.push(updates.parent_task_id);
      }

      if (updates.queue_name !== undefined) {
        fields.push('queue_name = ?');
        values.push(updates.queue_name);
      }

      if (updates.blocked_by_task_id !== undefined) {
        fields.push('blocked_by_task_id = ?');
        values.push(updates.blocked_by_task_id);
      }

      // Always update updated_at
      fields.push('updated_at = CURRENT_TIMESTAMP');

      if (fields.length === 1) {
        // Only updated_at would be updated, no actual changes
        return existing;
      }

      values.push(id);

      this.db.execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);

      const updated = this.get(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated task');
      }

      // If status changed and task has a parent, update parent status
      if (updates.status !== undefined && existing.parent_task_id != null) {
        this.updateParentStatus(existing.parent_task_id);
      }

      return updated;
    });
  }

  /**
   * Delete task permanently
   */
  delete(id: number): void {
    // Get parent_task_id before deletion
    const task = this.db.queryOne<Task>('SELECT parent_task_id FROM tasks WHERE id = ?', [id]);
    const parentId = task?.parent_task_id;

    const result = this.db.execute('DELETE FROM tasks WHERE id = ?', [id]);

    if (result.changes === 0) {
      throw new Error(`Task not found: ${id}`);
    }

    // Update parent status if task had a parent
    if (parentId != null) {
      this.updateParentStatus(parentId);
    }
  }

  /**
   * List tasks with optional filters
   */
  list(filters: TaskFilters = {}): ParsedTask[] {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.assigned_to !== undefined) {
      conditions.push('assigned_to = ?');
      values.push(filters.assigned_to);
    }

    if (filters.status !== undefined) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    if (!filters.include_archived) {
      conditions.push('archived_at IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';
    const offsetClause = filters.offset ? `OFFSET ${filters.offset}` : '';

    const sql = `
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY priority DESC, created_at ASC
      ${limitClause} ${offsetClause}
    `;

    const tasks = this.db.query<Task>(sql, values);
    return tasks.map(task => this.parseTask(task));
  }

  /**
   * Get agent's task queue (assigned open tasks)
   */
  getQueue(agentName: string): ParsedTask[] {
    const tasks = this.db.query<Task>(
      `SELECT * FROM tasks
       WHERE assigned_to = ?
         AND status IN ('idle', 'working')
         AND archived_at IS NULL
       ORDER BY priority DESC, created_at ASC`,
      [agentName]
    );

    return tasks.map(task => this.parseTask(task));
  }

  /**
   * Archive a task (soft delete)
   */
  archive(id: number): ParsedTask {
    // Use a transaction to ensure atomic execution and immediate lock release
    return this.db.transaction(() => {
      const existing = this.get(id);
      if (!existing) {
        throw new Error(`Task not found: ${id}`);
      }

      this.db.execute('UPDATE tasks SET archived_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

      const archived = this.get(id);
      if (!archived) {
        throw new Error('Failed to retrieve archived task');
      }

      // Update parent status if task had a parent
      if (existing.parent_task_id != null) {
        this.updateParentStatus(existing.parent_task_id);
      }

      return archived;
    });
  }

  /**
   * Sign up for the highest priority idle task in agent's queue
   * Atomically marks the task as 'working' and returns it
   */
  signupForTask(agentName: string): TaskWithRelations | null {
    return this.db.transaction(() => {
      // Get first idle task from agent's queue
      const task = this.db.queryOne<Task>(
        `SELECT * FROM tasks
         WHERE assigned_to = ?
           AND status = 'idle'
           AND archived_at IS NULL
         ORDER BY priority DESC, created_at ASC
         LIMIT 1`,
        [agentName]
      );

      if (!task) {
        return null;
      }

      // Update task to working status
      this.db.execute(
        'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['working', task.id]
      );

      // Return task with relations
      const updatedTask = this.get(task.id, true);
      if (!updatedTask) {
        throw new Error('Failed to retrieve updated task');
      }

      return updatedTask;
    });
  }

  /**
   * Transfer task from current agent to new agent
   * Atomically updates assignment, status, and adds handoff comment
   */
  moveTask(
    taskId: number,
    currentAgent: string,
    newAgent: string,
    comment: string
  ): TaskWithRelations {
    return this.db.transaction(() => {
      // Verify task and ownership
      const task = this.db.queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [taskId]);
      
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (task.assigned_to !== currentAgent) {
        throw new Error(
          `Task ${taskId} is not assigned to ${currentAgent} (currently assigned to: ${task.assigned_to || 'no one'})`
        );
      }

      if (task.status !== 'idle' && task.status !== 'working') {
        throw new Error(
          `Task ${taskId} with status '${task.status}' cannot be transferred (only 'idle' or 'working' are allowed)`
        );
      }

      // Update task assignment and status, tracking previous assignee
      this.db.execute(
        `UPDATE tasks
         SET assigned_to = ?, previous_assigned_to = ?, status = 'idle', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newAgent, currentAgent, taskId]
      );

      // Add handoff comment
      this.db.execute(
        'INSERT INTO comments (task_id, content, created_by) VALUES (?, ?, ?)',
        [taskId, comment.trim(), currentAgent]
      );

      // Return updated task with relations
      const updatedTask = this.get(taskId, true);
      if (!updatedTask) {
        throw new Error('Failed to retrieve updated task');
      }

      return updatedTask;
    });
  }

  /**
   * Get subtasks for a parent task
   */
  getSubtasks(parentId: number, recursive = false): ParsedTask[] {
    if (!recursive) {
      // Get immediate children
      const tasks = this.db.query<Task>(
        `SELECT * FROM tasks
         WHERE parent_task_id = ?
         AND archived_at IS NULL
         ORDER BY priority DESC, created_at ASC`,
        [parentId]
      );
      return tasks.map(task => this.parseTask(task));
    } else {
      // Get all descendants using recursive CTE
      const tasks = this.db.query<Task>(
        `WITH RECURSIVE subtask_tree AS (
           -- Base case: immediate children
           SELECT * FROM tasks WHERE parent_task_id = ?
           UNION ALL
           -- Recursive case: children of children
           SELECT t.*
           FROM tasks t
           INNER JOIN subtask_tree st ON t.parent_task_id = st.id
         )
         SELECT * FROM subtask_tree
         WHERE archived_at IS NULL
         ORDER BY priority DESC, created_at ASC`,
        [parentId]
      );
      return tasks.map(task => this.parseTask(task));
    }
  }

  /**
   * Get task with all its subtasks
   */
  getTaskWithSubtasks(taskId: number, recursive = false): TaskWithSubtasks | null {
    const task = this.get(taskId);
    if (!task) {
      return null;
    }

    const subtasks = this.getSubtasks(taskId, recursive);
    
    return {
      ...task,
      subtasks,
      subtask_count: subtasks.length,
    };
  }

  /**
   * Create a subtask under a parent task
   */
  createSubtask(parentTaskId: number, taskData: CreateTaskParams): ParsedTask {
    return this.create({
      ...taskData,
      parent_task_id: parentTaskId,
    });
  }

  /**
   * Move a subtask to a different parent or make it top-level
   */
  moveSubtask(subtaskId: number, newParentId: number | null): ParsedTask {
    return this.update(subtaskId, {
      parent_task_id: newParentId,
    });
  }

  /**
   * Get all tasks that are blocked by a specific task
   * Useful for notifications or cascade operations
   */
  getBlockedTasks(blockingTaskId: number): ParsedTask[] {
    const tasks = this.db.query<Task>(
      'SELECT * FROM tasks WHERE blocked_by_task_id = ? AND archived_at IS NULL',
      [blockingTaskId]
    );

    return tasks.map(task => this.parseTask(task));
  }

  /**
   * Validate status value
   */
  private isValidStatus(status: string): status is TaskStatus {
    return ['idle', 'working', 'complete'].includes(status);
  }

  /**
   * Check if setting newParentId as parent of taskId would create a cycle
   */
  private wouldCreateCycle(taskId: number, newParentId: number): boolean {
    if (taskId === newParentId) {
      return true;
    }

    // Check if newParentId is a descendant of taskId
    const descendants = this.getSubtasks(taskId, true);
    return descendants.some(t => t.id === newParentId);
  }

  /**
   * Get the depth of a task in the hierarchy (0 = top-level, 1 = first level subtask, etc.)
   */
  private getTaskDepth(taskId: number): number {
    let depth = 0;
    let currentId: number | null = taskId;

    while (currentId !== null && depth < 10) { // Safety limit
      const task = this.get(currentId);
      if (!task) {
        break;
      }
      currentId = task.parent_task_id;
      if (currentId !== null) {
        depth++;
      }
    }

    return depth;
  }

  /**
   * Check if a task is currently blocked
   * A task is blocked if:
   * 1. It has a blocked_by_task_id set
   * 2. The blocking task exists
   * 3. The blocking task status is NOT 'complete'
   */
  private isCurrentlyBlocked(task: Task): boolean {
    if (!task.blocked_by_task_id) {
      return false;
    }

    const blockingTask = this.db.queryOne<Task>(
      'SELECT id, status FROM tasks WHERE id = ?',
      [task.blocked_by_task_id]
    );

    if (!blockingTask) {
      // Blocking task doesn't exist (shouldn't happen with FK, but defensive)
      return false;
    }

    // Blocked if blocking task is not complete
    return blockingTask.status !== 'complete';
  }

  /**
   * Parse task from database row (handle JSON tags and compute blocking state)
   */
  private parseTask(task: Task): ParsedTask {
    return {
      ...task,
      tags: task.tags ? JSON.parse(task.tags as string) : [],
      is_currently_blocked: this.isCurrentlyBlocked(task),
    };
  }

  /**
   * Update parent task status based on child task statuses
   * Business rules:
   * - If all children are 'complete' → parent is 'complete'
   * - Else if any child is 'working' → parent is 'working'
   * - Else (all children are 'idle') → parent is 'idle'
   */
  private updateParentStatus(parentId: number): void {
    // Get all non-archived children
    const children = this.db.query<Task>(
      `SELECT id, status FROM tasks
       WHERE parent_task_id = ?
         AND archived_at IS NULL`,
      [parentId]
    );

    // If no children, don't change parent status
    if (children.length === 0) {
      return;
    }

    // Determine parent status based on children
    let newStatus: TaskStatus;
    
    const allComplete = children.every(child => child.status === 'complete');
    const anyWorking = children.some(child => child.status === 'working');
    
    if (allComplete) {
      newStatus = 'complete';
    } else if (anyWorking) {
      newStatus = 'working';
    } else {
      // All children must be idle
      newStatus = 'idle';
    }

    // Update parent status if it changed
    const parent = this.db.queryOne<Task>(
      'SELECT id, status FROM tasks WHERE id = ?',
      [parentId]
    );

    if (parent && parent.status !== newStatus) {
      this.db.execute(
        'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, parentId]
      );

      // Recursively update grandparent if exists
      const updatedParent = this.db.queryOne<Task>(
        'SELECT parent_task_id FROM tasks WHERE id = ?',
        [parentId]
      );
      
      if (updatedParent?.parent_task_id != null) {
        this.updateParentStatus(updatedParent.parent_task_id);
      }
    }
  }
}
