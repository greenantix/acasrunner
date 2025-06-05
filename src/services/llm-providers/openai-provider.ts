import { BaseLLMProvider, LLMRequest, LLMResponse, LLMProvider, ProviderConfig } from './types';

export class OpenAIProvider extends BaseLLMProvider {
  private lastRequest = 0;
  private requestCount = 0;

  constructor(config: LLMProvider, providerConfig: ProviderConfig) {
    super(config, providerConfig);
  }

  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded for OpenAI provider');
    }

    const systemPrompt = this.buildSystemPrompt(request.context);
    const prompt = this.formatErrorForAI(request.prompt, request.context);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.providerConfig.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      this.requestCount++;
      this.lastRequest = Date.now();

      return {
        content: data.choices[0].message.content,
        provider: 'openai',
        model: this.config.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        metadata: this.parseOpenAIResponse(data.choices[0].message.content)
      };
    } catch (error) {
      throw new Error(`OpenAI provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        prompt: 'Hello, can you confirm this connection is working?',
        maxTokens: 50
      };
      
      const response = await this.sendRequest(testRequest);
      return response.content.length > 0;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  isRateLimited(): boolean {
    if (!this.config.rateLimit) return false;

    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (now - this.lastRequest > oneMinute) {
      this.requestCount = 0;
      return false;
    }

    return this.requestCount >= this.config.rateLimit.requestsPerMinute;
  }

  private parseOpenAIResponse(content: string): {
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

    // Generate contextual follow-up questions
    if (content.includes('performance') || content.includes('optimization')) {
      metadata.followUpQuestions = [
        'What is the current performance baseline?',
        'Are there specific bottlenecks identified?'
      ];
    } else if (content.includes('security') || content.includes('vulnerability')) {
      metadata.followUpQuestions = [
        'What is the potential impact of this vulnerability?',
        'Are there any immediate mitigation steps needed?'
      ];
    }

    return metadata;
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    return this.sendRequest(request);
  }

  async *streamResponse(request: LLMRequest): AsyncIterable<string> {
    // Implementation for streaming responses
    const response = await this.sendRequest(request);
    yield response.content;
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-4o',
      'gpt-4o-mini'
    ];
  }

  // OpenAI-specific method for performance optimization
  async optimizePerformance(
    codeSnippet: string,
    performanceMetrics: any,
    context: string
  ): Promise<LLMResponse> {
    const optimizationPrompt = `
As a performance optimization expert, analyze this code for improvements:

Code:
${codeSnippet}

Current Performance Metrics:
${JSON.stringify(performanceMetrics, null, 2)}

Context: ${context}

Provide:
1. Performance bottleneck analysis
2. Specific optimization recommendations
3. Code examples with improvements
4. Expected performance gains
5. Trade-offs and considerations

Focus on practical, measurable improvements.
`;

    return this.sendRequest({
      prompt: optimizationPrompt,
      context: 'Performance optimization task',
      temperature: 0.2,
      maxTokens: 2000
    });
  }
}