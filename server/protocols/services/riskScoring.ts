/**
 * ACUTERIUM TECHNOLOGIES - RISK SCORING SERVICE
 * 
 * Service layer wrapping EREBUSFORMULA651 for integration
 * into the RUZN-Lite chat and analysis pipelines.
 * 
 * @module RiskScoringService
 * @version 1.0.0
 * @protocol EREBUS-CSE-3A12d-002
 */

import { 
  calculateEREBUSFORMULA651, 
  ComplianceRiskInput, 
  ComplianceRiskResult,
  hasHighRiskIndicators
} from '../formulas/EREBUSFORMULA651';
import { ConsciousnessWeight } from '../core/ConsciousnessWeight';

// =============================================================================
// SERVICE TYPES
// =============================================================================

export interface RiskAssessmentInput {
  /** The text to analyze (complaint, report, etc.) */
  text: string;
  /** Language of the text */
  language?: 'arabic' | 'english';
  /** Type of entity mentioned */
  entityType?: 'government' | 'semi-government' | 'private' | 'individual';
  /** Existing control measures in place */
  existingControls?: string[];
  /** Compliance maturity level */
  maturityLevel?: 'initial' | 'developing' | 'defined' | 'managed' | 'optimizing';
  /** Additional context from conversation history */
  conversationContext?: string;
}

export interface RiskAssessmentResult extends ComplianceRiskResult {
  /** Protocol metadata */
  protocolMetadata: {
    protocolId: string;
    protocolName: string;
    formula: string;
    effectiveness: number;
    executionTime: number;
    timestamp: Date;
  };
  /** Quick flags for UI */
  quickFlags: {
    isHighRisk: boolean;
    isCritical: boolean;
    requiresEscalation: boolean;
    requiresSAINotification: boolean;
  };
  /** Extracted keywords for search/categorization */
  extractedKeywords: string[];
  /** Suggested category for the complaint */
  suggestedCategory: string;
}

// =============================================================================
// CATEGORY MAPPING
// =============================================================================

const RISK_TO_CATEGORY_MAP: Record<string, string> = {
  'EMBEZZLEMENT': 'financial_corruption',
  'MONEY_LAUNDERING': 'financial_corruption',
  'BRIBERY': 'financial_corruption',
  'FRAUD': 'financial_corruption',
  'ABUSE_OF_POSITION': 'abuse_of_power',
  'CONFLICT_OF_INTEREST': 'conflict_of_interest',
  'PROCUREMENT_VIOLATION': 'tender_violation',
  'NEPOTISM': 'conflict_of_interest',
  'FORGERY': 'financial_corruption',
  'FALSE_STATEMENTS': 'administrative_negligence',
  'LABOR_VIOLATION': 'administrative_negligence',
  'ENVIRONMENTAL_VIOLATION': 'administrative_negligence',
  'DATA_BREACH': 'administrative_negligence',
  'FINANCIAL_MISSTATEMENT': 'financial_corruption',
  'GROSS_NEGLIGENCE': 'administrative_negligence',
  'MISUSE_PUBLIC_FUNDS': 'financial_corruption',
  'LICENSE_VIOLATION': 'tender_violation',
  'TAX_EVASION': 'financial_corruption',
};

// =============================================================================
// MAIN SERVICE FUNCTION
// =============================================================================

/**
 * Perform comprehensive risk assessment using EREBUS protocols
 * 
 * @param input - Risk assessment input
 * @returns Complete risk assessment result with metadata
 */
export async function assessRisk(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
  const startTime = performance.now();
  
  // Prepare input for EREBUSFORMULA651
  const formulaInput: ComplianceRiskInput = {
    text: input.text,
    entityType: input.entityType,
    existingControls: input.existingControls,
    maturityLevel: input.maturityLevel,
  };
  
  // If conversation context provided, append it for better analysis
  if (input.conversationContext) {
    formulaInput.text = `${input.text}\n\nContext: ${input.conversationContext}`;
  }
  
  // Execute EREBUSFORMULA651
  const result = calculateEREBUSFORMULA651(formulaInput);
  
  const executionTime = performance.now() - startTime;
  
  // Determine quick flags
  const quickFlags = {
    isHighRisk: result.RC_risk >= 60,
    isCritical: result.riskCategory === 'CRITICAL',
    requiresEscalation: result.RC_risk >= 80,
    requiresSAINotification: result.riskCategory === 'CRITICAL' || 
      result.detectedRisks.some(r => ['EMBEZZLEMENT', 'BRIBERY', 'MONEY_LAUNDERING'].includes(r.category)),
  };
  
  // Extract keywords from detected risks
  const extractedKeywords = result.detectedRisks.flatMap(r => r.evidence);
  
  // Suggest category based on highest-scoring risk
  let suggestedCategory = 'general';
  if (result.detectedRisks.length > 0) {
    const topRisk = result.detectedRisks[0];
    suggestedCategory = RISK_TO_CATEGORY_MAP[topRisk.category] || 'general';
  }
  
  return {
    ...result,
    protocolMetadata: {
      protocolId: 'EREBUS-CSE-3A12d-002',
      protocolName: 'Regulatory Compliance Monitoring Protocol',
      formula: 'EREBUSFORMULA651',
      effectiveness: 97.2,
      executionTime,
      timestamp: new Date(),
    },
    quickFlags,
    extractedKeywords: [...new Set(extractedKeywords)], // Dedupe
    suggestedCategory,
  };
}

/**
 * Quick risk check - faster than full assessment
 * Returns true if text contains high-risk indicators
 */
export function quickRiskCheck(text: string): boolean {
  return hasHighRiskIndicators(text);
}

/**
 * Batch assess multiple texts
 */
export async function batchAssessRisk(
  inputs: RiskAssessmentInput[]
): Promise<RiskAssessmentResult[]> {
  const results: RiskAssessmentResult[] = [];
  
  for (const input of inputs) {
    const result = await assessRisk(input);
    results.push(result);
  }
  
  return results;
}

/**
 * Get risk summary statistics from multiple assessments
 */
export function getRiskSummary(results: RiskAssessmentResult[]): {
  totalAssessed: number;
  criticalCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  avgRiskScore: number;
  avgConsciousness: number;
  topCategories: { category: string; count: number }[];
} {
  const summary = {
    totalAssessed: results.length,
    criticalCount: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    avgRiskScore: 0,
    avgConsciousness: 0,
    topCategories: [] as { category: string; count: number }[],
  };
  
  if (results.length === 0) return summary;
  
  const categoryCount: Record<string, number> = {};
  let totalRisk = 0;
  let totalConsciousness = 0;
  
  for (const result of results) {
    totalRisk += result.RC_risk;
    totalConsciousness += result.aggregateConsciousness;
    
    switch (result.riskCategory) {
      case 'CRITICAL': summary.criticalCount++; break;
      case 'HIGH': summary.highRiskCount++; break;
      case 'MEDIUM': summary.mediumRiskCount++; break;
      case 'LOW':
      case 'NEGLIGIBLE': summary.lowRiskCount++; break;
    }
    
    categoryCount[result.suggestedCategory] = (categoryCount[result.suggestedCategory] || 0) + 1;
  }
  
  summary.avgRiskScore = totalRisk / results.length;
  summary.avgConsciousness = totalConsciousness / results.length;
  
  summary.topCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return summary;
}

// =============================================================================
// INTEGRATION HELPER FOR CHAT ROUTER
// =============================================================================

/**
 * Wrapper function for easy integration with existing chat router
 * Returns in format compatible with existing riskScore field
 */
export async function calculateAdvancedRiskScore(
  message: string,
  options?: {
    entityType?: RiskAssessmentInput['entityType'];
    maturityLevel?: RiskAssessmentInput['maturityLevel'];
    language?: 'arabic' | 'english';
  }
): Promise<{
  /** Simple 0-100 score for backward compatibility */
  basicScore: number;
  /** Full EREBUS assessment */
  advancedAssessment: RiskAssessmentResult;
  /** Category string for existing category field */
  category: string;
}> {
  const assessment = await assessRisk({
    text: message,
    entityType: options?.entityType || 'government', // Default to government for OSAI context
    maturityLevel: options?.maturityLevel || 'managed',
    language: options?.language,
  });
  
  return {
    basicScore: Math.round(assessment.RC_risk),
    advancedAssessment: assessment,
    category: assessment.suggestedCategory,
  };
}
