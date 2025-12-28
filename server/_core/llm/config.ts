/**
 * Ruzn-Lite LLM Orchestration Layer - Model Configurations
 * 
 * Contains all supported model configurations and provider API endpoints.
 * Update costs periodically as pricing changes.
 */

import { ModelConfig, ModelProvider } from './types';

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // KIMI (Moonshot AI)
  // ═══════════════════════════════════════════════════════════════
  'kimi-k2': {
    provider: 'kimi',
    modelId: 'kimi-k2-0711-preview',
    displayName: 'Kimi k2',
    maxTokens: 8192,
    contextWindow: 131072,  // 128K
    inputCostPer1M: 1.50,
    outputCostPer1M: 2.00,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'good',
    reasoningStrength: 'good',
    avgLatencyMs: 2500
  },

  // ═══════════════════════════════════════════════════════════════
  // DEEPSEEK
  // ═══════════════════════════════════════════════════════════════
  'deepseek-r1': {
    provider: 'deepseek',
    modelId: 'deepseek-reasoner',
    displayName: 'DeepSeek R1 (Reasoner)',
    maxTokens: 8192,
    contextWindow: 65536,  // 64K
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    supportsStreaming: true,
    supportsTools: false,  // R1 doesn't support function calling
    arabicQuality: 'excellent',
    reasoningStrength: 'excellent',
    avgLatencyMs: 5000  // Slower due to reasoning
  },

  'deepseek-v3': {
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    displayName: 'DeepSeek V3',
    maxTokens: 8192,
    contextWindow: 65536,
    inputCostPer1M: 0.27,
    outputCostPer1M: 1.10,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'excellent',
    reasoningStrength: 'good',
    avgLatencyMs: 1500
  },

  // ═══════════════════════════════════════════════════════════════
  // OPENAI
  // ═══════════════════════════════════════════════════════════════
  'gpt-5.2': {
    provider: 'openai',
    modelId: 'gpt-5.2-turbo',  // Update when released
    displayName: 'GPT-5.2 Turbo',
    maxTokens: 16384,
    contextWindow: 131072,
    inputCostPer1M: 5.00,
    outputCostPer1M: 15.00,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'excellent',
    reasoningStrength: 'excellent',
    avgLatencyMs: 1200
  },

  'gpt-4o': {
    provider: 'openai',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 16384,
    contextWindow: 128000,
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'excellent',
    reasoningStrength: 'excellent',
    avgLatencyMs: 1000
  },

  // ═══════════════════════════════════════════════════════════════
  // GOOGLE GEMINI
  // ═══════════════════════════════════════════════════════════════
  'gemini-2.5-flash': {
    provider: 'gemini',
    modelId: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    maxTokens: 32768,
    contextWindow: 1048576,  // 1M tokens!
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'good',
    reasoningStrength: 'good',
    avgLatencyMs: 800
  },

  'gemini-2.5-pro': {
    provider: 'gemini',
    modelId: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    maxTokens: 32768,
    contextWindow: 1048576,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'excellent',
    reasoningStrength: 'excellent',
    avgLatencyMs: 1500
  },

  // ═══════════════════════════════════════════════════════════════
  // ANTHROPIC CLAUDE
  // ═══════════════════════════════════════════════════════════════
  'claude-4-sonnet': {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
    displayName: 'Claude 4 Sonnet',
    maxTokens: 8192,
    contextWindow: 200000,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'excellent',
    reasoningStrength: 'excellent',
    avgLatencyMs: 1500
  },

  'claude-4-opus': {
    provider: 'anthropic',
    modelId: 'claude-opus-4-20250514',
    displayName: 'Claude 4 Opus',
    maxTokens: 8192,
    contextWindow: 200000,
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    supportsStreaming: true,
    supportsTools: true,
    arabicQuality: 'excellent',
    reasoningStrength: 'excellent',
    avgLatencyMs: 2000
  }
};

// Environment variable mapping for each provider
export const PROVIDER_ENV_KEYS: Record<ModelProvider, string> = {
  kimi: 'KIMI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY'
};

// API base URLs for each provider
export const PROVIDER_BASE_URLS: Record<ModelProvider, string> = {
  kimi: 'https://api.moonshot.cn/v1',
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com/v1'
};

// Get available models for a specific provider
export function getModelsForProvider(provider: ModelProvider): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter(config => config.provider === provider);
}

// Get model by ID
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS[modelId];
}

// Check if a provider has its API key configured
export function isProviderConfigured(provider: ModelProvider): boolean {
  const envKey = PROVIDER_ENV_KEYS[provider];
  return !!process.env[envKey];
}
