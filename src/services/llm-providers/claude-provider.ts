import { BaseLLMProvider, LLMRequest, LLMResponse, LLMProvider, ProviderConfig } from './types';

export class ClaudeProvider extends BaseLLMProvider {
  private lastRequest = 0;
  private requestCount = 0;

  constructor(config: LLMProvider, providerConfig: ProviderConfig) {
    super(config, providerConfig);
  }

  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded for Claude provider');
    }

    const systemPrompt = this.buildSystemPrompt(request.context);
    const prompt = this.formatErrorForAI(request.prompt, request.context);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.providerConfig.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      this.requestCount++;
      this.lastRequest = Date.now();

      return {
        content: data.content[0].text,
        provider: 'claude',
        model: this.config.model,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        metadata: this.parseClaudeResponse(data.content[0].text)
      };
    } catch (error) {
      throw new Error(`Claude provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.error('Claude connection test failed:', error);
      return false;
    }
  }

  isRateLimited(): boolean {
    if (!this.config.rateLimit) return false;

    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter if a minute has passed
    if (now - this.lastRequest > oneMinute) {
      this.requestCount = 0;
      return false;
    }

    return this.requestCount >= this.config.rateLimit.requestsPerMinute;
  }

  private parseClaudeResponse(content: string): {
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

    // Extract suggestions (look for numbered lists or bullet points)
    const suggestionMatches = content.match(/^\d+\.\s+(.+)$/gm);
    if (suggestionMatches) {
      metadata.suggestions = suggestionMatches.map(s => s.replace(/^\d+\.\s+/, ''));
    }

    // Extract reasoning (look for explanation sections)
    const reasoningMatch = content.match(/(?:analysis|reasoning|explanation):\s*(.+?)(?:\n\n|\n[A-Z])/is);
    if (reasoningMatch) {
      metadata.reasoning = reasoningMatch[1].trim();
    }

    // Generate follow-up questions based on content
    if (content.includes('dependency') || content.includes('package')) {
      metadata.followUpQuestions = [
        'Which specific dependencies are causing issues?',
        'Are there any version conflicts in package.json?'
      ];
    } else if (content.includes('error') || content.includes('exception')) {
      metadata.followUpQuestions = [
        'Can you provide the full stack trace?',
        'When did this error first occur?'
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
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  // Claude-specific helper for complex code analysis
  async analyzeCodeIssue(
    errorMessage: string, 
    codeContext: string, 
    fileType: string
  ): Promise<LLMResponse> {
    const specializedPrompt = `
As a senior ${fileType} developer, analyze this error in context:

Error: ${errorMessage}

Code Context:
${codeContext}

Provide a comprehensive analysis including:
1. Immediate cause of the error
2. Root cause analysis
3. Specific code fix with examples
4. Best practices to prevent similar issues
5. Any related code smells or improvement opportunities

Focus on ${fileType}-specific best practices and modern development patterns.
`;

    return this.sendRequest({
      prompt: specializedPrompt,
      context: `File type: ${fileType}`,
      temperature: 0.1, // Lower temperature for more focused analysis
      maxTokens: 1500
    });
  }
}