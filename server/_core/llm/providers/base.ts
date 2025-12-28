/**
 * Ruzn-Lite LLM Orchestration Layer - Base Provider
 * 
 * Abstract base class for all LLM provider implementations.
 * All providers must extend this class.
 */

import { LLMRequest, LLMResponse, ModelConfig, StreamChunk } from '../types';

export abstract class BaseLLMProvider {
  protected config: ModelConfig;
  protected apiKey: string;
  protected baseUrl: string;

  constructor(config: ModelConfig, apiKey: string, baseUrl: string) {
    this.config = config;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Invoke the LLM with a request and get a complete response
   */
  abstract invoke(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Invoke the LLM with streaming response
   */
  abstract invokeStream(request: LLMRequest): AsyncGenerator<StreamChunk>;

  /**
   * Calculate cost based on token usage
   */
  protected calculateCost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1_000_000) * this.config.inputCostPer1M +
      (outputTokens / 1_000_000) * this.config.outputCostPer1M
    );
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  protected estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    // ~2 characters per token for Arabic (more complex script)
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = text.length - arabicChars;
    return Math.ceil(englishChars / 4 + arabicChars / 2);
  }

  /**
   * Get the model configuration
   */
  getConfig(): ModelConfig {
    return this.config;
  }

  /**
   * Check if this provider supports a specific feature
   */
  supportsFeature(feature: 'streaming' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
        return this.config.supportsStreaming;
      case 'tools':
        return this.config.supportsTools;
      default:
        return false;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.config.provider;
  }

  /**
   * Get model ID
   */
  getModelId(): string {
    return this.config.modelId;
  }
}
