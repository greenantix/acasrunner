import { EmbeddingConfig } from './types';

export class EmbeddingService {
  private config: EmbeddingConfig;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      model_name: 'nomic-embed-text-v1.5',
      dimensions: 384,
      api_url: 'http://localhost:1234/v1/embeddings',
      batch_size: 32,
      timeout: 30000,
      ...config
    };
  }

  async generateEmbedding(text: string): Promise<Float32Array> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  async generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const batches = this.createBatches(texts, this.config.batch_size);
      const allEmbeddings: Float32Array[] = [];

      for (const batch of batches) {
        const batchEmbeddings = await this.processBatch(batch);
        allEmbeddings.push(...batchEmbeddings);
      }

      return allEmbeddings;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  private async processBatch(texts: string[]): Promise<Float32Array[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model_name,
          input: texts,
          encoding_format: 'float'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from embedding service');
      }

      return data.data.map((item: any) => {
        if (!item.embedding || !Array.isArray(item.embedding)) {
          throw new Error('Invalid embedding format in response');
        }
        return new Float32Array(item.embedding);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Embedding generation timed out after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async testConnection(): Promise<boolean> {
    try {
      const testEmbedding = await this.generateEmbedding('test');
      return testEmbedding.length === this.config.dimensions;
    } catch (error) {
      console.error('Embedding service connection test failed:', error);
      return false;
    }
  }

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance
let instance: EmbeddingService | null = null;

export function getEmbeddingService(config?: Partial<EmbeddingConfig>): EmbeddingService {
  if (!instance) {
    instance = new EmbeddingService(config);
  }
  return instance;
}
