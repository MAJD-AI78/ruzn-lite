/**
 * Ruzn-Lite LLM Orchestration Layer - Core Types
 * 
 * This file defines all types used by the multi-model LLM orchestration system.
 */

export type ModelProvider = 'kimi' | 'deepseek' | 'openai' | 'gemini' | 'anthropic';

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  displayName: string;
  maxTokens: number;
  contextWindow: number;
  inputCostPer1M: number;  // USD per 1M input tokens
  outputCostPer1M: number; // USD per 1M output tokens
  supportsStreaming: boolean;
  supportsTools: boolean;
  arabicQuality: 'excellent' | 'good' | 'fair';
  reasoningStrength: 'excellent' | 'good' | 'fair';
  avgLatencyMs: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  preferredProvider?: ModelProvider;
  taskType?: 'complaints' | 'legislative' | 'general';
  language?: 'arabic' | 'english';
}

export interface LLMResponse {
  content: string;
  provider: ModelProvider;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  latencyMs: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface ProviderHealth {
  isHealthy: boolean;
  lastError?: string;
  failureCount: number;
  lastChecked: number;
  avgLatency: number;
}

export interface UsageStats {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  requestCount: number;
}
