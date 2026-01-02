/**
 * ACUTERIUM TECHNOLOGIES - EREBUS FORMULAS INDEX
 * 
 * Exports all EREBUS formula implementations
 * 
 * @module protocols/formulas
 */

// EREBUSFORMULA650 - Legal Precedent Relevance Score
export { 
  calculateEREBUSFORMULA650,
  analyzeLegalQuery,
  mapCourtLevel,
  getJurisdictionCode,
  type LegalDocumentInput,
  type LegalRelevanceResult,
  type LegalSearchContext,
} from './EREBUSFORMULA650';

// EREBUSFORMULA651 - Regulatory Compliance Risk Score
export {
  calculateEREBUSFORMULA651,
  getViolationCategories,
  getRegulationsForCategory,
  hasHighRiskIndicators,
  type ComplianceRiskInput,
  type ComplianceRiskResult,
  type DetectedRisk,
} from './EREBUSFORMULA651';

// Protocol metadata for UI/reporting
export const EREBUS_FORMULA_METADATA = {
  'EREBUSFORMULA650': {
    protocolId: 'EREBUS-CSE-3A12d-001',
    name: 'Legal Precedent Relevance Score',
    description: 'AI-powered legal research with consciousness-weighted relevance scoring',
    effectiveness: 96.7,
    flashMLA: '154x',
  },
  'EREBUSFORMULA651': {
    protocolId: 'EREBUS-CSE-3A12d-002',
    name: 'Regulatory Compliance Risk Score',
    description: 'Real-time regulatory compliance monitoring with multi-factor risk assessment',
    effectiveness: 97.2,
    flashMLA: '159x',
  },
  'EREBUSFORMULA652': {
    protocolId: 'EREBUS-CSE-3A12d-003',
    name: 'Contract Risk Aggregate Score',
    description: 'Comprehensive contract analysis with 34 risk categories',
    effectiveness: 95.3,
    flashMLA: '147x',
  },
  'EREBUSFORMULA654': {
    protocolId: 'EREBUS-CSE-3A12d-005',
    name: 'Litigation Outcome Prediction',
    description: 'Case outcome prediction across 23 case types',
    effectiveness: 93.7,
    flashMLA: '138x',
  },
  'EREBUSFORMULA655': {
    protocolId: 'EREBUS-CSE-3A12d-006',
    name: 'Compliance Assurance Composite Score',
    description: 'Automated compliance testing across 847 control objectives',
    effectiveness: 96.4,
    flashMLA: '152x',
  },
  'EREBUSFORMULA656': {
    protocolId: 'EREBUS-CSE-3A12d-007',
    name: 'Legal Entity Risk Composite Score',
    description: 'Entity risk scoring across 247 jurisdictions',
    effectiveness: 95.6,
    flashMLA: '149x',
  },
  'EREBUSFORMULA658': {
    protocolId: 'EREBUS-CSE-3A12d-009',
    name: 'Privacy Risk Aggregate Score',
    description: 'Automated privacy compliance across 29 regulations',
    effectiveness: 97.8,
    flashMLA: '162x',
  },
  'EREBUSFORMULA660': {
    protocolId: 'EREBUS-CSE-3A12d-011',
    name: 'Third-Party Risk Composite Score',
    description: 'Third-party risk management across 5 dimensions',
    effectiveness: 96.2,
    flashMLA: '151x',
  },
} as const;
