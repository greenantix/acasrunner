import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { CodeEmbeddingRecord, VectorSearchResult, SearchOptions } from './types';
import path from 'path';
import fs from 'fs';

export class SQLiteVecService {
  private db: Database.Database;
  private initialized = false;

  constructor(private dbPath: string = './data/embeddings.db') {
    this.ensureDbDirectory();
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000000');
    this.db.pragma('temp_store = memory');
    this.db.pragma('mmap_size = 268435456'); // 256MB
  }

  private ensureDbDirectory(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load sqlite-vec extension
      sqliteVec.load(this.db);

      // Create the vector table for code embeddings
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS code_embeddings USING vec0(
          file_id TEXT PRIMARY KEY,
          code_embedding FLOAT[384],
          file_type TEXT,
          language TEXT,
          project_id TEXT,
          last_modified INTEGER,
          +source_code TEXT,
          +file_path TEXT,
          +function_name TEXT,
          +context_info TEXT
        );
      `);

      // Create indexes for efficient filtering
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_file_type ON code_embeddings(file_type);
        CREATE INDEX IF NOT EXISTS idx_language ON code_embeddings(language);
        CREATE INDEX IF NOT EXISTS idx_project_id ON code_embeddings(project_id);
        CREATE INDEX IF NOT EXISTS idx_last_modified ON code_embeddings(last_modified);
      `);

      // Create metadata table for tracking indexing progress
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS indexing_metadata (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      this.initialized = true;
      console.log('SQLite-vec database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite-vec database:', error);
      throw error;
    }
  }

  async insertEmbedding(record: CodeEmbeddingRecord): Promise<void> {
    await this.initialize();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO code_embeddings (
        file_id, code_embedding, file_type, language, project_id,
        last_modified, source_code, file_path, function_name, context_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        record.file_id,
        JSON.stringify(Array.from(record.code_embedding)),
        record.file_type,
        record.language,
        record.project_id,
        record.last_modified,
        record.source_code,
        record.file_path,
        record.function_name || null,
        JSON.stringify(record.context_info)
      );
    } catch (error) {
      console.error('Failed to insert embedding:', error);
      throw error;
    }
  }

  async batchInsertEmbeddings(records: CodeEmbeddingRecord[]): Promise<void> {
    await this.initialize();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO code_embeddings (
        file_id, code_embedding, file_type, language, project_id,
        last_modified, source_code, file_path, function_name, context_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((records: CodeEmbeddingRecord[]) => {
      for (const record of records) {
        stmt.run(
          record.file_id,
          JSON.stringify(Array.from(record.code_embedding)),
          record.file_type,
          record.language,
          record.project_id,
          record.last_modified,
          record.source_code,
          record.file_path,
          record.function_name || null,
          JSON.stringify(record.context_info)
        );
      }
    });

    try {
      transaction(records);
    } catch (error) {
      console.error('Failed to batch insert embeddings:', error);
      throw error;
    }
  }

  async searchSimilar(
    queryEmbedding: Float32Array,
    options: SearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    await this.initialize();

    const {
      limit = 10,
      threshold = 0.7,
      file_types,
      languages,
      project_ids
    } = options;

    let whereClause = '';
    const params: any[] = [JSON.stringify(Array.from(queryEmbedding)), limit];

    const conditions: string[] = [];
    
    if (file_types && file_types.length > 0) {
      conditions.push(`file_type IN (${file_types.map(() => '?').join(',')})`);
      params.push(...file_types);
    }
    
    if (languages && languages.length > 0) {
      conditions.push(`language IN (${languages.map(() => '?').join(',')})`);
      params.push(...languages);
    }
    
    if (project_ids && project_ids.length > 0) {
      conditions.push(`project_id IN (${project_ids.map(() => '?').join(',')})`);
      params.push(...project_ids);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        file_id,
        file_path,
        language,
        source_code,
        function_name,
        context_info,
        vec_distance_cosine(code_embedding, ?) as distance
      FROM code_embeddings
      ${whereClause}
      ORDER BY distance
      LIMIT ?
    `;

    try {
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);

      return rows.map((row: any) => ({
        file_id: row.file_id,
        file_path: row.file_path,
        language: row.language,
        source_code: row.source_code,
        function_name: row.function_name,
        similarity_score: 1 - row.distance, // Convert distance to similarity
        context_info: JSON.parse(row.context_info || '{}')
      })).filter(result => result.similarity_score >= threshold);
    } catch (error) {
      console.error('Failed to search similar embeddings:', error);
      throw error;
    }
  }

  async deleteEmbedding(fileId: string): Promise<void> {
    await this.initialize();

    const stmt = this.db.prepare('DELETE FROM code_embeddings WHERE file_id = ?');
    
    try {
      stmt.run(fileId);
    } catch (error) {
      console.error('Failed to delete embedding:', error);
      throw error;
    }
  }

  async getEmbedding(fileId: string): Promise<CodeEmbeddingRecord | null> {
    await this.initialize();

    const stmt = this.db.prepare(`
      SELECT * FROM code_embeddings WHERE file_id = ?
    `);

    try {
      const row = stmt.get(fileId) as any;
      if (!row) return null;

      return {
        file_id: row.file_id,
        code_embedding: new Float32Array(JSON.parse(row.code_embedding)),
        file_type: row.file_type,
        language: row.language,
        project_id: row.project_id,
        last_modified: row.last_modified,
        source_code: row.source_code,
        file_path: row.file_path,
        function_name: row.function_name,
        context_info: JSON.parse(row.context_info || '{}')
      };
    } catch (error) {
      console.error('Failed to get embedding:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    total_embeddings: number;
    file_types: Record<string, number>;
    languages: Record<string, number>;
    projects: Record<string, number>;
  }> {
    await this.initialize();

    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM code_embeddings');
      const total = totalStmt.get() as { count: number };

      const fileTypesStmt = this.db.prepare(`
        SELECT file_type, COUNT(*) as count 
        FROM code_embeddings 
        GROUP BY file_type
      `);
      const fileTypes = fileTypesStmt.all() as { file_type: string; count: number }[];

      const languagesStmt = this.db.prepare(`
        SELECT language, COUNT(*) as count 
        FROM code_embeddings 
        GROUP BY language
      `);
      const languages = languagesStmt.all() as { language: string; count: number }[];

      const projectsStmt = this.db.prepare(`
        SELECT project_id, COUNT(*) as count 
        FROM code_embeddings 
        GROUP BY project_id
      `);
      const projects = projectsStmt.all() as { project_id: string; count: number }[];

      return {
        total_embeddings: total.count,
        file_types: Object.fromEntries(fileTypes.map(ft => [ft.file_type, ft.count])),
        languages: Object.fromEntries(languages.map(l => [l.language, l.count])),
        projects: Object.fromEntries(projects.map(p => [p.project_id, p.count]))
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  async setMetadata(key: string, value: string): Promise<void> {
    await this.initialize();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO indexing_metadata (key, value, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
    `);

    try {
      stmt.run(key, value);
    } catch (error) {
      console.error('Failed to set metadata:', error);
      throw error;
    }
  }

  async getMetadata(key: string): Promise<string | null> {
    await this.initialize();

    const stmt = this.db.prepare('SELECT value FROM indexing_metadata WHERE key = ?');
    
    try {
      const row = stmt.get(key) as { value: string } | undefined;
      return row?.value || null;
    } catch (error) {
      console.error('Failed to get metadata:', error);
      throw error;
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
let instance: SQLiteVecService | null = null;

export function getSQLiteVecService(dbPath?: string): SQLiteVecService {
  if (!instance) {
    instance = new SQLiteVecService(dbPath);
  }
  return instance;
}