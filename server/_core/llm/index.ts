/**
 * Ruzn-Lite LLM Orchestration Layer
 * 
 * Multi-model LLM support with intelligent routing, fallback management,
 * and cost tracking for Kimi-k2, DeepSeek, OpenAI GPT-5.2, Gemini, and Claude.
 * 
 * Usage:
 * ```typescript
 * import { llmOrchestrator } from './_core/llm';
 * 
 * // Simple invocation (auto-selects best model)
 * const response = await llmOrchestrator.invoke({
 *   messages: [
 *     { role: 'system', content: systemPrompt },
 *     { role: 'user', content: userMessage }
 *   ],
 *   taskType: 'complaints',
 *   language: 'arabic'
 * });
 * 
 * // Streaming
 * for await (const chunk of llmOrchestrator.invokeStream(request)) {
 *   process.stdout.write(chunk.content);
 * }
 * 
 * // Get usage stats
 * const stats = await llmOrchestrator.getUsageStats(7);
 * ```
 */

// Main orchestrator
export { llmOrchestrator, LLMOrchestrator } from './orchestrator';

// Types
export type {
  ModelProvider,
  ModelConfig,
  Message,
  LLMRequest,
  LLMResponse,
  StreamChunk,
  ProviderHealth,
  UsageStats
} from './types';

// Configuration
export {
  MODEL_CONFIGS,
  PROVIDER_ENV_KEYS,
  PROVIDER_BASE_URLS,
  getModelsForProvider,
  getModelConfig,
  isProviderConfigured
} from './config';

// Base provider (for extending)
export { BaseLLMProvider } from './providers/base';

// Individual providers
export { DeepSeekProvider } from './providers/deepseek';
// Uncomment as implemented:
// export { OpenAIProvider } from './providers/openai';
// export { GeminiProvider } from './providers/gemini';
// export { KimiProvider } from './providers/kimi';
// export { AnthropicProvider } from './providers/anthropic';
