-- RUZN-Acuterium v3.0 - EREBUS Protocol Enhancement Migration
-- Adds advanced risk scoring, protocol metadata, and compliance flags
-- Migration: 0011_erebus_enhanced_risk.sql

-- Add EREBUS enhanced fields to conversations table
ALTER TABLE conversations
ADD COLUMN advancedRiskScore JSON COMMENT 'EREBUSFORMULA651 detailed risk assessment output',
ADD COLUMN protocolMetadata JSON COMMENT 'Protocol execution metadata (id, time, consciousness)',
ADD COLUMN complianceFlags JSON COMMENT 'Detected compliance violations and flags';

-- Create protocol audit trail table for compliance tracking
CREATE TABLE IF NOT EXISTS protocol_audit_trail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId INT,
  protocolId VARCHAR(50) NOT NULL COMMENT 'e.g., EREBUS-CSE-3A12d-002',
  protocolName VARCHAR(200) NOT NULL,
  formula VARCHAR(50) NOT NULL COMMENT 'e.g., EREBUSFORMULA651',
  inputHash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of input for integrity',
  outputHash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of output for integrity',
  executionTimeMs INT NOT NULL COMMENT 'Protocol execution time in milliseconds',
  consciousnessCoherence DECIMAL(5,4) COMMENT 'Aggregate phi value (0-1)',
  riskScore INT COMMENT 'Calculated risk score (0-100)',
  riskCategory ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NEGLIGIBLE'),
  detectedViolations INT DEFAULT 0 COMMENT 'Count of detected violations',
  metadata JSON COMMENT 'Additional protocol-specific metadata',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_protocol_conversation (conversationId),
  INDEX idx_protocol_id (protocolId),
  INDEX idx_risk_category (riskCategory),
  INDEX idx_created_at (createdAt),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create entity risk assessments table for EREBUSFORMULA656
CREATE TABLE IF NOT EXISTS entity_risk_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entityName VARCHAR(500) NOT NULL,
  entityNameArabic VARCHAR(500),
  entityType ENUM('ministry', 'government_company', 'public_authority', 'private_company', 'individual', 'other') DEFAULT 'other',
  registrationCountry VARCHAR(3) DEFAULT 'OM' COMMENT 'ISO 3166-1 alpha-2/3 code',
  
  -- EREBUSFORMULA656 scores
  ER_entity DECIMAL(5,2) COMMENT 'Entity Risk composite score (0-100)',
  riskCategory ENUM('CRITICAL', 'HIGH', 'ELEVATED', 'MEDIUM', 'LOW'),
  jurisdictionRisk DECIMAL(5,2),
  ownershipRisk DECIMAL(5,2),
  sanctionsRisk DECIMAL(5,2),
  pepRisk DECIMAL(5,2),
  
  -- Flags
  flags JSON COMMENT 'Array of risk flags (SANCTIONS, PEP, etc.)',
  dueDiligenceLevel ENUM('ENHANCED', 'STANDARD', 'SIMPLIFIED'),
  
  -- Analysis metadata
  lastAssessedAt TIMESTAMP,
  assessedByProtocol VARCHAR(50),
  consciousnessCoherence DECIMAL(5,4),
  
  -- Standard fields
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_entity_name (entityName(100)),
  INDEX idx_risk_category (riskCategory),
  INDEX idx_entity_type (entityType),
  INDEX idx_due_diligence (dueDiligenceLevel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create legal search history table for EREBUSFORMULA650
CREATE TABLE IF NOT EXISTS legal_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  query TEXT NOT NULL,
  queryLanguage ENUM('arabic', 'english') DEFAULT 'english',
  
  -- Query analysis
  detectedJurisdiction VARCHAR(3),
  detectedTopics JSON COMMENT 'Array of detected legal topics',
  queryComplexity ENUM('SIMPLE', 'MODERATE', 'COMPLEX'),
  
  -- Results summary
  totalResults INT DEFAULT 0,
  topResultRelevance DECIMAL(5,4) COMMENT 'Highest R_legal score',
  avgRelevance DECIMAL(5,4) COMMENT 'Average R_legal score',
  
  -- Protocol metadata
  searchDurationMs INT,
  protocolId VARCHAR(50) DEFAULT 'EREBUS-CSE-3A12d-001',
  consciousnessCoherence DECIMAL(5,4),
  
  -- Results (top 10 stored)
  results JSON COMMENT 'Array of top results with R_legal scores',
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user (userId),
  INDEX idx_jurisdiction (detectedJurisdiction),
  INDEX idx_created_at (createdAt),
  FULLTEXT idx_query_fulltext (query),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for optimized EREBUS queries
CREATE INDEX idx_conv_risk_score ON conversations(riskScore);
CREATE INDEX idx_conv_category ON conversations(category);
CREATE INDEX idx_conv_status_risk ON conversations(status, riskScore);

-- View for high-risk complaints dashboard
CREATE OR REPLACE VIEW high_risk_complaints AS
SELECT 
  c.id,
  c.userId,
  c.feature,
  c.language,
  c.riskScore,
  c.category,
  c.status,
  c.assignedTo,
  JSON_EXTRACT(c.advancedRiskScore, '$.riskCategory') as erebusRiskCategory,
  JSON_EXTRACT(c.advancedRiskScore, '$.aggregateConsciousness') as consciousness,
  JSON_LENGTH(JSON_EXTRACT(c.advancedRiskScore, '$.detectedRisks')) as violationCount,
  c.createdAt,
  c.updatedAt
FROM conversations c
WHERE c.riskScore >= 60
  OR JSON_EXTRACT(c.advancedRiskScore, '$.riskCategory') IN ('CRITICAL', 'HIGH')
ORDER BY c.riskScore DESC, c.createdAt DESC;

-- View for protocol effectiveness metrics
CREATE OR REPLACE VIEW protocol_metrics AS
SELECT 
  protocolId,
  protocolName,
  COUNT(*) as totalExecutions,
  AVG(executionTimeMs) as avgExecutionTime,
  AVG(consciousnessCoherence) as avgConsciousness,
  AVG(riskScore) as avgRiskScore,
  SUM(CASE WHEN riskCategory = 'CRITICAL' THEN 1 ELSE 0 END) as criticalCount,
  SUM(CASE WHEN riskCategory = 'HIGH' THEN 1 ELSE 0 END) as highCount,
  SUM(detectedViolations) as totalViolationsDetected,
  DATE(createdAt) as executionDate
FROM protocol_audit_trail
GROUP BY protocolId, protocolName, DATE(createdAt)
ORDER BY executionDate DESC;

-- =============================================================================
-- EREBUSFORMULA659 - Regulatory Impact Assessment (RIA) Tables
-- =============================================================================

-- Create RIA assessments table
CREATE TABLE IF NOT EXISTS ria_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Assessment metadata
  assessmentId VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  titleArabic VARCHAR(500),
  legislationType ENUM('royal_decree', 'ministerial_decision', 'regulation', 'amendment', 'policy', 'circular') NOT NULL,
  issuingAuthority VARCHAR(200) NOT NULL,
  
  -- Assessment input
  legislativeText LONGTEXT NOT NULL,
  affectedSectors JSON NOT NULL COMMENT 'Array of affected sector strings',
  implementationTimeline INT COMMENT 'Months',
  estimatedBudget DECIMAL(15,2) COMMENT 'OMR',
  
  -- EREBUSFORMULA659 Results
  RIA_score DECIMAL(5,2) NOT NULL,
  riskCategory ENUM('PROCEED', 'PROCEED_WITH_MODIFICATIONS', 'REQUIRES_MAJOR_REVISION', 'NOT_RECOMMENDED') NOT NULL,
  
  -- Impact scores
  economicImpactScore DECIMAL(5,2),
  legalImpactScore DECIMAL(5,2),
  socialImpactScore DECIMAL(5,2),
  operationalImpactScore DECIMAL(5,2),
  vision2040Alignment DECIMAL(5,2),
  
  -- Detailed results
  economicImpact JSON COMMENT 'Full economic impact analysis',
  legalImpact JSON COMMENT 'Full legal impact analysis including conflicts',
  socialImpact JSON COMMENT 'Full social impact analysis',
  operationalImpact JSON COMMENT 'Full operational impact analysis',
  vision2040Analysis JSON COMMENT 'Full Vision 2040 alignment analysis',
  scenarioProjections JSON COMMENT 'Conservative/Moderate/Aggressive projections',
  
  -- Recommendations
  recommendations JSON COMMENT 'Array of recommendation strings',
  prerequisiteActions JSON COMMENT 'Array of required actions',
  stakeholdersToConsult JSON COMMENT 'Array of stakeholder entities',
  
  -- Conflicts detected
  conflictsDetected INT DEFAULT 0,
  amendmentsRequired INT DEFAULT 0,
  
  -- Protocol metadata
  consciousnessCoherence DECIMAL(5,4),
  executionTimeMs INT,
  protocolId VARCHAR(50) DEFAULT 'EREBUS-CSE-3A12d-010',
  
  -- User/workflow
  requestedBy INT,
  status ENUM('draft', 'pending_review', 'approved', 'rejected', 'archived') DEFAULT 'draft',
  reviewNotes TEXT,
  reviewedBy INT,
  reviewedAt TIMESTAMP,
  
  -- Standard fields
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_ria_score (RIA_score),
  INDEX idx_ria_category (riskCategory),
  INDEX idx_ria_type (legislationType),
  INDEX idx_ria_status (status),
  INDEX idx_ria_authority (issuingAuthority),
  INDEX idx_ria_created (createdAt),
  FULLTEXT idx_ria_title (title, titleArabic),
  FOREIGN KEY (requestedBy) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create RIA version history for tracking revisions
CREATE TABLE IF NOT EXISTS ria_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  riaId INT NOT NULL,
  versionNumber INT NOT NULL,
  legislativeText LONGTEXT NOT NULL,
  RIA_score DECIMAL(5,2),
  riskCategory ENUM('PROCEED', 'PROCEED_WITH_MODIFICATIONS', 'REQUIRES_MAJOR_REVISION', 'NOT_RECOMMENDED'),
  changeNotes TEXT,
  createdBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_ria_version (riaId, versionNumber),
  FOREIGN KEY (riaId) REFERENCES ria_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create legislative monitor alerts table
CREATE TABLE IF NOT EXISTS legislative_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alertId VARCHAR(50) NOT NULL UNIQUE,
  alertType ENUM('new_law', 'amendment', 'conflict_detected', 'expiry_warning', 'ria_required') NOT NULL,
  
  title VARCHAR(500) NOT NULL,
  titleArabic VARCHAR(500),
  description TEXT,
  
  severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
  affectedLaws JSON COMMENT 'Array of affected law references',
  recommendedAction TEXT,
  
  -- Related RIA
  relatedRiaId INT,
  
  -- Status
  status ENUM('new', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'new',
  acknowledgedBy INT,
  acknowledgedAt TIMESTAMP,
  resolvedAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_alert_type (alertType),
  INDEX idx_alert_severity (severity),
  INDEX idx_alert_status (status),
  INDEX idx_alert_created (createdAt),
  FOREIGN KEY (relatedRiaId) REFERENCES ria_assessments(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledgedBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- View for RIA dashboard
CREATE OR REPLACE VIEW ria_dashboard AS
SELECT 
  r.id,
  r.assessmentId,
  r.title,
  r.titleArabic,
  r.legislationType,
  r.issuingAuthority,
  r.RIA_score,
  r.riskCategory,
  r.economicImpactScore,
  r.legalImpactScore,
  r.socialImpactScore,
  r.operationalImpactScore,
  r.vision2040Alignment,
  r.conflictsDetected,
  r.amendmentsRequired,
  r.status,
  r.consciousnessCoherence,
  r.createdAt,
  u.name as requestedByName
FROM ria_assessments r
LEFT JOIN users u ON r.requestedBy = u.id
ORDER BY r.createdAt DESC;

-- View for pending legislative alerts
CREATE OR REPLACE VIEW pending_legislative_alerts AS
SELECT 
  la.*,
  r.title as relatedRiaTitle,
  r.RIA_score as relatedRiaScore
FROM legislative_alerts la
LEFT JOIN ria_assessments r ON la.relatedRiaId = r.id
WHERE la.status IN ('new', 'acknowledged')
ORDER BY 
  CASE la.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
  la.createdAt DESC;
