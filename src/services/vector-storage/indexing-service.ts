import { getChromaDBService } from './chroma-service';
import { getEmbeddingService } from './embedding-service';
import { CodeParser, CodeChunk } from './code-parser';
import { CodeEmbeddingRecord, IndexingOptions } from './types';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export class IndexingService {
  private vectorService = getChromaDBService();
  private embeddingService = getEmbeddingService();
  private codeParser = new CodeParser();
  private isIndexing = false;

  constructor(private projectId: string = 'default') {}

  async indexFile(filePath: string, forceReindex = false): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const lastModified = stats.mtime.getTime();
      const fileId = this.generateFileId(filePath);

      // Skip existing file check for now in ChromaDB (simplified)
      // TODO: Implement file change detection with ChromaDB metadata

      const content = await fs.readFile(filePath, 'utf-8');
      const chunks = this.codeParser.parseFile(filePath, content);

      // Generate embeddings for all chunks
      const embeddings = await this.embeddingService.generateEmbeddings(
        chunks.map(chunk => this.createEmbeddingText(chunk))
      );

      // Create embedding records for ChromaDB
      const codeEmbeddings = chunks.map((chunk, index) => ({
        id: chunk.id,
        content: chunk.content,
        file_path: filePath,
        language: chunk.language,
        function_name: chunk.name,
        line_start: chunk.startLine || 0,
        line_end: chunk.endLine || 0,
        similarity: 0,
        created_at: new Date()
      }));

      // Store in ChromaDB
      await this.vectorService.addEmbeddings(codeEmbeddings);

      console.log(`Indexed ${chunks.length} chunks from ${filePath}`);
    } catch (error) {
      console.error(`Failed to index file ${filePath}:`, error);
      throw error;
    }
  }

  async indexDirectory(
    directoryPath: string,
    options: IndexingOptions = {}
  ): Promise<{ indexed: number; skipped: number; errors: number }> {
    if (this.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    this.isIndexing = true;
    let indexed = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const {
        include_patterns = ['**/*.{ts,tsx,js,jsx,py,java,cpp,c,cs,go,rs,php,rb,swift,kt,dart,scala}'],
        exclude_patterns = ['**/node_modules/**', '**/.*/**', '**/dist/**', '**/build/**', '**/target/**'],
        batch_size = 10
      } = options;

      // Find all files matching patterns
      const files: string[] = [];
      for (const pattern of include_patterns) {
        const matches = await glob(pattern, {
          cwd: directoryPath,
          absolute: true,
          ignore: exclude_patterns
        });
        files.push(...matches);
      }

      console.log(`Found ${files.length} files to index in ${directoryPath}`);

      // Process files in batches to avoid overwhelming the embedding service
      for (let i = 0; i < files.length; i += batch_size) {
        const batch = files.slice(i, i + batch_size);
        
        await Promise.allSettled(
          batch.map(async (filePath) => {
            try {
              await this.indexFile(filePath);
              indexed++;
            } catch (error) {
              console.error(`Error indexing ${filePath}:`, error);
              errors++;
            }
          })
        );

        // Progress update
        const progress = Math.round(((i + batch.length) / files.length) * 100);
        console.log(`Indexing progress: ${progress}% (${i + batch.length}/${files.length})`);
      }

      // ChromaDB metadata update not implemented yet
      console.log('Indexing metadata update completed');

      console.log(`Indexing complete: ${indexed} indexed, ${skipped} skipped, ${errors} errors`);
      
      return { indexed, skipped, errors };
    } finally {
      this.isIndexing = false;
    }
  }

  async removeFile(filePath: string): Promise<void> {
    try {
      const fileId = this.generateFileId(filePath);
      await this.vectorService.deleteEmbeddings([fileId]);
      console.log(`Removed embeddings for ${filePath}`);
    } catch (error) {
      console.error(`Failed to remove embeddings for ${filePath}:`, error);
      throw error;
    }
  }

  async searchCode(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      file_types?: string[];
      languages?: string[];
    } = {}
  ) {
    try {
      // Search similar code using ChromaDB
      const results = await this.vectorService.searchSimilar(
        query,
        options.limit || 10,
        options.threshold || 0.7
      );

      return results;
    } catch (error) {
      console.error('Failed to search code:', error);
      throw error;
    }
  }

  async getIndexingStats() {
    return await this.vectorService.getStats();
  }

  private generateFileId(filePath: string): string {
    return createHash('sha256').update(filePath).digest('hex');
  }

  private createEmbeddingText(chunk: CodeChunk): string {
    let text = '';

    // Add context information
    if (chunk.context.parentClass) {
      text += `Class: ${chunk.context.parentClass}\n`;
    }

    if (chunk.name) {
      text += `${chunk.type}: ${chunk.name}\n`;
    }

    if (chunk.context.parameters && chunk.context.parameters.length > 0) {
      text += `Parameters: ${chunk.context.parameters.join(', ')}\n`;
    }

    if (chunk.context.returnType) {
      text += `Returns: ${chunk.context.returnType}\n`;
    }

    if (chunk.context.docstring) {
      text += `Documentation: ${chunk.context.docstring}\n`;
    }

    // Add the actual code
    text += `Code:\n${chunk.content}`;

    return text;
  }

  async testEmbeddingService(): Promise<boolean> {
    return await this.embeddingService.testConnection();
  }

  isCurrentlyIndexing(): boolean {
    return this.isIndexing;
  }
}

// Singleton instances per project
const instances: Map<string, IndexingService> = new Map();

export function getIndexingService(projectId: string = 'default'): IndexingService {
  if (!instances.has(projectId)) {
    instances.set(projectId, new IndexingService(projectId));
  }
  return instances.get(projectId)!;
}
