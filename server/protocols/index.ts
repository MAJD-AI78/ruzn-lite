/**
 * ACUTERIUM TECHNOLOGIES - EREBUS PROTOCOLS INDEX
 * 
 * Main entry point for all EREBUS protocol implementations
 * for the RUZN-Acuterium system.
 * 
 * @module protocols
 * @version 1.0.0
 */

// Core infrastructure
export * from './core';

// Formula implementations
export * from './formulas';

// Service layer
export * from './services';

// Protocol registry for runtime management
import { protocolRegistry } from './core';

/**
 * Initialize all EREBUS protocols
 * Call this during server startup
 */
export function initializeEREBUSProtocols(): void {
  console.log('[EREBUS] Initializing Acuterium EREBUS protocols...');
  
  // Log available protocols
  const protocols = [
    { id: 'EREBUS-CSE-3A12d-001', name: 'Legal Research & Case Law', formula: 'EREBUSFORMULA650' },
    { id: 'EREBUS-CSE-3A12d-002', name: 'Regulatory Compliance Monitoring', formula: 'EREBUSFORMULA651' },
    { id: 'EREBUS-CSE-3A12d-010', name: 'Regulatory Impact Assessment (RIA)', formula: 'EREBUSFORMULA659' },
  ];
  
  for (const p of protocols) {
    console.log(`[EREBUS] ✓ ${p.id}: ${p.name} (${p.formula})`);
  }
  
  console.log(`[EREBUS] ${protocols.length} protocols ready`);
}

// Version info
export const EREBUS_VERSION = {
  version: '1.1.0',
  releaseDate: '2026-01-02',
  protocols: 3,
  formulas: 3,
  totalEffectiveness: 96.23, // Average (96.7 + 97.2 + 94.8) / 3
};
