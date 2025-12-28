import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Conversations table for storing chat history
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messages: text("messages").notNull(), // JSON string of messages array
  feature: mysqlEnum("feature", ["complaints", "legislative"]).notNull(),
  language: mysqlEnum("language", ["arabic", "english"]).notNull(),
  riskScore: int("riskScore"), // Extracted risk score for analytics
  category: varchar("category", { length: 100 }), // Extracted category for analytics
  status: mysqlEnum("status", ["new", "under_review", "investigating", "resolved"]).default("new").notNull(),
  assignedTo: int("assignedTo"), // User ID of assigned reviewer
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Status history table for tracking all status changes
export const statusHistory = mysqlTable("status_history", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  previousStatus: mysqlEnum("previousStatus", ["new", "under_review", "investigating", "resolved"]),
  newStatus: mysqlEnum("newStatus", ["new", "under_review", "investigating", "resolved"]).notNull(),
  changedByUserId: int("changedByUserId").notNull(),
  changedByUserName: varchar("changedByUserName", { length: 200 }),
  notes: text("notes"), // Optional notes for the status change
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StatusHistory = typeof statusHistory.$inferSelect;
export type InsertStatusHistory = typeof statusHistory.$inferInsert;

// Weekly reports table for scheduled reports
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  weekStartDate: timestamp("weekStartDate").notNull(),
  weekEndDate: timestamp("weekEndDate").notNull(),
  totalComplaints: int("totalComplaints").notNull(),
  highRiskCount: int("highRiskCount").notNull(),
  resolvedCount: int("resolvedCount").notNull(),
  avgRiskScore: int("avgRiskScore").notNull(),
  categoryBreakdown: text("categoryBreakdown").notNull(), // JSON
  topEntities: text("topEntities").notNull(), // JSON
  recommendations: text("recommendations"), // JSON array
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  emailedTo: text("emailedTo"), // JSON array of email addresses
});

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = typeof weeklyReports.$inferInsert;

// Sample complaints table for demo (expanded)
export const sampleComplaints = mysqlTable("sample_complaints", {
  id: int("id").autoincrement().primaryKey(),
  textArabic: text("textArabic").notNull(),
  textEnglish: text("textEnglish").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  expectedRiskScore: int("expectedRiskScore").notNull(),
  ministry: varchar("ministry", { length: 200 }), // Which ministry/entity
  keywords: text("keywords"), // JSON array of keywords
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SampleComplaint = typeof sampleComplaints.$inferSelect;
export type InsertSampleComplaint = typeof sampleComplaints.$inferInsert;

// Audit findings table for demo
export const auditFindings = mysqlTable("audit_findings", {
  id: int("id").autoincrement().primaryKey(),
  titleArabic: text("titleArabic").notNull(),
  titleEnglish: text("titleEnglish").notNull(),
  descriptionArabic: text("descriptionArabic").notNull(),
  descriptionEnglish: text("descriptionEnglish").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).notNull(),
  ministry: varchar("ministry", { length: 200 }).notNull(),
  year: int("year").notNull(),
  amountOMR: int("amountOMR"), // Amount in Omani Rials if applicable
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditFinding = typeof auditFindings.$inferSelect;
export type InsertAuditFinding = typeof auditFindings.$inferInsert;

// Legislative documents table for legal intelligence
export const legislativeDocuments = mysqlTable("legislative_documents", {
  id: int("id").autoincrement().primaryKey(),
  titleArabic: text("titleArabic").notNull(),
  titleEnglish: text("titleEnglish").notNull(),
  documentType: mysqlEnum("documentType", ["royal_decree", "ministerial_decision", "law", "regulation", "circular"]).notNull(),
  documentNumber: varchar("documentNumber", { length: 100 }).notNull(),
  year: int("year").notNull(),
  summaryArabic: text("summaryArabic"),
  summaryEnglish: text("summaryEnglish"),
  keyProvisions: text("keyProvisions"), // JSON array of key provisions
  relatedTo: text("relatedTo"), // JSON array of related document IDs
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LegislativeDocument = typeof legislativeDocuments.$inferSelect;
export type InsertLegislativeDocument = typeof legislativeDocuments.$inferInsert;

// Analytics events table for tracking usage
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  eventType: mysqlEnum("eventType", ["chat_message", "complaint_analyzed", "legislative_query", "pdf_export", "voice_input", "document_upload", "document_analysis", "complaint_submitted"]).notNull(),
  feature: mysqlEnum("feature", ["complaints", "legislative"]).notNull(),
  language: mysqlEnum("language", ["arabic", "english"]).notNull(),
  category: varchar("category", { length: 100 }),
  riskScore: int("riskScore"),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// Demo trends data for analytics charts
export const demoTrends = mysqlTable("demo_trends", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  totalComplaints: int("totalComplaints").notNull(),
  financialCorruption: int("financialCorruption").default(0).notNull(),
  conflictOfInterest: int("conflictOfInterest").default(0).notNull(),
  abuseOfPower: int("abuseOfPower").default(0).notNull(),
  tenderViolation: int("tenderViolation").default(0).notNull(),
  adminNeglect: int("adminNeglect").default(0).notNull(),
  generalComplaint: int("generalComplaint").default(0).notNull(),
  avgRiskScore: int("avgRiskScore").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DemoTrend = typeof demoTrends.$inferSelect;
export type InsertDemoTrend = typeof demoTrends.$inferInsert;


// Historical OSAI statistics for comparative analysis (2021-2024)
export const historicalStats = mysqlTable("historical_stats", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  metric: varchar("metric", { length: 100 }).notNull(),
  value: int("value"),
  valueDecimal: varchar("valueDecimal", { length: 50 }), // For decimal values like OMR millions
  unit: varchar("unit", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }), // Optional category grouping
  source: varchar("source", { length: 200 }), // Source document reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricalStat = typeof historicalStats.$inferSelect;
export type InsertHistoricalStat = typeof historicalStats.$inferInsert;

// Complaints by entity for year-over-year comparison
export const historicalComplaintsByEntity = mysqlTable("historical_complaints_by_entity", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  entityNameArabic: varchar("entityNameArabic", { length: 300 }),
  entityNameEnglish: varchar("entityNameEnglish", { length: 300 }).notNull(),
  complaintCount: int("complaintCount").notNull(),
  resolvedCount: int("resolvedCount"),
  avgResolutionDays: int("avgResolutionDays"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricalComplaintsByEntity = typeof historicalComplaintsByEntity.$inferSelect;
export type InsertHistoricalComplaintsByEntity = typeof historicalComplaintsByEntity.$inferInsert;

// Complaints by category for year-over-year comparison
export const historicalComplaintsByCategory = mysqlTable("historical_complaints_by_category", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  categoryArabic: varchar("categoryArabic", { length: 200 }),
  categoryEnglish: varchar("categoryEnglish", { length: 200 }).notNull(),
  complaintCount: int("complaintCount").notNull(),
  percentageOfTotal: int("percentageOfTotal"), // Stored as percentage * 100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricalComplaintsByCategory = typeof historicalComplaintsByCategory.$inferSelect;
export type InsertHistoricalComplaintsByCategory = typeof historicalComplaintsByCategory.$inferInsert;

// Conviction examples for case studies
export const historicalConvictions = mysqlTable("historical_convictions", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  entityNameArabic: varchar("entityNameArabic", { length: 300 }),
  entityNameEnglish: varchar("entityNameEnglish", { length: 300 }).notNull(),
  position: varchar("position", { length: 200 }),
  violationType: varchar("violationType", { length: 300 }).notNull(),
  sentenceYears: int("sentenceYears"),
  sentenceMonths: int("sentenceMonths"),
  fineOMR: int("fineOMR"),
  amountInvolved: int("amountInvolved"), // Amount embezzled/involved
  additionalPenalties: text("additionalPenalties"), // JSON array
  summaryArabic: text("summaryArabic"),
  summaryEnglish: text("summaryEnglish"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricalConviction = typeof historicalConvictions.$inferSelect;
export type InsertHistoricalConviction = typeof historicalConvictions.$inferInsert;


// Case law database for searchable archive of OSAI convictions
export const caseLaw = mysqlTable("case_law", {
  id: int("id").autoincrement().primaryKey(),
  caseNumber: varchar("caseNumber", { length: 50 }),
  year: int("year").notNull(),
  entityNameArabic: varchar("entityNameArabic", { length: 300 }),
  entityNameEnglish: varchar("entityNameEnglish", { length: 300 }).notNull(),
  entityType: mysqlEnum("entityType", ["ministry", "government_company", "municipality", "public_authority", "other"]).default("other"),
  violationType: mysqlEnum("violationType", ["embezzlement", "bribery", "conflict_of_interest", "abuse_of_power", "forgery", "tender_violation", "administrative_negligence", "other"]).notNull(),
  violationTypeArabic: varchar("violationTypeArabic", { length: 200 }),
  violationTypeEnglish: varchar("violationTypeEnglish", { length: 200 }),
  accusedPosition: varchar("accusedPosition", { length: 200 }),
  accusedPositionArabic: varchar("accusedPositionArabic", { length: 200 }),
  legalArticles: text("legalArticles"), // JSON array of relevant articles
  sentenceYears: int("sentenceYears"),
  sentenceMonths: int("sentenceMonths"),
  fineOMR: int("fineOMR"),
  amountInvolved: int("amountInvolved"),
  amountRecovered: int("amountRecovered"),
  additionalPenalties: text("additionalPenalties"), // JSON array (dismissal, travel ban, etc.)
  summaryArabic: text("summaryArabic"),
  summaryEnglish: text("summaryEnglish"),
  detailsArabic: text("detailsArabic"),
  detailsEnglish: text("detailsEnglish"),
  outcome: mysqlEnum("outcome", ["convicted", "acquitted", "pending", "settled"]).default("convicted"),
  sourceReport: varchar("sourceReport", { length: 100 }), // e.g., "Annual Report 2024"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseLaw = typeof caseLaw.$inferSelect;
export type InsertCaseLaw = typeof caseLaw.$inferInsert;


// Knowledge Base - Stores ingested document content for AI retrieval
// Schema aligned with server/db/knowledge.ts module
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  // Core content fields (matching KnowledgeEntry interface)
  title: varchar("title", { length: 500 }).notNull(),
  titleArabic: varchar("titleArabic", { length: 500 }),
  content: text("content").notNull(),
  contentArabic: text("contentArabic"),
  category: mysqlEnum("category", [
    "law",
    "regulation", 
    "policy", 
    "procedure",
    "report",
    "guideline"
  ]).notNull(),
  source: varchar("source", { length: 500 }).notNull(),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  keywords: text("keywords"), // JSON array of keywords for search
  keywordsArabic: text("keywordsArabic"), // JSON array of Arabic keywords
  effectiveDate: timestamp("effectiveDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;

// Document version history - tracks all changes to documents
// Schema aligned with server/db/knowledge.ts DocumentVersion interface
export const documentVersions = mysqlTable("document_versions", {
  id: int("id").autoincrement().primaryKey(),
  knowledgeId: int("knowledgeId").notNull(), // Reference to knowledge_base.id
  version: int("version").notNull(),
  content: text("content").notNull(), // Snapshot of content at this version
  contentArabic: text("contentArabic"), // Snapshot of Arabic content
  changedBy: varchar("changedBy", { length: 200 }).notNull(), // User who made the change
  changeDescription: text("changeDescription").notNull(), // Description of what changed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;
