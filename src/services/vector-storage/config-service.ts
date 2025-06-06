import { FirebaseCollections } from '@/lib/firebase/collections';

export interface VectorStorageConfig {
  embedding_model: string;
  embedding_dimensions: number;
  lm_studio_url: string;
  batch_size: number;
  similarity_threshold: number;
  auto_indexing_enabled: boolean;
  indexing_file_patterns: string[];
  indexing_exclude_patterns: string[];
  indexing_delay: number;
  database_path: string;
}

export class VectorStorageConfigService {
  private cache: VectorStorageConfig | null = null;
  private lastFetch = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  async getConfig(): Promise<VectorStorageConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.cache && (now - this.lastFetch) < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      // Fetch from Firebase settings
      const settings = await this.fetchSettings();
      
      // Merge with defaults
      this.cache = {
        embedding_model: settings.embedding_model || 'nomic-embed-text-v1.5',
        embedding_dimensions: settings.embedding_dimensions || 384,
        lm_studio_url: settings.lm_studio_url || 'http://localhost:1234/v1/embeddings',
        batch_size: settings.batch_size || 32,
        similarity_threshold: settings.similarity_threshold || 0.7,
        auto_indexing_enabled: settings.auto_indexing_enabled ?? true,
        indexing_file_patterns: settings.indexing_file_patterns || [
          '**/*.{ts,tsx,js,jsx,py,java,cpp,c,cs,go,rs,php,rb,swift,kt,dart,scala}'
        ],
        indexing_exclude_patterns: settings.indexing_exclude_patterns || [
          '**/node_modules/**',
          '**/.*/**',
          '**/dist/**',
          '**/build/**',
          '**/target/**'
        ],
        indexing_delay: settings.indexing_delay || 2000,
        database_path: settings.database_path || './.genkit/chroma'
      };

      this.lastFetch = now;
      return this.cache;
    } catch (error) {
      console.error('Failed to fetch vector storage config:', error);
      
      // Return defaults if Firebase is unavailable
      return this.getDefaultConfig();
    }
  }

  async updateConfig(updates: Partial<VectorStorageConfig>): Promise<void> {
    try {
      // Update each setting in Firebase
      for (const [key, value] of Object.entries(updates)) {
        await FirebaseCollections.setSetting({
          category: 'vector_storage',
          key,
          value,
          type: this.getValueType(value),
          description: this.getSettingDescription(key),
          isSystem: false,
          updatedBy: 'config_service'
        });
      }

      // Invalidate cache
      this.cache = null;
      this.lastFetch = 0;
    } catch (error) {
      console.error('Failed to update vector storage config:', error);
      throw error;
    }
  }

  private async fetchSettings(): Promise<Record<string, any>> {
    const settings: Record<string, any> = {};
    
    try {
      // In a real implementation, you'd query all vector_storage settings
      // For now, we'll handle the case where Firebase is not available
      const settingsKeys = [
        'embedding_model',
        'embedding_dimensions',
        'lm_studio_url',
        'batch_size',
        'similarity_threshold',
        'auto_indexing_enabled',
        'indexing_file_patterns',
        'indexing_exclude_patterns',
        'indexing_delay',
        'database_path'
      ];

      // This would typically fetch from Firebase, but we'll return empty for graceful fallback
      return settings;
    } catch (error) {
      console.log('Firebase not available, using default settings');
      return {};
    }
  }

  getDefaultConfig(): VectorStorageConfig {
    return {
      embedding_model: 'nomic-embed-text-v1.5',
      embedding_dimensions: 384,
      lm_studio_url: 'http://localhost:1234/v1/embeddings',
      batch_size: 32,
      similarity_threshold: 0.7,
      auto_indexing_enabled: true,
      indexing_file_patterns: [
        '**/*.{ts,tsx,js,jsx,py,java,cpp,c,cs,go,rs,php,rb,swift,kt,dart,scala}'
      ],
      indexing_exclude_patterns: [
        '**/node_modules/**',
        '**/.*/**',
        '**/dist/**',
        '**/build/**',
        '**/target/**'
      ],
      indexing_delay: 2000,
      database_path: './.genkit/chroma' // Updated for ChromaDB
    };
  }

  private getValueType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    return 'string';
  }

  private getSettingDescription(key: string): string {
    const descriptions: Record<string, string> = {
      embedding_model: 'Embedding model for code vectorization',
      embedding_dimensions: 'Dimensions of embedding vectors',
      lm_studio_url: 'LM Studio API URL for embedding generation',
      batch_size: 'Batch size for embedding generation',
      similarity_threshold: 'Minimum similarity threshold for search results',
      auto_indexing_enabled: 'Enable automatic indexing of code changes',
      indexing_file_patterns: 'File patterns to include in automatic indexing',
      indexing_exclude_patterns: 'File patterns to exclude from indexing',
      indexing_delay: 'Delay in milliseconds before indexing changed files',
      database_path: 'Path to ChromaDB vector database directory'
    };

    return descriptions[key] || `Configuration for ${key}`;
  }

  // Validate configuration
  async validateConfig(config?: VectorStorageConfig): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const cfg = config || await this.getConfig();
    const errors: string[] = [];

    // Validate embedding dimensions
    if (cfg.embedding_dimensions <= 0 || cfg.embedding_dimensions > 2048) {
      errors.push('Embedding dimensions must be between 1 and 2048');
    }

    // Validate batch size
    if (cfg.batch_size <= 0 || cfg.batch_size > 100) {
      errors.push('Batch size must be between 1 and 100');
    }

    // Validate similarity threshold
    if (cfg.similarity_threshold < 0 || cfg.similarity_threshold > 1) {
      errors.push('Similarity threshold must be between 0 and 1');
    }

    // Validate URL format
    try {
      new URL(cfg.lm_studio_url);
    } catch {
      errors.push('LM Studio URL must be a valid URL');
    }

    // Validate file patterns
    if (!Array.isArray(cfg.indexing_file_patterns) || cfg.indexing_file_patterns.length === 0) {
      errors.push('Indexing file patterns must be a non-empty array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache = null;
    this.lastFetch = 0;
  }
}

// Singleton instance
let instance: VectorStorageConfigService | null = null;

export function getVectorStorageConfigService(): VectorStorageConfigService {
  if (!instance) {
    instance = new VectorStorageConfigService();
  }
  return instance;
}
