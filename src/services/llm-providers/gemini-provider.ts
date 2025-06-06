import { BaseLLMProvider, LLMRequest, LLMResponse, LLMProvider, ProviderConfig } from './types';
import { ai } from '@/ai/genkit';

export class GeminiProvider extends BaseLLMProvider {
  private lastRequest = 0;
  private requestCount = 0;

  constructor(config: LLMProvider, providerConfig: ProviderConfig) {
    super(config, providerConfig);
  }

  async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded for Gemini provider');
    }

    const systemPrompt = this.buildSystemPrompt(request.context);
    const prompt = this.formatErrorForAI(request.prompt, request.context);
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    try {
      const response = await ai.generate({
        model: this.config.model,
        prompt: fullPrompt,
        config: {
          temperature: request.temperature || this.config.temperature,
          maxOutputTokens: request.maxTokens || this.config.maxTokens
        }
      });

      this.requestCount++;
      this.lastRequest = Date.now();

      return {
        content: response.text,
        provider: 'gemini',
        model: this.config.model,
        usage: {
          promptTokens: 0, // Genkit doesn't provide token usage
          completionTokens: 0,
          totalTokens: 0
        },
        metadata: this.parseGeminiResponse(response.text)
      };
    } catch (error) {
      throw new Error(`Gemini provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.error('Gemini connection test failed:', error);
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

  private parseGeminiResponse(content: string): {
    confidence?: number;
    suggestions?: string[];
    followUpQuestions?: string[];
    reasoning?: string;
  } {
    const metadata: any = {};

    // Extract confidence rating
    const confidenceMatch = content.match(/confidence.*?(\d+)\/10|(\d+)%/i);
    if (confidenceMatch) {
      const score = parseInt(confidenceMatch[1] || confidenceMatch[2]);
      metadata.confidence = confidenceMatch[1] ? score / 10 : score / 100;
    }

    // Extract bullet points or numbered lists as suggestions
    const bulletMatches = content.match(/^[•\-\*]\s+(.+)$/gm);
    const numberedMatches = content.match(/^\d+\.\s+(.+)$/gm);
    
    if (bulletMatches || numberedMatches) {
      const suggestions = [
        ...(bulletMatches || []).map(s => s.replace(/^[•\-\*]\s+/, '')),
        ...(numberedMatches || []).map(s => s.replace(/^\d+\.\s+/, ''))
      ];
      metadata.suggestions = suggestions;
    }

    // Extract reasoning or analysis sections
    const reasoningMatch = content.match(/(?:analysis|reasoning|explanation):\s*(.+?)(?:\n\n|\n[A-Z])/is);
    if (reasoningMatch) {
      metadata.reasoning = reasoningMatch[1].trim();
    }

    // Generate follow-up questions based on content analysis
    if (content.includes('dependency') || content.includes('version')) {
      metadata.followUpQuestions = [
        'Which package versions are compatible?',
        'Are there any breaking changes in recent updates?'
      ];
    } else if (content.includes('configuration') || content.includes('setup')) {
      metadata.followUpQuestions = [
        'What is the current configuration state?',
        'Are there any environment-specific settings needed?'
      ];
    }

    return metadata;
  }

  // Gemini-specific method for dependency analysis
  async analyzeDependencies(
    packageJson: string,
    lockFile: string,
    errorContext: string
  ): Promise<LLMResponse> {
    const dependencyPrompt = `
As a Node.js dependency expert, analyze this package configuration issue:

Package.json:
${packageJson}

Lock file snippet:
${lockFile}

Error Context: ${errorContext}

Provide:
1. Dependency conflict analysis
2. Version compatibility assessment
3. Resolution strategy
4. Recommended package versions
5. Prevention measures for future conflicts

Focus on practical solutions and compatibility matrix.
`;

    return this.sendRequest({
      prompt: dependencyPrompt,
      context: 'Dependency analysis task',
      temperature: 0.1,
      maxTokens: 1500
    });
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
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
      'gemini-pro-vision'
    ];
  }

  // Gemini-specific method for configuration troubleshooting
  async troubleshootConfiguration(
    configFiles: { [filename: string]: string },
    errorMessage: string
  ): Promise<LLMResponse> {
    const configPrompt = `
As a configuration expert, troubleshoot this setup issue:

Configuration Files:
${Object.entries(configFiles).map(([name, content]) => 
  `${name}:\n${content}\n`
).join('\n')}

Error: ${errorMessage}

Provide:
1. Configuration validation
2. Common misconfiguration patterns
3. Step-by-step fix instructions
4. Best practices for this setup
5. Testing recommendations

Focus on clear, actionable guidance.
`;

    return this.sendRequest({
      prompt: configPrompt,
      context: 'Configuration troubleshooting',
      temperature: 0.2,
      maxTokens: 1800
    });
  }
}
