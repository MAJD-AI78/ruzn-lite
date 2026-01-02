/**
 * ACUTERIUM TECHNOLOGIES - PROTOCOL SERVICES INDEX
 * 
 * Exports all protocol service implementations
 * 
 * @module protocols/services
 */

// Risk Scoring Service (EREBUSFORMULA651)
export {
  assessRisk,
  quickRiskCheck,
  batchAssessRisk,
  getRiskSummary,
  calculateAdvancedRiskScore,
  type RiskAssessmentInput,
  type RiskAssessmentResult,
} from './riskScoring';

// Regulatory Impact Assessment Service (EREBUSFORMULA659)
export {
  performRIAAssessment,
  quickRIAScan,
  compareLegislativeVersions,
  generateRIAReport,
  simulateLegislativeMonitor,
  type RIAAssessmentRequest,
  type RIAQuickScan,
  type LegislativeMonitorAlert,
} from './riaService';
