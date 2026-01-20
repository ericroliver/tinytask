/**
 * Database client wrapper for better-sqlite3
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseClient {
  private db: Database.Database;
  private isInitialized = false;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.configure();
  }

  /**
   * Configure database settings
   */
  private configure(): void {
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Set synchronous mode for performance
    this.db.pragma('synchronous = NORMAL');

    // Set busy timeout to 30 seconds to prevent premature timeouts
    this.db.pragma('busy_timeout = 30000');
    
    // Set WAL autocheckpoint to prevent WAL from growing too large
    this.db.pragma('wal_autocheckpoint = 1000');
  }

  /**
   * Check if a column exists in a table
   */
  private columnExists(tableName: string, columnName: string): boolean {
    const result = this.db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>;
    return result.some((col) => col.name === columnName);
  }

  /**
   * Run database migrations for schema changes
   */
  private runMigrations(): void {
    // Migration: Add parent_task_id column if it doesn't exist
    if (!this.columnExists('tasks', 'parent_task_id')) {
      this.db.exec(`
        ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER;
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
      `);
    }

    // Migration: Add queue_name column if it doesn't exist
    if (!this.columnExists('tasks', 'queue_name')) {
      this.db.exec(`
        ALTER TABLE tasks ADD COLUMN queue_name TEXT;
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_queue_name ON tasks(queue_name);
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_queue_status ON tasks(queue_name, status);
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_queue_assigned ON tasks(queue_name, assigned_to);
      `);
    }

    // Migration: Add previous_assigned_to column if it doesn't exist
    if (!this.columnExists('tasks', 'previous_assigned_to')) {
      this.db.exec(`
        ALTER TABLE tasks ADD COLUMN previous_assigned_to TEXT;
      `);
    }
  }

  /**
   * Initialize database schema
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Remove comment lines and split into individual statements
    const cleanedSchema = schema
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedSchema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Separate table creation from index creation
    const tableStatements: string[] = [];
    const indexStatements: string[] = [];

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.startsWith('CREATE INDEX')) {
        indexStatements.push(statement);
      } else {
        tableStatements.push(statement);
      }
    }

    // 1. Create tables first
    for (const statement of tableStatements) {
      this.db.exec(statement);
    }

    // 2. Run migrations to add missing columns
    this.runMigrations();

    // 3. Create indexes last (after columns exist)
    for (const statement of indexStatements) {
      this.db.exec(statement);
    }

    this.isInitialized = true;
  }

  /**
   * Execute a query and return multiple rows
   */
  query<T = unknown>(sql: string, params?: unknown[]): T[] {
    try {
      const stmt = this.db.prepare(sql);
      const result = (params ? stmt.all(...params) : stmt.all()) as T[];
      return result;
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a query and return a single row
   */
  queryOne<T = unknown>(sql: string, params?: unknown[]): T | null {
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? stmt.get(...params) : stmt.get();
      return (result as T) || null;
    } catch (error) {
      throw new Error(`QueryOne failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  execute(sql: string, params?: unknown[]): Database.RunResult {
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? stmt.run(...params) : stmt.run();
      return result;
    } catch (error) {
      throw new Error(`Execute failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  transaction<T>(callback: () => T): T {
    const txn = this.db.transaction(callback);
    return txn();
  }

  /**
   * Get the underlying database instance (for advanced usage)
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Check if database is open
   */
  isOpen(): boolean {
    return this.db.open;
  }
}
