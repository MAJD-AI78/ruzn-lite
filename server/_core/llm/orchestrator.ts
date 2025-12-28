/**
 * Ruzn-Lite LLM Orchestration Layer - Main Orchestrator
 * 
 * Intelligent routing, fallback management, and cost tracking
 * for multi-model LLM support.
 */

import { LLMRequest, LLMResponse, ModelProvider, ProviderHealth, StreamChunk, UsageStats } from './types';
import { MODEL_CONFIGS, isProviderConfigured, getModelConfig } from './config';
import { BaseLLMProvider } from './providers/base';
import { DeepSeekProvider } from './providers/deepseek';
// Import other providers as implemented:
// import { OpenAIProvider } from './providers/openai';
// import { GeminiProvider } from './providers/gemini';
// import { KimiProvider } from './providers/kimi';
// import { AnthropicProvider } from './providers/anthropic';

// Optional Redis for production (falls back to in-memory for dev)
let redis: any = null;
try {
  if (process.env.REDIS_URL) {
    const { Redis } = require('ioredis');
    redis = new Redis(process.env.REDIS_URL);
  }
} catch {
  console.warn('Redis not available, using in-memory tracking');
}

// In-memory fallback for usage tracking
const inMemoryUsage: Map<string, UsageStats> = new Map();

export class LLMOrchestrator {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private healthStatus: Map<string, ProviderHealth> = new Map();
  
  // Enabled providers allowlist (from LLM_ENABLED_PROVIDERS env)
  // Only providers in this list will be initialized and used
  private enabledProviders: Set<string>;
  
  // Routing priority by task type and language
  // Models are tried in order until one succeeds
  private routingRules: Record<string, string[]> = {
    // Arabic complaints - prioritize Arabic quality & reasoning
    'complaints:arabic': ['deepseek-r1', 'claude-4-sonnet', 'gpt-5.2', 'gpt-4o', 'kimi-k2', 'gemini-2.5-flash'],
    
    // English complaints
    'complaints:english': ['gpt-5.2', 'gpt-4o', 'claude-4-sonnet', 'deepseek-r1', 'kimi-k2', 'gemini-2.5-flash'],
    
    // Legislative queries - need strong reasoning for legal analysis
    'legislative:arabic': ['deepseek-r1', 'claude-4-sonnet', 'gpt-5.2', 'kimi-k2', 'gemini-2.5-pro'],
    'legislative:english': ['gpt-5.2', 'claude-4-sonnet', 'deepseek-r1', 'kimi-k2', 'gemini-2.5-pro'],
    
    // General queries - optimize for cost while maintaining quality
    'general:arabic': ['gemini-2.5-flash', 'deepseek-v3', 'deepseek-r1', 'kimi-k2', 'gpt-4o'],
    'general:english': ['gemini-2.5-flash', 'gpt-4o', 'kimi-k2', 'deepseek-v3', 'claude-4-sonnet']
  };

  constructor() {
    // Parse LLM_ENABLED_PROVIDERS (comma-separated list)
    // Default to all providers if not specified
    const enabledList = process.env.LLM_ENABLED_PROVIDERS;
    if (enabledList) {
      this.enabledProviders = new Set(
        enabledList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      );
      console.log(`LLM_ENABLED_PROVIDERS: ${Array.from(this.enabledProviders).join(', ')}`);
    } else {
      // If not specified, enable all providers
      this.enabledProviders = new Set(['deepseek', 'openai', 'gemini', 'kimi', 'anthropic']);
    }
    
    this.initializeProviders();
    this.startHealthMonitoring();
  }

  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    const initialized: string[] = [];

    // DeepSeek - only if enabled
    if (this.enabledProviders.has('deepseek') && isProviderConfigured('deepseek')) {
      try {
        this.providers.set('deepseek-r1', new DeepSeekProvider(MODEL_CONFIGS['deepseek-r1']));
        this.providers.set('deepseek-v3', new DeepSeekProvider(MODEL_CONFIGS['deepseek-v3']));
        this.initHealth('deepseek-r1');
        this.initHealth('deepseek-v3');
        initialized.push('deepseek-r1', 'deepseek-v3');
      } catch (e) {
        console.error('Failed to initialize DeepSeek:', e);
      }
    }

    // OpenAI - uncomment when provider is implemented
    // if (isProviderConfigured('openai')) {
    //   try {
    //     this.providers.set('gpt-5.2', new OpenAIProvider(MODEL_CONFIGS['gpt-5.2']));
    //     this.providers.set('gpt-4o', new OpenAIProvider(MODEL_CONFIGS['gpt-4o']));
    //     this.initHealth('gpt-5.2');
    //     this.initHealth('gpt-4o');
    //     initialized.push('gpt-5.2', 'gpt-4o');
    //   } catch (e) {
    //     console.error('Failed to initialize OpenAI:', e);
    //   }
    // }

    // Gemini - uncomment when provider is implemented
    // if (isProviderConfigured('gemini') || process.env.BUILT_IN_FORGE_API_KEY) {
    //   try {
    //     this.providers.set('gemini-2.5-flash', new GeminiProvider(MODEL_CONFIGS['gemini-2.5-flash']));
    //     this.initHealth('gemini-2.5-flash');
    //     initialized.push('gemini-2.5-flash');
    //   } catch (e) {
    //     console.error('Failed to initialize Gemini:', e);
    //   }
    // }

    // Kimi - uncomment when provider is implemented
    // if (isProviderConfigured('kimi')) {
    //   try {
    //     this.providers.set('kimi-k2', new KimiProvider(MODEL_CONFIGS['kimi-k2']));
    //     this.initHealth('kimi-k2');
    //     initialized.push('kimi-k2');
    //   } catch (e) {
    //     console.error('Failed to initialize Kimi:', e);
    //   }
    // }

    // Anthropic - uncomment when provider is implemented
    // if (isProviderConfigured('anthropic')) {
    //   try {
    //     this.providers.set('claude-4-sonnet', new AnthropicProvider(MODEL_CONFIGS['claude-4-sonnet']));
    //     this.initHealth('claude-4-sonnet');
    //     initialized.push('claude-4-sonnet');
    //   } catch (e) {
    //     console.error('Failed to initialize Anthropic:', e);
    //   }
    // }

    // ═══════════════════════════════════════════════════════════════
    // STARTUP VALIDATION: Ensure at least one provider is available
    // ═══════════════════════════════════════════════════════════════
    
    // Remove any enabled providers that aren't actually implemented
    const implementedProviders = new Set(
      Array.from(this.providers.keys()).map(id => {
        const config = getModelConfig(id);
        return config?.provider;
      }).filter(Boolean)
    );
    
    // Check intersection of enabled and implemented
    const availableProviders = [...this.enabledProviders].filter(p => implementedProviders.has(p as any));
    
    if (initialized.length === 0 || availableProviders.length === 0) {
      const msg = `No LLM providers enabled AND implemented. ` +
        `Enabled: [${[...this.enabledProviders].join(', ')}], ` +
        `Implemented: [${[...implementedProviders].join(', ')}]. ` +
        `Set LLM_ENABLED_PROVIDERS to include an implemented provider (currently: deepseek).`;
      
      console.error(`❌ ${msg}`);
      throw new Error(msg);
    }
    
    console.log(`✅ Initialized ${initialized.length} LLM models: ${initialized.join(', ')}`);
    console.log(`   Enabled providers: ${[...this.enabledProviders].join(', ')}`);
  }

  /**
   * Initialize health status for a model
   */
  private initHealth(modelId: string): void {
    const config = getModelConfig(modelId);
    this.healthStatus.set(modelId, {
      isHealthy: true,
      failureCount: 0,
      lastChecked: Date.now(),
      avgLatency: config?.avgLatencyMs || 2000
    });
  }

  /**
   * Start background health monitoring
   */
  private startHealthMonitoring(): void {
    // Check provider health every 30 seconds
    setInterval(() => this.checkAllProvidersHealth(), 30_000);
  }

  /**
   * Check health of all providers
   */
  private async checkAllProvidersHealth(): Promise<void> {
    for (const [modelId, provider] of Array.from(this.providers)) {
      try {
        const startTime = Date.now();
        
        // Simple health check - minimal token response
        await provider.invoke({
          messages: [{ role: 'user', content: 'Hi' }],
          maxTokens: 5
        });
        
        const latency = Date.now() - startTime;
        const health = this.healthStatus.get(modelId)!;
        
        // Update with exponential moving average for latency
        this.healthStatus.set(modelId, {
          isHealthy: true,
          failureCount: 0,
          lastChecked: Date.now(),
          avgLatency: (health.avgLatency * 0.7) + (latency * 0.3)
        });
      } catch (error) {
        const health = this.healthStatus.get(modelId)!;
        const newFailureCount = health.failureCount + 1;
        
        this.healthStatus.set(modelId, {
          ...health,
          isHealthy: newFailureCount < 3, // Mark unhealthy after 3 consecutive failures
          failureCount: newFailureCount,
          lastChecked: Date.now(),
          lastError: String(error)
        });
        
        console.warn(`Health check failed for ${modelId}:`, error);
      }
    }
  }

  /**
   * Check if a provider is currently healthy
   */
  private isProviderHealthy(modelId: string): boolean {
    const health = this.healthStatus.get(modelId);
    if (!health) return false;
    
    // Auto-recover: Reset health after 5 minutes of being unhealthy
    if (!health.isHealthy && Date.now() - health.lastChecked > 300_000) {
      this.healthStatus.set(modelId, { ...health, isHealthy: true, failureCount: 0 });
      return true;
    }
    
    return health.isHealthy;
  }

  /**
   * Select the best model for a request
   */
  private selectModel(request: LLMRequest): string {
    // If specific provider requested, try to use it
    if (request.preferredProvider) {
      const modelIds = Array.from(this.providers.keys())
        .filter(id => getModelConfig(id)?.provider === request.preferredProvider);
      
      for (const modelId of modelIds) {
        if (this.isProviderHealthy(modelId)) {
          return modelId;
        }
      }
      console.warn(`Preferred provider ${request.preferredProvider} unavailable, falling back`);
    }

    // Route based on task type and language
    const taskType = request.taskType || 'general';
    const language = request.language || this.detectLanguage(request.messages);
    const routeKey = `${taskType}:${language}`;

    const priorityList = this.routingRules[routeKey] || this.routingRules['general:english'];

    // Find first healthy provider from priority list
    for (const modelId of priorityList) {
      if (this.providers.has(modelId) && this.isProviderHealthy(modelId)) {
        return modelId;
      }
    }

    // Last resort: any healthy provider
    for (const [modelId] of Array.from(this.providers)) {
      if (this.isProviderHealthy(modelId)) {
        console.warn(`Using fallback provider: ${modelId}`);
        return modelId;
      }
    }

    throw new Error('No healthy LLM providers available');
  }

  /**
   * Detect language from messages (Arabic vs English)
   */
  private detectLanguage(messages: { role: string; content: string }[]): 'arabic' | 'english' {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) return 'english';
    
    const arabicChars = (lastUserMessage.content.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = lastUserMessage.content.length;
    
    return arabicChars / totalChars > 0.3 ? 'arabic' : 'english';
  }

  /**
   * Invoke LLM with automatic model selection and fallback
   */
  async invoke(request: LLMRequest): Promise<LLMResponse> {
    const selectedModel = this.selectModel(request);
    const provider = this.providers.get(selectedModel)!;
    
    const maxRetries = 3;
    let lastError: Error | null = null;
    const triedModels = new Set<string>();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const currentModel = attempt === 1 ? selectedModel : this.selectModelExcluding(request, triedModels);
      triedModels.add(currentModel);
      
      const currentProvider = this.providers.get(currentModel)!;

      try {
        const response = await currentProvider.invoke(request);
        
        // Track usage for cost monitoring
        await this.trackUsage(currentModel, response.usage);
        
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`LLM invoke failed for ${currentModel} (attempt ${attempt}):`, error);
        
        // Mark provider as having issues
        const health = this.healthStatus.get(currentModel)!;
        this.healthStatus.set(currentModel, {
          ...health,
          failureCount: health.failureCount + 1,
          lastError: String(error)
        });
      }
    }

    throw lastError || new Error('All LLM providers failed');
  }

  /**
   * Select a model excluding already tried ones
   */
  private selectModelExcluding(request: LLMRequest, exclude: Set<string>): string {
    const taskType = request.taskType || 'general';
    const language = request.language || 'english';
    const routeKey = `${taskType}:${language}`;
    const priorityList = this.routingRules[routeKey] || this.routingRules['general:english'];

    for (const modelId of priorityList) {
      if (!exclude.has(modelId) && this.providers.has(modelId) && this.isProviderHealthy(modelId)) {
        return modelId;
      }
    }

    // Fallback to any available model
    for (const [modelId] of Array.from(this.providers)) {
      if (!exclude.has(modelId) && this.isProviderHealthy(modelId)) {
        return modelId;
      }
    }

    throw new Error('No more healthy providers to try');
  }

  /**
   * Invoke LLM with streaming response
   */
  async *invokeStream(request: LLMRequest): AsyncGenerator<StreamChunk> {
    const modelId = this.selectModel(request);
    const provider = this.providers.get(modelId)!;

    try {
      yield* provider.invokeStream(request);
    } catch (error) {
      console.error(`Stream failed for ${modelId}:`, error);
      
      // Mark provider as having issues
      const health = this.healthStatus.get(modelId)!;
      this.healthStatus.set(modelId, {
        ...health,
        failureCount: health.failureCount + 1,
        lastError: String(error)
      });

      // Try fallback provider
      const fallbackModel = this.selectModelExcluding(request, new Set([modelId]));
      const fallbackProvider = this.providers.get(fallbackModel)!;
      
      console.warn(`Falling back to ${fallbackModel} for streaming`);
      yield* fallbackProvider.invokeStream(request);
    }
  }

  /**
   * Track usage for cost monitoring
   */
  private async trackUsage(modelId: string, usage: LLMResponse['usage']): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `llm:usage:${today}:${modelId}`;
    
    if (redis) {
      await redis.hincrby(key, 'inputTokens', usage.inputTokens);
      await redis.hincrby(key, 'outputTokens', usage.outputTokens);
      await redis.hincrbyfloat(key, 'totalCost', usage.totalCost);
      await redis.hincrby(key, 'requestCount', 1);
      await redis.expire(key, 86400 * 90); // Keep 90 days
    } else {
      // In-memory fallback
      const existing = inMemoryUsage.get(key) || {
        date: today,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        requestCount: 0
      };
      
      inMemoryUsage.set(key, {
        date: today,
        inputTokens: existing.inputTokens + usage.inputTokens,
        outputTokens: existing.outputTokens + usage.outputTokens,
        totalCost: existing.totalCost + usage.totalCost,
        requestCount: existing.requestCount + 1
      });
    }
  }

  /**
   * Get usage statistics for the last N days
   */
  async getUsageStats(days: number = 7): Promise<Record<string, UsageStats[]>> {
    const stats: Record<string, UsageStats[]> = {};
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      for (const modelId of Array.from(this.providers.keys())) {
        const key = `llm:usage:${dateStr}:${modelId}`;
        
        let data: Record<string, string> = {};
        
        if (redis) {
          data = await redis.hgetall(key);
        } else {
          const memData = inMemoryUsage.get(key);
          if (memData) {
            data = {
              inputTokens: String(memData.inputTokens),
              outputTokens: String(memData.outputTokens),
              totalCost: String(memData.totalCost),
              requestCount: String(memData.requestCount)
            };
          }
        }
        
        if (Object.keys(data).length > 0) {
          if (!stats[modelId]) stats[modelId] = [];
          stats[modelId].push({
            date: dateStr,
            inputTokens: parseInt(data.inputTokens || '0'),
            outputTokens: parseInt(data.outputTokens || '0'),
            totalCost: parseFloat(data.totalCost || '0'),
            requestCount: parseInt(data.requestCount || '0')
          });
        }
      }
    }

    return stats;
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get health status of all providers
   */
  getProviderHealth(): Record<string, ProviderHealth> {
    const result: Record<string, ProviderHealth> = {};
    for (const [modelId, health] of Array.from(this.healthStatus)) {
      result[modelId] = { ...health };
    }
    return result;
  }

  /**
   * Get estimated cost for a request (before invoking)
   */
  estimateCost(request: LLMRequest, modelId?: string): number {
    const model = modelId || this.selectModel(request);
    const config = getModelConfig(model);
    
    if (!config) return 0;
    
    // Estimate input tokens from messages
    const inputText = request.messages.map(m => m.content).join(' ');
    const inputTokens = Math.ceil(inputText.length / 4); // Rough estimate
    const outputTokens = request.maxTokens || config.maxTokens;
    
    return (
      (inputTokens / 1_000_000) * config.inputCostPer1M +
      (outputTokens / 1_000_000) * config.outputCostPer1M
    );
  }
}

// Export singleton instance
export const llmOrchestrator = new LLMOrchestrator();
