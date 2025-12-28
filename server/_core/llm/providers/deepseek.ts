/**
 * Ruzn-Lite LLM Orchestration Layer - DeepSeek Provider
 * 
 * Implementation for DeepSeek R1 (reasoner) and V3 models.
 * DeepSeek excels at Arabic language and complex reasoning.
 */

import { BaseLLMProvider } from './base';
import { LLMRequest, LLMResponse, ModelConfig, StreamChunk } from '../types';

export class DeepSeekProvider extends BaseLLMProvider {
  constructor(config: ModelConfig) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    super(config, apiKey, 'https://api.deepseek.com/v1');
  }

  async invoke(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.modelId,
        messages: request.messages,
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature ?? 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('DeepSeek returned empty response');
    }

    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'deepseek',
      model: this.config.modelId,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalCost: this.calculateCost(usage.prompt_tokens, usage.completion_tokens)
      },
      latencyMs: Date.now() - startTime
    };
  }

  async *invokeStream(request: LLMRequest): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.modelId,
        messages: request.messages,
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature ?? 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek stream error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          yield { content: '', done: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          
          if (!trimmed || trimmed === 'data: [DONE]') {
            continue;
          }
          
          if (trimmed.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(trimmed.slice(6));
              const content = chunk.choices?.[0]?.delta?.content;
              
              if (content) {
                yield { content, done: false };
              }
            } catch (parseError) {
              // Skip malformed JSON chunks
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
