# src/services/embedding_service.py
import aiohttp
import asyncio
import numpy as np
from typing import List, Dict, Any, Optional
import json
import hashlib

class NomicEmbeddingService:
    def __init__(self, base_url: str = "http://localhost:1234"):
        self.base_url = base_url
        self.session = None
        self.embedding_cache = {}  # Simple in-memory cache
        
    async def _get_session(self):
        if not self.session:
            connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
            self.session = aiohttp.ClientSession(connector=connector)
        return self.session
    
    async def embed_single(self, text: str) -> Optional[List[float]]:
        """Generate embedding for a single text"""
        # Check cache first
        text_hash = hashlib.md5(text.encode()).hexdigest()
        if text_hash in self.embedding_cache:
            return self.embedding_cache[text_hash]
        
        session = await self._get_session()
        
        payload = {
            "input": text,
            "model": "text-embedding-nomic-embed-text-v1.5-embedding"
        }
        
        try:
            async with session.post(
                f"{self.base_url}/v1/embeddings",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    embedding = result['data'][0]['embedding']
                    
                    # Cache the result
                    self.embedding_cache[text_hash] = embedding
                    return embedding
                else:
                    print(f"Embedding API error: {response.status}")
                    return None
                    
        except Exception as e:
            print(f"Embedding generation failed: {e}")
            return None
    
    async def embed_batch(self, texts: List[str], batch_size: int = 10) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts efficiently"""
        results = []
        
        # Process in batches to avoid overwhelming the API
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Create concurrent tasks for the batch
            tasks = [self.embed_single(text) for text in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle any exceptions
            for result in batch_results:
                if isinstance(result, Exception):
                    print(f"Batch embedding error: {result}")
                    results.append(None)
                else:
                    results.append(result)
            
            # Small delay between batches to prevent overload
            await asyncio.sleep(0.1)
        
        return results
    
    async def embed_code_snippet(self, code: str, language: str = "python", context: str = "") -> Optional[List[float]]:
        """Embed code with language and context information"""
        # Format code with metadata for better embeddings
        formatted_text = f"Language: {language}\n"
        if context:
            formatted_text += f"Context: {context}\n"
        formatted_text += f"Code:\n{code}"
        
        return await self.embed_single(formatted_text)
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        if not embedding1 or not embedding2:
            return 0.0
        
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Cosine similarity
        dot_product = np.dot(vec1, vec2)
        magnitude1 = np.linalg.norm(vec1)
        magnitude2 = np.linalg.norm(vec2)
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    async def close(self):
        if self.session:
            await self.session.close()

# Usage for leo code indexing
embedding_service = NomicEmbeddingService()

async def index_code_file(file_path: str, content: str, language: str) -> bool:
    """Index a code file for semantic search"""
    try:
        # Split large files into chunks
        chunks = split_code_into_chunks(content, max_tokens=6000)
        
        embeddings = []
        for chunk in chunks:
            embedding = await embedding_service.embed_code_snippet(
                code=chunk,
                language=language,
                context=f"File: {file_path}"
            )
            if embedding:
                embeddings.append(embedding)
        
        # Store embeddings in SQLite-vec
        await store_embeddings_in_db(file_path, embeddings, chunks)
        return True
        
    except Exception as e:
        print(f"Failed to index {file_path}: {e}")
        return False

def split_code_into_chunks(code: str, max_tokens: int = 6000) -> List[str]:
    """Split code into semantic chunks that fit in context window"""
    # Simple line-based splitting for now
    lines = code.split('\n')
    chunks = []
    current_chunk = []
    current_length = 0
    
    for line in lines:
        # Rough token estimation (1 token ≈ 4 characters)
        line_tokens = len(line) // 4
        
        if current_length + line_tokens > max_tokens and current_chunk:
            # Save current chunk and start new one
            chunks.append('\n'.join(current_chunk))
            current_chunk = [line]
            current_length = line_tokens
        else:
            current_chunk.append(line)
            current_length += line_tokens
    
    # Add final chunk
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks