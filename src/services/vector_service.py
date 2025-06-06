import sqlite3
import numpy as np
import asyncio
import json
import os
from typing import List, Dict, Optional, Tuple
from .embedding_service import NomicEmbeddingService
from datetime import datetime

class VectorService:
    def __init__(self, db_path: str = "./data/embeddings.db"):
        self.db_path = db_path
        self.embedding_service = NomicEmbeddingService()
        self._ensure_db_directory()
        self._init_database()
    
    def _ensure_db_directory(self):
        """Ensure the database directory exists"""
        db_dir = os.path.dirname(self.db_path)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
    
    def _init_database(self):
        """Initialize SQLite-vec database with proper schema"""
        conn = sqlite3.connect(self.db_path)
        
        # Enable WAL mode and other optimizations
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA cache_size = 1000000")
        conn.execute("PRAGMA temp_store = memory")
        
        try:
            # Try to load sqlite-vec extension
            conn.execute("SELECT load_extension('vec0')")
        except sqlite3.OperationalError:
            # If extension loading fails, try alternative paths
            try:
                conn.execute("SELECT load_extension('./vec0')")
            except sqlite3.OperationalError:
                print("Warning: sqlite-vec extension not found. Vector operations may not work.")
        
        # Create vector table for code embeddings (compatible with existing TypeScript schema)
        conn.execute("""
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
            )
        """)
        
        # Create indexes for efficient querying
        conn.execute("CREATE INDEX IF NOT EXISTS idx_file_type ON code_embeddings(file_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_language ON code_embeddings(language)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_project_id ON code_embeddings(project_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_last_modified ON code_embeddings(last_modified)")
        
        # Create metadata table for tracking indexing progress
        conn.execute("""
            CREATE TABLE IF NOT EXISTS indexing_metadata (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        """)
        
        conn.commit()
        conn.close()
    
    async def index_code_snippet(
        self, 
        file_path: str, 
        content: str, 
        language: str,
        project_id: str,
        metadata: Dict = None
    ) -> bool:
        """Index a code snippet with embeddings"""
        try:
            # Generate embedding using the existing service
            embedding = await self.embedding_service.embed_code_snippet(
                code=content,
                language=language,
                context=f"File: {file_path}"
            )
            
            if not embedding:
                return False
            
            # Store in database (compatible with existing schema)
            conn = sqlite3.connect(self.db_path)
            
            try:
                conn.execute("SELECT load_extension('vec0')")
            except sqlite3.OperationalError:
                pass  # Extension may not be available
            
            # Convert embedding to JSON array for storage (matching TypeScript implementation)
            embedding_json = json.dumps(embedding)
            
            # Create file_id consistent with TypeScript version
            file_id = f"{project_id}:{file_path}"
            
            conn.execute("""
                INSERT OR REPLACE INTO code_embeddings 
                (file_id, code_embedding, file_type, language, project_id, 
                 last_modified, source_code, file_path, function_name, context_info)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                file_id,
                embedding_json,
                metadata.get('file_type', language) if metadata else language,
                language,
                project_id,
                int(datetime.now().timestamp()),
                content,
                file_path,
                metadata.get('function_name') if metadata else None,
                json.dumps(metadata.get('context_info', {})) if metadata else "{}"
            ])
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Failed to index code snippet: {e}")
            return False
    
    async def search_similar_code(
        self, 
        query: str, 
        project_id: str = None,
        language: str = None,
        limit: int = 10,
        threshold: float = 0.7
    ) -> List[Dict]:
        """Search for similar code using vector similarity"""
        try:
            # Generate query embedding
            query_embedding = await self.embedding_service.embed_single(query)
            if not query_embedding:
                return []
            
            conn = sqlite3.connect(self.db_path)
            
            try:
                conn.execute("SELECT load_extension('vec0')")
                
                # Build dynamic query with filters
                where_clauses = []
                params = [json.dumps(query_embedding)]
                
                if project_id:
                    where_clauses.append("project_id = ?")
                    params.append(project_id)
                
                if language:
                    where_clauses.append("language = ?")
                    params.append(language)
                
                where_sql = ""
                if where_clauses:
                    where_sql = f"WHERE {' AND '.join(where_clauses)}"
                
                params.append(limit)
                
                # Vector similarity search using cosine distance
                cursor = conn.execute(f"""
                    SELECT 
                        file_path, source_code, language, function_name, context_info,
                        vec_distance_cosine(code_embedding, ?) as distance
                    FROM code_embeddings 
                    {where_sql}
                    ORDER BY distance
                    LIMIT ?
                """, params)
                
                results = []
                for row in cursor.fetchall():
                    similarity = 1 - row[5]  # Convert distance to similarity
                    if similarity >= threshold:
                        results.append({
                            'file_path': row[0],
                            'content': row[1],
                            'language': row[2],
                            'function_name': row[3],
                            'context_info': json.loads(row[4] or '{}'),
                            'similarity': similarity,
                        })
                
                conn.close()
                return results
                
            except sqlite3.OperationalError:
                # Fallback: basic similarity using numpy if vec extension not available
                return await self._fallback_similarity_search(conn, query_embedding, project_id, language, limit, threshold)
            
        except Exception as e:
            print(f"Search failed: {e}")
            return []
    
    async def _fallback_similarity_search(self, conn, query_embedding, project_id, language, limit, threshold):
        """Fallback similarity search without sqlite-vec extension"""
        where_clauses = []
        params = []
        
        if project_id:
            where_clauses.append("project_id = ?")
            params.append(project_id)
        
        if language:
            where_clauses.append("language = ?")
            params.append(language)
        
        where_sql = ""
        if where_clauses:
            where_sql = f"WHERE {' AND '.join(where_clauses)}"
        
        cursor = conn.execute(f"""
            SELECT file_path, source_code, language, function_name, context_info, code_embedding
            FROM code_embeddings 
            {where_sql}
        """, params)
        
        results = []
        query_vec = np.array(query_embedding)
        
        for row in cursor.fetchall():
            try:
                stored_embedding = json.loads(row[5])
                stored_vec = np.array(stored_embedding)
                
                # Calculate cosine similarity
                similarity = np.dot(query_vec, stored_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(stored_vec))
                
                if similarity >= threshold:
                    results.append({
                        'file_path': row[0],
                        'content': row[1],
                        'language': row[2],
                        'function_name': row[3],
                        'context_info': json.loads(row[4] or '{}'),
                        'similarity': float(similarity),
                    })
            except Exception as e:
                print(f"Error processing embedding: {e}")
                continue
        
        # Sort by similarity and limit
        results.sort(key=lambda x: x['similarity'], reverse=True)
        conn.close()
        return results[:limit]
    
    async def get_project_stats(self, project_id: str) -> Dict:
        """Get indexing statistics for a project"""
        conn = sqlite3.connect(self.db_path)
        
        cursor = conn.execute("""
            SELECT 
                COUNT(*) as total_files,
                COUNT(DISTINCT language) as languages,
                SUM(LENGTH(source_code)) as total_chars,
                MAX(last_modified) as last_indexed
            FROM code_embeddings 
            WHERE project_id = ?
        """, [project_id])
        
        row = cursor.fetchone()
        conn.close()
        
        return {
            'total_files': row[0],
            'languages': row[1],
            'total_chars': row[2] or 0,
            'last_indexed': row[3],
            'status': 'completed' if row[0] > 0 else 'empty'
        }
    
    async def batch_index_files(self, files: List[Dict]) -> Dict:
        """Batch index multiple files efficiently"""
        results = {
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for file_data in files:
            try:
                success = await self.index_code_snippet(
                    file_path=file_data['file_path'],
                    content=file_data['content'],
                    language=file_data['language'],
                    project_id=file_data['project_id'],
                    metadata=file_data.get('metadata', {})
                )
                
                if success:
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(f"Failed to index {file_data['file_path']}")
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"Error indexing {file_data['file_path']}: {str(e)}")
        
        return results
    
    async def delete_project_embeddings(self, project_id: str) -> bool:
        """Delete all embeddings for a project"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("DELETE FROM code_embeddings WHERE project_id = ?", [project_id])
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Failed to delete project embeddings: {e}")
            return False
    
    async def get_all_stats(self) -> Dict:
        """Get overall database statistics"""
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Total embeddings
            total_cursor = conn.execute("SELECT COUNT(*) FROM code_embeddings")
            total = total_cursor.fetchone()[0]
            
            # File types
            file_types_cursor = conn.execute("""
                SELECT file_type, COUNT(*) 
                FROM code_embeddings 
                GROUP BY file_type
            """)
            file_types = dict(file_types_cursor.fetchall())
            
            # Languages
            languages_cursor = conn.execute("""
                SELECT language, COUNT(*) 
                FROM code_embeddings 
                GROUP BY language
            """)
            languages = dict(languages_cursor.fetchall())
            
            # Projects
            projects_cursor = conn.execute("""
                SELECT project_id, COUNT(*) 
                FROM code_embeddings 
                GROUP BY project_id
            """)
            projects = dict(projects_cursor.fetchall())
            
            conn.close()
            
            return {
                'total_embeddings': total,
                'file_types': file_types,
                'languages': languages,
                'projects': projects
            }
            
        except Exception as e:
            print(f"Failed to get stats: {e}")
            conn.close()
            return {
                'total_embeddings': 0,
                'file_types': {},
                'languages': {},
                'projects': {}
            }