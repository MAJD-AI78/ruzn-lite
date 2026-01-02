/**
 * RUZN-Acuterium v3.0 - RIA Service Layer
 * 
 * Regulatory Impact Assessment Service
 * Integrates EREBUSFORMULA659 with RUZN platform
 */

import { 
  calculateEREBUSFORMULA659, 
  RIAInput, 
  RIAResult,
  Vision2040Pillar,
  getVision2040Pillars,
  getKeyOmaniLaws,
} from '../formulas/EREBUSFORMULA659';

// ═══════════════════════════════════════════════════════════════════════════════
// RIA SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface RIAAssessmentRequest {
  /** Legislative text to analyze */
  text: string;
  /** Title of the proposed legislation */
  title: string;
  /** Type of legislation */
  type: 'royal_decree' | 'ministerial_decision' | 'regulation' | 'amendment' | 'policy' | 'circular';
  /** Issuing authority */
  authority: string;
  /** Affected sectors (comma-separated or array) */
  sectors: string | string[];
  /** Implementation timeline in months */
  timeline?: number;
  /** Estimated budget in OMR */
  budget?: number;
  /** Vision 2040 pillars to prioritize */
  vision2040Focus?: Vision2040Pillar[];
  /** Scenario type */
  scenario?: 'conservative' | 'moderate' | 'aggressive';
  /** Language */
  language?: 'arabic' | 'english';
}

export interface RIAQuickScan {
  score: number;
  category: string;
  conflicts: number;
  recommendations: number;
  vision2040Alignment: number;
  estimatedImpact: 'positive' | 'neutral' | 'negative';
  proceedRecommendation: boolean;
}

export interface LegislativeMonitorAlert {
  id: string;
  type: 'new_law' | 'amendment' | 'conflict_detected' | 'expiry_warning';
  title: string;
  titleArabic?: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  affectedLaws: string[];
  recommendedAction: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIA SERVICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Perform full Regulatory Impact Assessment
 */
export async function performRIAAssessment(request: RIAAssessmentRequest): Promise<RIAResult> {
  // Normalize sectors
  const sectors = typeof request.sectors === 'string' 
    ? request.sectors.split(',').map(s => s.trim())
    : request.sectors;
  
  // Build input
  const input: RIAInput = {
    legislativeText: request.text,
    title: request.title,
    legislationType: request.type,
    issuingAuthority: request.authority,
    affectedSectors: sectors,
    implementationTimeline: request.timeline,
    estimatedBudgetImpact: request.budget,
    vision2040Pillars: request.vision2040Focus,
    scenarioType: request.scenario || 'moderate',
    language: request.language || 'english',
  };
  
  // Execute RIA
  const result = calculateEREBUSFORMULA659(input);
  
  return result;
}

/**
 * Quick scan for rapid legislative review
 */
export async function quickRIAScan(text: string, title: string): Promise<RIAQuickScan> {
  const result = await performRIAAssessment({
    text,
    title,
    type: 'regulation',
    authority: 'Unknown',
    sectors: ['general'],
  });
  
  return {
    score: result.RIA_score,
    category: result.riskCategory,
    conflicts: result.legalImpact.conflictsDetected.length,
    recommendations: result.recommendations.length,
    vision2040Alignment: result.vision2040Alignment.overallAlignment,
    estimatedImpact: result.economicImpact.score >= 60 ? 'positive' : result.economicImpact.score >= 40 ? 'neutral' : 'negative',
    proceedRecommendation: result.riskCategory === 'PROCEED' || result.riskCategory === 'PROCEED_WITH_MODIFICATIONS',
  };
}

/**
 * Compare two versions of legislation
 */
export async function compareLegislativeVersions(
  original: RIAAssessmentRequest,
  revised: RIAAssessmentRequest
): Promise<{
  originalScore: number;
  revisedScore: number;
  improvement: number;
  newConflictsResolved: number;
  newConflictsIntroduced: number;
  recommendation: string;
}> {
  const [originalResult, revisedResult] = await Promise.all([
    performRIAAssessment(original),
    performRIAAssessment(revised),
  ]);
  
  const improvement = revisedResult.RIA_score - originalResult.RIA_score;
  const conflictsResolved = Math.max(0, 
    originalResult.legalImpact.conflictsDetected.length - revisedResult.legalImpact.conflictsDetected.length
  );
  const conflictsIntroduced = Math.max(0,
    revisedResult.legalImpact.conflictsDetected.length - originalResult.legalImpact.conflictsDetected.length
  );
  
  let recommendation: string;
  if (improvement > 10) {
    recommendation = 'Revised version shows significant improvement. Proceed with revised version.';
  } else if (improvement > 0) {
    recommendation = 'Revised version shows minor improvement. Consider additional refinements.';
  } else if (improvement === 0) {
    recommendation = 'No significant change between versions. Review specific modifications.';
  } else {
    recommendation = 'Revised version scores lower. Consider reverting or further revision.';
  }
  
  return {
    originalScore: originalResult.RIA_score,
    revisedScore: revisedResult.RIA_score,
    improvement,
    newConflictsResolved: conflictsResolved,
    newConflictsIntroduced: conflictsIntroduced,
    recommendation,
  };
}

/**
 * Generate RIA report in structured format
 */
export async function generateRIAReport(
  request: RIAAssessmentRequest,
  format: 'json' | 'markdown' | 'executive_summary'
): Promise<string> {
  const result = await performRIAAssessment(request);
  
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }
  
  if (format === 'executive_summary') {
    return result.executiveSummary;
  }
  
  // Markdown format
  return `# Regulatory Impact Assessment Report

## ${request.title}

**Type:** ${request.type.replace(/_/g, ' ').toUpperCase()}  
**Issuing Authority:** ${request.authority}  
**Assessment Date:** ${new Date().toISOString().split('T')[0]}  

---

## Executive Summary

**Overall RIA Score:** ${result.RIA_score}/100  
**Recommendation:** ${result.riskCategory.replace(/_/g, ' ')}  

${result.executiveSummary}

---

## Impact Analysis

### Economic Impact (Score: ${result.economicImpact.score}/100)

| Metric | Value |
|--------|-------|
| Cost-Benefit Ratio | ${result.economicImpact.costBenefitRatio} |
| GDP Impact | ${(result.economicImpact.gdpImpact * 100).toFixed(2)}% |
| Employment Impact | ${result.economicImpact.employmentImpact.toLocaleString()} jobs |
| Business Compliance Cost | OMR ${result.economicImpact.businessComplianceCost.toLocaleString()} |
| Government Implementation Cost | OMR ${result.economicImpact.governmentImplementationCost.toLocaleString()} |
| SME Impact | ${result.economicImpact.smeImpact} |
| Foreign Investment Impact | ${result.economicImpact.foreignInvestmentImpact} |

### Legal Impact (Score: ${result.legalImpact.score}/100)

**Conflicts Detected:** ${result.legalImpact.conflictsDetected.length}  
**Amendments Required:** ${result.legalImpact.amendmentsRequired.length}  
**Regulatory Burden:** ${result.legalImpact.regulatoryBurden.toUpperCase()}  

${result.legalImpact.conflictsDetected.length > 0 ? `
#### Identified Conflicts

${result.legalImpact.conflictsDetected.map(c => `- **${c.conflictingLaw}** (${c.conflictingArticle}): ${c.conflictType} - ${c.severity}`).join('\n')}
` : ''}

### Social Impact (Score: ${result.socialImpact.score}/100)

| Metric | Value |
|--------|-------|
| Affected Population | ${result.socialImpact.affectedPopulation.toLocaleString()} (${result.socialImpact.affectedPopulationPercentage}%) |
| Public Sentiment Projection | ${result.socialImpact.publicSentimentProjection} |
| Equity Score | ${(result.socialImpact.equityScore * 100).toFixed(0)}% |

### Operational Impact (Score: ${result.operationalImpact.score}/100)

| Metric | Value |
|--------|-------|
| Implementation Complexity | ${result.operationalImpact.implementationComplexity.toUpperCase()} |
| Time to Implementation | ${result.operationalImpact.timeToImplementation} months |
| Training Required | ${result.operationalImpact.trainingRequired ? 'Yes' : 'No'} |
| Interagency Coordination | ${result.operationalImpact.interagencyCoordination.join(', ')} |

---

## Vision 2040 Alignment

**Overall Alignment:** ${result.vision2040Alignment.overallAlignment}%

### Pillar Scores

${Object.entries(result.vision2040Alignment.pillarScores).map(([pillar, score]) => 
  `- ${pillar.replace(/_/g, ' ')}: ${score}%`
).join('\n')}

${result.vision2040Alignment.potentialMisalignments.length > 0 ? `
### Potential Misalignments

${result.vision2040Alignment.potentialMisalignments.map(m => `- ${m}`).join('\n')}
` : ''}

---

## Scenario Projections

${result.scenarioProjections.map(s => `
### ${s.scenario.charAt(0).toUpperCase() + s.scenario.slice(1)} Scenario (${s.successProbability}% success probability)

| Year | Economic Outcome | Compliance Rate | Public Acceptance | Implementation |
|------|-----------------|-----------------|-------------------|----------------|
| Year 1 | ${s.year1.economicOutcome}% | ${s.year1.complianceRate}% | ${s.year1.publicAcceptance}% | ${s.year1.implementationProgress}% |
| Year 3 | ${s.year3.economicOutcome}% | ${s.year3.complianceRate}% | ${s.year3.publicAcceptance}% | ${s.year3.implementationProgress}% |
| Year 5 | ${s.year5.economicOutcome}% | ${s.year5.complianceRate}% | ${s.year5.publicAcceptance}% | ${s.year5.implementationProgress}% |
`).join('\n')}

---

## Recommendations

${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

## Prerequisite Actions

${result.prerequisiteActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

---

## Stakeholders to Consult

${result.stakeholdersToConsult.map(s => `- ${s}`).join('\n')}

---

*Generated by RUZN-Acuterium v3.0 | EREBUS-RIA Protocol (EREBUSFORMULA659)*  
*Effectiveness: ${result.protocolMetadata.effectiveness}% | Confidence: ${(result.aggregateConsciousness * 100).toFixed(1)}%*
`;
}

/**
 * Monitor legislative changes (simulation)
 */
export function simulateLegislativeMonitor(): LegislativeMonitorAlert[] {
  // This would connect to official gazette APIs in production
  return [
    {
      id: 'alert-001',
      type: 'new_law',
      title: 'Royal Decree 15/2026 - Digital Economy Regulation',
      titleArabic: 'مرسوم سلطاني رقم 15/2026 - تنظيم الاقتصاد الرقمي',
      severity: 'info',
      description: 'New regulation governing digital economy activities published in Official Gazette',
      affectedLaws: ['RD 18/2019 Foreign Investment', 'RD 50/2022 Data Protection'],
      recommendedAction: 'Review for conflicts with existing digital commerce regulations',
      timestamp: new Date(),
    },
    {
      id: 'alert-002',
      type: 'conflict_detected',
      title: 'Potential Conflict: Labor Law Amendment',
      titleArabic: 'تعارض محتمل: تعديل قانون العمل',
      severity: 'warning',
      description: 'Proposed amendment to RD 35/2003 may conflict with SME support provisions',
      affectedLaws: ['RD 35/2003 Labor Law', 'MD 98/2023 SME Regulations'],
      recommendedAction: 'Conduct full RIA before proceeding with amendment',
      timestamp: new Date(),
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  getVision2040Pillars,
  getKeyOmaniLaws,
};
