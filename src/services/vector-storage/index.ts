// Primary vector storage services
export { ChromaDBService, getChromaDBService, getStrugglePatternsService } from './chroma-service';
export { EmbeddingService, getEmbeddingService } from './embedding-service';
export { CodeParser } from './code-parser';
export { IndexingService, getIndexingService } from './indexing-service';
export { VectorStorageConfigService, getVectorStorageConfigService } from './config-service';

// Legacy SQLite service (disabled)
// export { SQLiteVecService, getSQLiteVecService } from './sqlite-vec-service';

export * from './types';
