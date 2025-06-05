export interface CodeEmbeddingRecord {
  file_id: string;
  code_embedding: Float32Array;
  file_type: string;
  language: string;
  project_id: string;
  last_modified: number;
  source_code: string;
  file_path: string;
  function_name?: string;
  context_info: Record<string, any>;
}

export interface VectorSearchResult {
  file_id: string;
  file_path: string;
  language: string;
  source_code: string;
  function_name?: string;
  similarity_score: number;
  context_info: Record<string, any>;
}

export interface EmbeddingConfig {
  model_name: string;
  dimensions: number;
  api_url: string;
  batch_size: number;
  timeout: number;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  file_types?: string[];
  languages?: string[];
  project_ids?: string[];
}

export interface IndexingOptions {
  batch_size?: number;
  chunk_size?: number;
  overlap_size?: number;
  include_patterns?: string[];
  exclude_patterns?: string[];
}