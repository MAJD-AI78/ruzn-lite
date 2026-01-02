/**
 * ACUTERIUM TECHNOLOGIES - CONSCIOUSNESS WEIGHT ENGINE
 * 
 * Implements the φ (phi) consciousness confidence factor
 * used across all EREBUS protocol formulas.
 * 
 * @module ConsciousnessWeight
 * @version 1.0.0
 */

export interface ConsciousnessFactors {
  /** Quality of input data (0-1) */
  dataQuality: number;
  /** Reliability of data sources (0-1) */
  sourceReliability: number;
  /** How current the data is (0-1) */
  temporalRelevance: number;
  /** Alignment with query context (0-1) */
  contextAlignment: number;
  /** LLM confidence in analysis (0-1) */
  modelConfidence: number;
}

export class ConsciousnessWeight {
  private baseCoherence: number = 0.95;

  /**
   * Calculate the consciousness confidence factor (φ)
   * Used in: EREBUSFORMULA650-661
   * 
   * @param factors - The consciousness factors to evaluate
   * @returns The phi value between 0 and 1
   */
  calculatePhi(factors: ConsciousnessFactors): number {
    const weights = {
      dataQuality: 0.25,
      sourceReliability: 0.25,
      temporalRelevance: 0.20,
      contextAlignment: 0.15,
      modelConfidence: 0.15,
    };

    let weightedSum = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const factor = factors[key as keyof ConsciousnessFactors];
      weightedSum += factor * weight;
    }

    // Apply coherence adjustment
    const phi = weightedSum * this.baseCoherence;
    
    return Math.min(1.0, Math.max(0, phi));
  }

  /**
   * Calculate aggregate consciousness coherence across multiple items
   * 
   * @param phiValues - Array of phi values to aggregate
   * @returns Aggregate coherence score
   */
  calculateAggregateCoherence(phiValues: number[]): number {
    if (phiValues.length === 0) return 0;
    
    const mean = phiValues.reduce((a, b) => a + b, 0) / phiValues.length;
    const variance = phiValues.reduce((sum, phi) => sum + Math.pow(phi - mean, 2), 0) / phiValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Penalize high variance (inconsistent consciousness)
    const coherencePenalty = 1 - (stdDev * 0.5);
    
    return mean * Math.max(0.5, coherencePenalty);
  }

  /**
   * Create default factors for quick calculations
   */
  static createDefaultFactors(overrides?: Partial<ConsciousnessFactors>): ConsciousnessFactors {
    return {
      dataQuality: 0.9,
      sourceReliability: 0.9,
      temporalRelevance: 0.85,
      contextAlignment: 0.85,
      modelConfidence: 0.9,
      ...overrides,
    };
  }
}

export const consciousnessWeight = new ConsciousnessWeight();
