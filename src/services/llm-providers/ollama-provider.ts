import { BaseLLMProvider, LLMRequest, LLMResponse, LLMProvider, ProviderConfig } from './types';

export class OllamaProvider extends BaseLLMProvider {
  private lastRequest = 0;
  private requestCount = 0;

  constructor(config: LLMProvider, providerConfig: ProviderConfig) {
    super(config, providerConfig);
  }

  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded for Ollama provider');
    }

    const systemPrompt = this.buildSystemPrompt(request.context);
    const prompt = this.formatErrorForAI(request.prompt, request.context);

    try {
      const baseUrl = this.providerConfig.baseUrl || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: `${systemPrompt}\n\n${prompt}`,
          temperature: request.temperature || this.config.temperature,
          options: {
            num_predict: request.maxTokens || this.config.maxTokens
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      this.requestCount++;
      this.lastRequest = Date.now();

      return {
        content: data.response,
        provider: 'ollama',
        model: this.config.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        metadata: this.parseOllamaResponse(data.response)
      };
    } catch (error) {
      throw new Error(`Ollama provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const baseUrl = this.providerConfig.baseUrl || 'http://localhost:11434';
      
      // First, check if Ollama is running
      const healthResponse = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!healthResponse.ok) {
        return false;
      }

      const models = await healthResponse.json();
      
      // Check if our model is available
      const modelExists = models.models?.some((model: any) => 
        model.name === this.config.model || model.name.startsWith(this.config.model)
      );

      if (!modelExists) {
        console.warn(`Model ${this.config.model} not found in Ollama. Available models:`, 
          models.models?.map((m: any) => m.name) || []);
        return false;
      }

      // Test with a simple request
      const testRequest: LLMRequest = {
        prompt: 'Hello, can you confirm this connection is working?',
        maxTokens: 50
      };
      
      const response = await this.sendRequest(testRequest);
      return response.content.length > 0;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  isRateLimited(): boolean {
    // Ollama runs locally, so rate limiting is less of a concern
    // but we can still implement basic throttling
    if (!this.config.rateLimit) return false;

    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (now - this.lastRequest > oneMinute) {
      this.requestCount = 0;
      return false;
    }

    return this.requestCount >= this.config.rateLimit.requestsPerMinute;
  }

  private parseOllamaResponse(content: string): {
    confidence?: number;
    suggestions?: string[];
    followUpQuestions?: string[];
    reasoning?: string;
  } {
    const metadata: any = {};

    // Extract confidence if mentioned
    const confidenceMatch = content.match(/confidence.*?(\d+)\/10|(\d+)%/i);
    if (confidenceMatch) {
      const score = parseInt(confidenceMatch[1] || confidenceMatch[2]);
      metadata.confidence = confidenceMatch[1] ? score / 10 : score / 100;
    }

    // Extract numbered suggestions
    const suggestionMatches = content.match(/^\d+\.\s+(.+)$/gm);
    if (suggestionMatches) {
      metadata.suggestions = suggestionMatches.map(s => s.replace(/^\d+\.\s+/, ''));
    }

    // Extract reasoning sections
    const reasoningMatch = content.match(/(?:analysis|reasoning|explanation):\s*(.+?)(?:\n\n|\n[A-Z])/is);
    if (reasoningMatch) {
      metadata.reasoning = reasoningMatch[1].trim();
    }

    // Generate contextual follow-up questions based on content
    if (content.includes('code') || content.includes('function')) {
      metadata.followUpQuestions = [
        'Would you like me to explain any part of this code?',
        'Do you need help with testing this solution?'
      ];
    } else if (content.includes('error') || content.includes('issue')) {
      metadata.followUpQuestions = [
        'Would you like help debugging this further?',
        'Should we check for related issues in your codebase?'
      ];
    }

    return metadata;
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    return this.sendRequest(request);
  }

  async *streamResponse(request: LLMRequest): AsyncIterable<string> {
    const baseUrl = this.providerConfig.baseUrl || 'http://localhost:11434';
    const systemPrompt = this.buildSystemPrompt(request.context);
    const prompt = this.formatErrorForAI(request.prompt, request.context);

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: `${systemPrompt}\n\n${prompt}`,
          temperature: request.temperature || this.config.temperature,
          options: {
            num_predict: request.maxTokens || this.config.maxTokens
          },
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield data.response;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Ollama streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const baseUrl = this.providerConfig.baseUrl || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models from Ollama');
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to get Ollama models:', error);
      return [];
    }
  }

  // Ollama-specific method for pulling models
  async pullModel(modelName: string): Promise<boolean> {
    try {
      const baseUrl = this.providerConfig.baseUrl || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to pull Ollama model:', error);
      return false;
    }
  }

  // Ollama-specific method for model info
  async getModelInfo(modelName?: string): Promise<any> {
    try {
      const baseUrl = this.providerConfig.baseUrl || 'http://localhost:11434';
      const model = modelName || this.config.model;
      
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: model
        })
      });

      if (!response.ok) {
        throw new Error('Model not found');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Ollama model info:', error);
      return null;
    }
  }
}