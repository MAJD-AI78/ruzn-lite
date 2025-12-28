/**
 * Ruzn-Lite Knowledge Base Module (MySQL - Legacy/Manual)
 * 
 * ⚠️ DEPRECATION NOTICE:
 * This module is legacy/manual keyword KB (MySQL full-text search).
 * For production regulatory clause retrieval, use the PGVector semantic search:
 *   - import { getKnowledgeProvider } from '../knowledge/providers'
 *   - provider.search({ query: "..." })
 * 
 * This module is kept for:
 * - Internal notes and manual annotations
 * - Backward compatibility
 * - Simple full-text fallback when PGVector is unavailable
 * 
 * Set INTERNAL_NOTES_MODE=true to enable this module.
 * 
 * Original features:
 * - Full-text search in Arabic and English
 * - Document management
 * - Version control
 * - PDF parsing and ingestion
 */

import { getDb } from './connection';
import { knowledgeBase, documentVersions } from '../../drizzle/schema';
import { eq, like, or, desc, sql, and } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════
// INTERNAL NOTES MODE CHECK
// ═══════════════════════════════════════════════════════════════
function checkInternalNotesMode() {
  if (process.env.INTERNAL_NOTES_MODE !== "true") {
    console.warn(
      "⚠️ MySQL knowledge module called but INTERNAL_NOTES_MODE is not enabled. " +
      "For production RAG, use server/knowledge/ (PGVector)."
    );
  }
}

// Types
export interface KnowledgeEntry {
  id: number;
  title: string;
  titleArabic?: string | null;
  content: string;
  contentArabic?: string | null;
  category: 'law' | 'regulation' | 'policy' | 'procedure' | 'report' | 'guideline';
  source: string;
  referenceNumber?: string | null;
  effectiveDate?: Date | null;
  keywords: string | null; // JSON string array stored in DB
  keywordsArabic?: string | null; // JSON string array stored in DB
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  relevanceScore: number;
  matchedKeywords: string[];
  snippet: string;
}

export interface DocumentVersion {
  id: number;
  knowledgeId: number;
  version: number;
  content: string;
  changedBy: string;
  changeDescription: string;
  createdAt: Date;
}

/**
 * Search knowledge base with full-text and keyword matching
 */
export async function searchKnowledgeBase(
  query: string,
  options: {
    limit?: number;
    category?: KnowledgeEntry['category'];
    language?: 'arabic' | 'english' | 'both';
    minRelevance?: number;
  } = {}
): Promise<SearchResult[]> {
  const {
    limit = 5,
    category,
    language = 'both',
    minRelevance = 0.1
  } = options;

  const db = getDb();
  
  // Detect if query is Arabic
  const isArabicQuery = /[\u0600-\u06FF]/.test(query);
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  // Build search conditions
  const conditions = [];
  
  if (language === 'both' || language === 'english') {
    conditions.push(
      like(knowledgeBase.content, `%${query}%`),
      like(knowledgeBase.title, `%${query}%`)
    );
  }
  
  if (language === 'both' || language === 'arabic') {
    conditions.push(
      like(knowledgeBase.contentArabic, `%${query}%`),
      like(knowledgeBase.titleArabic, `%${query}%`)
    );
  }

  // Add category filter if specified
  const whereClause = category 
    ? and(or(...conditions), eq(knowledgeBase.category, category))
    : or(...conditions);

  const results = await db
    .select()
    .from(knowledgeBase)
    .where(whereClause)
    .limit(limit * 2); // Get more to filter by relevance

  // Calculate relevance scores
  const scoredResults: SearchResult[] = results.map((entry: any) => {
    let score = 0;
    const matchedKeywords: string[] = [];
    
    // Title match (high weight)
    if (entry.title?.toLowerCase().includes(query.toLowerCase())) {
      score += 0.4;
    }
    if (entry.titleArabic?.includes(query)) {
      score += 0.4;
    }
    
    // Content match
    const content = isArabicQuery ? entry.contentArabic : entry.content;
    if (content) {
      const contentLower = content.toLowerCase();
      searchTerms.forEach(term => {
        const count = (contentLower.match(new RegExp(term, 'g')) || []).length;
        if (count > 0) {
          score += Math.min(count * 0.05, 0.3);
          matchedKeywords.push(term);
        }
      });
    }
    
    // Keyword match
    const keywords = isArabicQuery ? entry.keywordsArabic : entry.keywords;
    if (keywords) {
      const keywordArray = typeof keywords === 'string' 
        ? JSON.parse(keywords) 
        : keywords;
      
      searchTerms.forEach(term => {
        if (keywordArray.some((k: string) => k.toLowerCase().includes(term))) {
          score += 0.2;
          matchedKeywords.push(term);
        }
      });
    }
    
    // Generate snippet
    const snippet = generateSnippet(
      isArabicQuery ? entry.contentArabic : entry.content,
      query,
      200
    );
    
    return {
      entry: entry as KnowledgeEntry,
      relevanceScore: Math.min(score, 1),
      matchedKeywords: [...new Set(matchedKeywords)],
      snippet
    };
  });

  // Filter by minimum relevance and sort
  return scoredResults
    .filter(r => r.relevanceScore >= minRelevance)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/**
 * Generate a snippet around the matched query
 */
function generateSnippet(
  content: string | null | undefined,
  query: string,
  maxLength: number
): string {
  if (!content) return '';
  
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  
  if (index === -1) {
    // Return beginning of content if no match
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  
  // Get context around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 150);
  
  let snippet = content.substring(start, end);
  
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Get all knowledge entries
 */
export async function getAllKnowledge(
  options: {
    category?: KnowledgeEntry['category'];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ entries: KnowledgeEntry[]; total: number }> {
  const { category, limit = 50, offset = 0 } = options;
  const db = getDb();
  
  const whereClause = category 
    ? eq(knowledgeBase.category, category) 
    : undefined;

  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(knowledgeBase)
      .where(whereClause)
      .orderBy(desc(knowledgeBase.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBase)
      .where(whereClause)
  ]);

  return {
    entries: entries as KnowledgeEntry[],
    total: countResult[0]?.count || 0
  };
}

/**
 * Get knowledge entry by ID
 */
export async function getKnowledgeById(id: number): Promise<KnowledgeEntry | null> {
  const db = getDb();
  
  const [entry] = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, id))
    .limit(1);
  
  return entry as KnowledgeEntry | null;
}

// Input type for creating entries (accepts arrays for keywords)
export interface CreateKnowledgeInput {
  title: string;
  titleArabic?: string;
  content: string;
  contentArabic?: string;
  category: 'law' | 'regulation' | 'policy' | 'procedure' | 'report' | 'guideline';
  source: string;
  referenceNumber?: string;
  effectiveDate?: Date;
  keywords: string[];
  keywordsArabic?: string[];
}

/**
 * Create new knowledge entry
 */
export async function createKnowledgeEntry(
  data: CreateKnowledgeInput
): Promise<KnowledgeEntry> {
  const db = getDb();
  
  const [result] = await db
    .insert(knowledgeBase)
    .values({
      title: data.title,
      titleArabic: data.titleArabic || null,
      content: data.content,
      contentArabic: data.contentArabic || null,
      category: data.category,
      source: data.source,
      referenceNumber: data.referenceNumber || null,
      effectiveDate: data.effectiveDate || null,
      keywords: JSON.stringify(data.keywords),
      keywordsArabic: data.keywordsArabic ? JSON.stringify(data.keywordsArabic) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
  const inserted = await getKnowledgeById(result.insertId);
  if (!inserted) throw new Error('Failed to create knowledge entry');
  
  return inserted;
}

/**
 * Update knowledge entry with version tracking
 */
export async function updateKnowledgeEntry(
  id: number,
  data: Partial<KnowledgeEntry>,
  changedBy: string,
  changeDescription: string
): Promise<KnowledgeEntry> {
  const db = getDb();
  
  // Get current entry for versioning
  const current = await getKnowledgeById(id);
  if (!current) throw new Error(`Knowledge entry ${id} not found`);
  
  // Save current version
  await db.insert(documentVersions).values({
    knowledgeId: id,
    version: await getNextVersion(id),
    content: current.content,
    contentArabic: current.contentArabic,
    changedBy,
    changeDescription,
    createdAt: new Date()
  });
  
  // Update entry
  await db
    .update(knowledgeBase)
    .set({
      ...data,
      keywords: data.keywords ? JSON.stringify(data.keywords) : undefined,
      keywordsArabic: data.keywordsArabic ? JSON.stringify(data.keywordsArabic) : undefined,
      updatedAt: new Date()
    })
    .where(eq(knowledgeBase.id, id));
  
  const updated = await getKnowledgeById(id);
  if (!updated) throw new Error('Failed to update knowledge entry');
  
  return updated;
}

/**
 * Get next version number for an entry
 */
async function getNextVersion(knowledgeId: number): Promise<number> {
  const db = getDb();
  
  const [result] = await db
    .select({ maxVersion: sql<number>`COALESCE(MAX(version), 0)` })
    .from(documentVersions)
    .where(eq(documentVersions.knowledgeId, knowledgeId));
  
  return (result?.maxVersion || 0) + 1;
}

/**
 * Get version history for a knowledge entry
 */
export async function getVersionHistory(knowledgeId: number): Promise<DocumentVersion[]> {
  const db = getDb();
  
  const versions = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.knowledgeId, knowledgeId))
    .orderBy(desc(documentVersions.version));
  
  return versions as DocumentVersion[];
}

/**
 * Restore a previous version
 */
export async function restoreVersion(
  knowledgeId: number,
  version: number,
  restoredBy: string
): Promise<KnowledgeEntry> {
  const db = getDb();
  
  // Get the version to restore
  const [versionToRestore] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.knowledgeId, knowledgeId),
        eq(documentVersions.version, version)
      )
    )
    .limit(1);
  
  if (!versionToRestore) {
    throw new Error(`Version ${version} not found for knowledge entry ${knowledgeId}`);
  }
  
  // Update with restored content
  return await updateKnowledgeEntry(
    knowledgeId,
    {
      content: versionToRestore.content,
      contentArabic: versionToRestore.contentArabic ?? undefined
    },
    restoredBy,
    `Restored from version ${version}`
  );
}

/**
 * Delete knowledge entry
 */
export async function deleteKnowledgeEntry(id: number): Promise<void> {
  const db = getDb();
  
  // Delete versions first (foreign key)
  await db
    .delete(documentVersions)
    .where(eq(documentVersions.knowledgeId, id));
  
  // Delete entry
  await db
    .delete(knowledgeBase)
    .where(eq(knowledgeBase.id, id));
}

/**
 * Build augmented prompt with knowledge context
 * Used for RAG (Retrieval Augmented Generation)
 */
export async function buildAugmentedPrompt(
  basePrompt: string,
  userQuery: string,
  options: {
    maxResults?: number;
    language?: 'arabic' | 'english' | 'both';
  } = {}
): Promise<string> {
  const { maxResults = 3, language = 'both' } = options;
  
  // Search for relevant knowledge
  const results = await searchKnowledgeBase(userQuery, {
    limit: maxResults,
    language,
    minRelevance: 0.2
  });
  
  if (results.length === 0) {
    return basePrompt;
  }
  
  // Build context section
  const contextParts = results.map((r, i) => {
    const entry = r.entry;
    const title = language === 'arabic' && entry.titleArabic 
      ? entry.titleArabic 
      : entry.title;
    const content = language === 'arabic' && entry.contentArabic
      ? entry.contentArabic
      : entry.content;
    
    return `[${i + 1}] ${title} (${entry.source}):\n${r.snippet}`;
  });
  
  const contextSection = language === 'arabic'
    ? `\n\nالسياق ذو الصلة:\n${contextParts.join('\n\n')}`
    : `\n\nRelevant Context:\n${contextParts.join('\n\n')}`;
  
  return basePrompt + contextSection;
}

/**
 * Seed knowledge base with sample legal documents
 * Run this during initial setup
 * 
 * NOTE: Only seeds in GOV_DEMO_MODE. In PUBLIC_MODE, demo content
 * should not be present.
 */
export async function seedKnowledgeBase(): Promise<void> {
  // ═══════════════════════════════════════════════════════════════
  // MODE CHECK: Only seed demo content in GOV_DEMO_MODE
  // ═══════════════════════════════════════════════════════════════
  const govDemoMode = process.env.GOV_DEMO_MODE === "true";
  const publicMode = process.env.PUBLIC_MODE === "true";
  
  if (!govDemoMode || publicMode) {
    console.log("⏭️  Skipping demo seed data (PUBLIC_MODE or GOV_DEMO_MODE not enabled)");
    console.log("   Set GOV_DEMO_MODE=true and PUBLIC_MODE=false to seed demo content.");
    return;
  }
  
  checkInternalNotesMode();
  const db = getDb();
  
  const documents = [
    {
      title: 'Sample Audit Law - Financial Oversight',
      titleArabic: 'قانون الرقابة المالية - نموذج',
      content: `The Audit Authority has legal personality and financial and administrative independence...`,
      contentArabic: `جهاز الرقابة له الشخصية الاعتبارية والاستقلال المالي والإداري...`,
      category: 'law' as const,
      source: 'Official Gazette',
      referenceNumber: 'SAMPLE-001',
      keywords: ['audit', 'financial oversight', 'administrative oversight', 'governance'],
      keywordsArabic: ['رقابة', 'مالية', 'إدارية', 'حوكمة']
    },
    {
      title: 'Sample Decree - Protection of Public Funds',
      titleArabic: 'مرسوم نموذجي - حماية المال العام',
      content: `Public funds are inviolable and must be preserved. Article 4 establishes the sanctity of public funds...`,
      contentArabic: `للأموال العامة حرمتها ويجب المحافظة عليها. المادة 4 تنص على حرمة المال العام...`,
      category: 'law' as const,
      source: 'Official Gazette',
      referenceNumber: 'SAMPLE-002',
      keywords: ['public funds', 'embezzlement', 'conflict of interest', 'bribery'],
      keywordsArabic: ['مال عام', 'اختلاس', 'تضارب مصالح', 'رشوة']
    }
    // Add more documents as needed
  ];

  for (const doc of documents) {
    try {
      await createKnowledgeEntry(doc);
      console.log(`✅ Seeded: ${doc.title}`);
    } catch (error) {
      console.error(`Failed to seed ${doc.title}:`, error);
    }
  }
}
