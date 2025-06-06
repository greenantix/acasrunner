import { LLMProvider, ProviderConfig, BaseLLMProvider, LLMRequest, LLMResponse } from './types';
import { ClaudeProvider } from './claude-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';

export class ProviderManager {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private configurations: Map<string, LLMProvider> = new Map();
  private defaultProviders: LLMProvider[] = [];

  constructor() {
    this.initializeDefaultProviders();
  }

  private initializeDefaultProviders(): void {
    this.defaultProviders = [
      {
        id: 'claude-sonnet',
        name: 'Claude 3.5 Sonnet',
        type: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.1,
        maxTokens: 4000,
        specialties: ['code_review', 'debugging', 'security'],
        enabled: false,
        rateLimit: {
          requestsPerMinute: 50,
          tokensPerMinute: 40000
        }
      },
      {
        id: 'gpt-4',
        name: 'GPT-4 Turbo',
        type: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.2,
        maxTokens: 4000,
        specialties: ['optimization', 'debugging', 'documentation'],
        enabled: false,
        rateLimit: {
          requestsPerMinute: 40,
          tokensPerMinute: 30000
        }
      },
      {
        id: 'gemini-pro',
        name: 'Gemini 2.0 Flash',
        type: 'gemini',
        model: 'googleai/gemini-2.0-flash',
        temperature: 0.3,
        maxTokens: 3000,
        specialties: ['documentation', 'optimization'],
        enabled: true, // Default enabled since it's already configured
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 50000
        }
      }
    ];

    // Load from environment variables
    this.loadProvidersFromEnv();
  }

  private loadProvidersFromEnv(): void {
    // Claude configuration
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (claudeKey) {
      const claudeConfig = this.defaultProviders.find(p => p.type === 'claude');
      if (claudeConfig) {
        claudeConfig.enabled = true;
        this.addProvider(claudeConfig, { apiKey: claudeKey });
      }
    }

    // OpenAI configuration
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openaiConfig = this.defaultProviders.find(p => p.type === 'openai');
      if (openaiConfig) {
        openaiConfig.enabled = true;
        this.addProvider(openaiConfig, { apiKey: openaiKey });
      }
    }

    // Gemini is already configured via Genkit
    const geminiConfig = this.defaultProviders.find(p => p.type === 'gemini');
    if (geminiConfig) {
      this.addProvider(geminiConfig, { apiKey: 'configured-via-genkit' });
    }
  }

  addProvider(config: LLMProvider, providerConfig: ProviderConfig): void {
    this.configurations.set(config.id, config);

    let provider: BaseLLMProvider;
    
    switch (config.type) {
      case 'claude':
        provider = new ClaudeProvider(config, providerConfig);
        break;
      case 'openai':
        provider = new OpenAIProvider(config, providerConfig);
        break;
      case 'gemini':
        provider = new GeminiProvider(config, providerConfig);
        break;
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }

    this.providers.set(config.id, provider);
  }

  removeProvider(providerId: string): void {
    this.providers.delete(providerId);
    this.configurations.delete(providerId);
  }

  getProvider(providerId: string): BaseLLMProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): BaseLLMProvider[] {
    return Array.from(this.providers.values());
  }

  getEnabledProviders(): BaseLLMProvider[] {
    return this.getAllProviders().filter(p => p.isEnabled());
  }

  getProvidersBySpecialty(specialty: string): BaseLLMProvider[] {
    return this.getEnabledProviders().filter(p => 
      p.getSpecialties().includes(specialty)
    );
  }

  async selectBestProvider(
    problemType: string,
    severity: string,
    specialties: string[] = []
  ): Promise<BaseLLMProvider | null> {
    const enabledProviders = this.getEnabledProviders();
    
    if (enabledProviders.length === 0) {
      return null;
    }

    // Filter by specialties if provided
    let candidates = specialties.length > 0 
      ? enabledProviders.filter(p => 
          specialties.some(s => p.getSpecialties().includes(s))
        )
      : enabledProviders;

    if (candidates.length === 0) {
      candidates = enabledProviders;
    }

    // Apply selection logic based on problem type and severity
    if (severity === 'critical' || problemType === 'security_vulnerability') {
      // Prefer Claude for critical issues
      const claude = candidates.find(p => p.getType() === 'claude');
      if (claude && !claude.isRateLimited()) return claude;
    }

    if (problemType === 'performance_issue') {
      // Prefer OpenAI for performance optimization
      const openai = candidates.find(p => p.getType() === 'openai');
      if (openai && !openai.isRateLimited()) return openai;
    }

    if (problemType === 'dependency_error' || problemType === 'build_failure') {
      // Prefer Gemini for dependency and configuration issues
      const gemini = candidates.find(p => p.getType() === 'gemini');
      if (gemini && !gemini.isRateLimited()) return gemini;
    }

    // Fall back to first available non-rate-limited provider
    const available = candidates.find(p => !p.isRateLimited());
    return available || candidates[0]; // Return first provider even if rate limited
  }

  async sendRequest(
    providerId: string, 
    request: LLMRequest
  ): Promise<LLMResponse> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isEnabled()) {
      throw new Error(`Provider is disabled: ${providerId}`);
    }

    return provider.sendRequest(request);
  }

  async testAllProviders(): Promise<{ [providerId: string]: boolean }> {
    const results: { [providerId: string]: boolean } = {};
    
    for (const provider of this.getAllProviders()) {
      try {
        results[provider.getId()] = await provider.testConnection();
      } catch (error) {
        results[provider.getId()] = false;
      }
    }

    return results;
  }

  getProviderStats(): {
    total: number;
    enabled: number;
    byType: { [type: string]: number };
    bySpecialty: { [specialty: string]: number };
  } {
    const all = this.getAllProviders();
    const enabled = this.getEnabledProviders();

    const byType: { [type: string]: number } = {};
    const bySpecialty: { [specialty: string]: number } = {};

    all.forEach(provider => {
      const type = provider.getType();
      byType[type] = (byType[type] || 0) + 1;

      provider.getSpecialties().forEach(specialty => {
        bySpecialty[specialty] = (bySpecialty[specialty] || 0) + 1;
      });
    });

    return {
      total: all.length,
      enabled: enabled.length,
      byType,
      bySpecialty
    };
  }

  getProviderConfigurations(): LLMProvider[] {
    return Array.from(this.configurations.values());
  }

  updateProviderConfig(providerId: string, updates: Partial<LLMProvider>): void {
    const config = this.configurations.get(providerId);
    if (!config) {
      throw new Error(`Provider configuration not found: ${providerId}`);
    }

    const updatedConfig = { ...config, ...updates };
    this.configurations.set(providerId, updatedConfig);

    // Recreate provider instance with new config
    const provider = this.providers.get(providerId);
    if (provider) {
      // Note: This would require provider config to be updatable
      // For now, we'll require manual removal and re-addition
      console.warn(`Provider ${providerId} configuration updated. Restart may be required.`);
    }
  }
}

// Singleton instance
export const providerManager = new ProviderManager();
