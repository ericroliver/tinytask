/**
 * Database initialization and singleton management
 */

import { DatabaseClient } from './client.js';
import { join } from 'path';

let dbInstance: DatabaseClient | null = null;

/**
 * Initialize the database with the given path
 * @param dbPath Path to the SQLite database file
 * @returns DatabaseClient instance
 */
export function initializeDatabase(dbPath?: string): DatabaseClient {
  // Use provided path or default to data directory
  const finalPath = dbPath || join(process.cwd(), 'data', 'tinytask.db');

  // Return existing instance if already initialized
  if (dbInstance && dbInstance.isOpen()) {
    return dbInstance;
  }

  // Create new instance
  dbInstance = new DatabaseClient(finalPath);
  dbInstance.initialize();

  return dbInstance;
}

/**
 * Get the current database instance
 * @throws Error if database not initialized
 */
export function getDatabase(): DatabaseClient {
  if (!dbInstance || !dbInstance.isOpen()) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance && dbInstance.isOpen()) {
    dbInstance.close();
    dbInstance = null;
  }
}
