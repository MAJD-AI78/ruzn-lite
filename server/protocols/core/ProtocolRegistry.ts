/**
 * ACUTERIUM TECHNOLOGIES - PROTOCOL REGISTRY
 * 
 * Singleton registry for managing all EREBUS protocol instances.
 * Handles protocol registration, retrieval, and lifecycle management.
 * 
 * @module ProtocolRegistry
 * @version 1.0.0
 */

import { BaseProtocol, ProtocolMetadata } from './BaseProtocol';

interface RegisteredProtocol {
  instance: BaseProtocol<any, any>;
  metadata: ProtocolMetadata;
  enabled: boolean;
  registeredAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

export class ProtocolRegistry {
  private static instance: ProtocolRegistry;
  private protocols: Map<string, RegisteredProtocol> = new Map();

  private constructor() {
    console.log('[ProtocolRegistry] Initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProtocolRegistry {
    if (!ProtocolRegistry.instance) {
      ProtocolRegistry.instance = new ProtocolRegistry();
    }
    return ProtocolRegistry.instance;
  }

  /**
   * Register a protocol
   */
  register<TInput, TOutput>(
    protocolId: string,
    protocol: BaseProtocol<TInput, TOutput>,
    enabled: boolean = true
  ): void {
    if (this.protocols.has(protocolId)) {
      console.warn(`[ProtocolRegistry] Protocol ${protocolId} already registered, updating...`);
    }

    this.protocols.set(protocolId, {
      instance: protocol,
      metadata: protocol.getMetadata(),
      enabled,
      registeredAt: new Date(),
      executionCount: 0,
    });

    console.log(`[ProtocolRegistry] Registered: ${protocolId} (${enabled ? 'enabled' : 'disabled'})`);
  }

  /**
   * Get a protocol by ID
   */
  get<TInput, TOutput>(protocolId: string): BaseProtocol<TInput, TOutput> | null {
    const registered = this.protocols.get(protocolId);
    if (!registered) {
      console.warn(`[ProtocolRegistry] Protocol ${protocolId} not found`);
      return null;
    }
    if (!registered.enabled) {
      console.warn(`[ProtocolRegistry] Protocol ${protocolId} is disabled`);
      return null;
    }
    return registered.instance as BaseProtocol<TInput, TOutput>;
  }

  /**
   * Get all enabled protocols
   */
  getAllEnabled(): ProtocolMetadata[] {
    return Array.from(this.protocols.values())
      .filter(p => p.enabled)
      .map(p => p.metadata);
  }

  /**
   * Get all protocols (enabled and disabled)
   */
  getAll(): ProtocolMetadata[] {
    return Array.from(this.protocols.values()).map(p => p.metadata);
  }

  /**
   * Enable or disable a protocol
   */
  setEnabled(protocolId: string, enabled: boolean): boolean {
    const protocol = this.protocols.get(protocolId);
    if (protocol) {
      protocol.enabled = enabled;
      console.log(`[ProtocolRegistry] ${protocolId} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Check if a protocol exists and is enabled
   */
  isAvailable(protocolId: string): boolean {
    const protocol = this.protocols.get(protocolId);
    return protocol !== undefined && protocol.enabled;
  }

  /**
   * Record protocol execution
   */
  recordExecution(protocolId: string): void {
    const protocol = this.protocols.get(protocolId);
    if (protocol) {
      protocol.lastExecuted = new Date();
      protocol.executionCount++;
    }
  }

  /**
   * Get protocol statistics
   */
  getStats(protocolId: string): {
    executionCount: number;
    lastExecuted?: Date;
    enabled: boolean;
  } | null {
    const protocol = this.protocols.get(protocolId);
    if (!protocol) return null;
    
    return {
      executionCount: protocol.executionCount,
      lastExecuted: protocol.lastExecuted,
      enabled: protocol.enabled,
    };
  }

  /**
   * Get registry summary
   */
  getSummary(): {
    total: number;
    enabled: number;
    disabled: number;
    protocols: string[];
  } {
    const all = Array.from(this.protocols.values());
    return {
      total: all.length,
      enabled: all.filter(p => p.enabled).length,
      disabled: all.filter(p => !p.enabled).length,
      protocols: Array.from(this.protocols.keys()),
    };
  }

  /**
   * Unregister a protocol
   */
  unregister(protocolId: string): boolean {
    if (this.protocols.has(protocolId)) {
      this.protocols.delete(protocolId);
      console.log(`[ProtocolRegistry] Unregistered: ${protocolId}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all protocols (for testing)
   */
  clear(): void {
    this.protocols.clear();
    console.log('[ProtocolRegistry] All protocols cleared');
  }
}

// Export singleton instance
export const protocolRegistry = ProtocolRegistry.getInstance();
