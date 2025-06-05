export interface LLMProvider {
  id: string;
  name: string;
  type: 'claude' | 'openai' | 'ollama' | 'gemini' | 'deepseek';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  specialties: ('code_review' | 'debugging' | 'optimization' | 'documentation' | 'security')[];
  enabled: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface LLMRequest {
  prompt: string;
  context?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: {
    confidence?: number;
    suggestions?: string[];
    followUpQuestions?: string[];
    reasoning?: string;
  };
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export abstract class BaseLLMProvider {
  protected config: LLMProvider;
  protected providerConfig: ProviderConfig;

  constructor(config: LLMProvider, providerConfig: ProviderConfig) {
    this.config = config;
    this.providerConfig = providerConfig;
  }

  abstract sendRequest(request: LLMRequest): Promise<LLMResponse>;
  abstract testConnection(): Promise<boolean>;
  abstract isRateLimited(): boolean;

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getType(): string {
    return this.config.type;
  }

  getSpecialties(): string[] {
    return this.config.specialties;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  protected buildSystemPrompt(context?: string): string {
    const basePrompt = `You are an expert AI coding assistant specializing in ${this.config.specialties.join(', ')}.
Your role is to analyze code issues and provide accurate, actionable solutions.

Guidelines:
- Provide clear, specific solutions
- Include code examples when relevant
- Explain the reasoning behind your recommendations
- Consider security and performance implications
- Suggest preventive measures for similar issues`;

    if (context) {
      return `${basePrompt}\n\nContext:\n${context}`;
    }

    return basePrompt;
  }

  protected formatErrorForAI(error: string, context?: string): string {
    let prompt = `Please analyze this error and provide a solution:\n\nError: ${error}`;
    
    if (context) {
      prompt += `\n\nAdditional Context:\n${context}`;
    }

    prompt += `\n\nPlease provide:
1. Root cause analysis
2. Step-by-step solution
3. Code examples if applicable
4. Prevention strategies
5. Confidence level (1-10)`;

    return prompt;
  }
}