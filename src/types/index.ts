/**
 * Core type definitions for TinyTask
 */

export type TaskStatus = 'idle' | 'working' | 'complete';

// Parsed task (with tags as array)
export interface ParsedTask {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  priority: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// Task with relations (comments and links)
export interface TaskWithRelations extends ParsedTask {
  comments?: CommentData[];
  links?: LinkData[];
}

export interface CommentData {
  id: number;
  task_id: number;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkData {
  id: number;
  task_id: number;
  url: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  status?: TaskStatus;
  assigned_to?: string;
  created_by?: string;
  priority?: number;
  tags?: string[];
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigned_to?: string;
  priority?: number;
  tags?: string[];
}

export interface TaskFilters {
  assigned_to?: string;
  status?: TaskStatus;
  include_archived?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateCommentParams {
  task_id: number;
  content: string;
  created_by?: string;
}

export interface CreateLinkParams {
  task_id: number;
  url: string;
  description?: string;
  created_by?: string;
}

export interface UpdateLinkParams {
  url?: string;
  description?: string;
}

// Re-export database types
export * from './database.js';
