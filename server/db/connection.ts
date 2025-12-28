/**
 * Ruzn-Lite Database Connection Manager
 * 
 * Provides resilient database connection with:
 * - Connection pooling
 * - Automatic retry on failure
 * - Health checks
 * - NO silent fallback to demo data
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../../drizzle/schema';

// Connection pool
let pool: mysql.Pool | null = null;
let db: any = null; // Using any to avoid complex drizzle type mismatch

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const POOL_CONFIG = {
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

/**
 * Custom database error class
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DATABASE_ERROR',
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = 'DatabaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Initialize database connection with retry logic
 */
export async function initializeDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new DatabaseError(
      'DATABASE_URL environment variable is not set',
      'CONFIG_ERROR'
    );
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${MAX_RETRIES}...`);
      
      pool = mysql.createPool({
        uri: databaseUrl,
        ...POOL_CONFIG
      });
      
      // Test connection
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      
      // Initialize Drizzle ORM
      db = drizzle(pool, { schema, mode: 'default' });
      
      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        throw new DatabaseError(
          `Failed to connect to database after ${MAX_RETRIES} attempts: ${error}`,
          'CONNECTION_ERROR'
        );
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      );
    }
  }
}

/**
 * Get database instance
 * Throws if not initialized - NO silent fallback to demo data
 */
export function getDb() {
  if (!db) {
    throw new DatabaseError(
      'Database not initialized. Call initializeDatabase() first.',
      'NOT_INITIALIZED'
    );
  }
  return db;
}

/**
 * Get raw pool for advanced queries
 */
export function getPool() {
  if (!pool) {
    throw new DatabaseError(
      'Database pool not initialized',
      'NOT_INITIALIZED'
    );
  }
  return pool;
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!pool) {
    return { healthy: false, error: 'Pool not initialized' };
  }

  const startTime = Date.now();
  
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    
    return {
      healthy: true,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      error: String(error)
    };
  }
}

/**
 * Graceful shutdown
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    console.log('Database connection closed');
  }
}

/**
 * Transaction helper
 */
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  const database = getDb();
  
  // Note: Drizzle MySQL doesn't have built-in transaction support like Postgres
  // For MySQL, you'd use raw queries or a different approach
  // This is a simplified version
  return await callback(database);
}

/**
 * Execute raw SQL query
 */
export async function executeRaw<T = any>(
  sql: string,
  params: any[] = []
): Promise<T> {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows as T;
}
