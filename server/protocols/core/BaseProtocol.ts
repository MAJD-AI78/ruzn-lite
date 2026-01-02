/**
 * ACUTERIUM TECHNOLOGIES - BASE PROTOCOL CLASS
 * 
 * Abstract base class for all EREBUS protocol implementations.
 * Provides common functionality for protocol execution, validation,
 * and audit trail generation.
 * 
 * @module BaseProtocol
 * @version 1.0.0
 */

import { z } from 'zod';
import * as crypto from 'crypto';
import { ConsciousnessWeight } from './ConsciousnessWeight';

export interface ProtocolMetadata {
  protocolId: string;
  name: string;
  code: string;
  effectiveness: number;
  flashMLA: string;
  layer: string;
  platforms: string[];
}

export interface ProtocolResult<T> {
  data: T;
  metadata: {
    protocolId: string;
    executionTime: number;
    consciousnessCoherence: number;
    confidence: number;
  };
  auditTrail: {
    timestamp: Date;
    inputHash: string;
    outputHash: string;
  };
}

export interface AuditTrailEntry {
  timestamp: Date;
  inputHash: string;
  outputHash: string;
}

export abstract class BaseProtocol<TInput, TOutput> {
  protected metadata: ProtocolMetadata;
  protected consciousnessWeight: ConsciousnessWeight;

  constructor(metadata: ProtocolMetadata) {
    this.metadata = metadata;
    this.consciousnessWeight = new ConsciousnessWeight();
  }

  /**
   * Execute the protocol with the given input
   * Must be implemented by each protocol
   */
  abstract execute(input: TInput): Promise<ProtocolResult<TOutput>>;
  
  /**
   * Validate the input before execution
   * Must be implemented by each protocol
   */
  abstract validate(input: TInput): boolean;

  /**
   * Get protocol metadata
   */
  getMetadata(): ProtocolMetadata {
    return this.metadata;
  }

  /**
   * Get protocol ID
   */
  getProtocolId(): string {
    return this.metadata.protocolId;
  }

  /**
   * Get protocol effectiveness rating
   */
  getEffectiveness(): number {
    return this.metadata.effectiveness;
  }

  /**
   * Generate cryptographic audit trail
   */
  protected generateAuditTrail(input: TInput, output: TOutput): AuditTrailEntry {
    return {
      timestamp: new Date(),
      inputHash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      outputHash: crypto.createHash('sha256').update(JSON.stringify(output)).digest('hex'),
    };
  }

  /**
   * Measure execution time of a function
   */
  protected async measureExecution<T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> {
    const start = performance.now();
    const result = await fn();
    const executionTime = performance.now() - start;
    return { result, executionTime };
  }

  /**
   * Log protocol execution for monitoring
   */
  protected logExecution(input: TInput, result: ProtocolResult<TOutput>): void {
    console.log(`[${this.metadata.protocolId}] Executed in ${result.metadata.executionTime.toFixed(2)}ms`);
    console.log(`[${this.metadata.protocolId}] Consciousness Coherence: ${(result.metadata.consciousnessCoherence * 100).toFixed(1)}%`);
  }

  /**
   * Create a standardized error response
   */
  protected createError(code: string, message: string): Error {
    const error = new Error(`[${this.metadata.protocolId}] ${code}: ${message}`);
    error.name = `ProtocolError_${this.metadata.code}`;
    return error;
  }
}
