/**
 * Ruzn-Lite Database Module
 * 
 * Exports database connection and knowledge base functions.
 * 
 * Usage:
 * ```typescript
 * import { initializeDatabase, getDb, searchKnowledgeBase } from './db';
 * 
 * // Initialize on server start
 * await initializeDatabase();
 * 
 * // Use database
 * const db = getDb();
 * 
 * // Search knowledge base for RAG
 * const results = await searchKnowledgeBase('conflict of interest', {
 *   language: 'arabic',
 *   limit: 3
 * });
 * ```
 */

// Connection management
export {
  initializeDatabase,
  getDb,
  getPool,
  checkDatabaseHealth,
  closeDatabase,
  withTransaction,
  executeRaw,
  DatabaseError
} from './connection';

// Knowledge base (RAG)
export {
  searchKnowledgeBase,
  getAllKnowledge,
  getKnowledgeById,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  getVersionHistory,
  restoreVersion,
  buildAugmentedPrompt,
  seedKnowledgeBase
} from './knowledge';

// Types
export type {
  KnowledgeEntry,
  SearchResult,
  DocumentVersion
} from './knowledge';
