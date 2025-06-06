# test_embedding_service.py
import asyncio
import sys
import os

# Add your project root to path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.embedding_service import NomicEmbeddingService

async def test_embedding_service():
    """Test script to verify Nomic embedding service configuration"""
    
    print("🔍 Testing Nomic Embedding Service...")
    print("=" * 50)
    
    # Use port 1234 to match your current setup
    embedding_service = NomicEmbeddingService(base_url="http://localhost:1234")
    
    # Test single embedding
    test_code = """
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)
    """
    
    try:
        print("📝 Testing single code embedding...")
        embedding = await embedding_service.embed_code_snippet(
            code=test_code,
            language="python",
            context="Fibonacci function"
        )
        
        if embedding:
            print(f"✅ Embedding generated successfully!")
            print(f"📊 Dimensions: {len(embedding)}")  # Should be 768
            print(f"🔢 Sample values: {embedding[:5]}")
            print(f"📈 Vector norm: {sum(x*x for x in embedding)**0.5:.4f}")
        else:
            print("❌ Embedding generation failed")
            return False
        
        # Test batch processing
        print("\n📦 Testing batch embeddings...")
        test_snippets = [
            "def hello(): print('Hello World')",
            "class Calculator: pass",
            "import numpy as np"
        ]
        
        batch_embeddings = await embedding_service.embed_batch(test_snippets)
        successful_embeddings = sum(1 for emb in batch_embeddings if emb is not None)
        
        print(f"✅ Batch processed: {successful_embeddings}/{len(test_snippets)} successful")
        
        # Test similarity calculation
        if len(batch_embeddings) >= 2 and batch_embeddings[0] and batch_embeddings[1]:
            similarity = embedding_service.calculate_similarity(
                batch_embeddings[0], 
                batch_embeddings[1]
            )
            print(f"🔗 Similarity test: {similarity:.4f}")
        
        print("\n🎉 All tests passed! Your embedding service is ready.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
    finally:
        await embedding_service.close()

async def test_connection():
    """Test basic connection to LM Studio"""
    print("🔌 Testing LM Studio connection on port 1234...")
    
    embedding_service = NomicEmbeddingService(base_url="http://localhost:1234")
    
    try:
        # Simple connection test
        embedding = await embedding_service.embed_single("test")
        if embedding:
            print("✅ LM Studio connection successful")
            return True
        else:
            print("❌ LM Studio connection failed")
            return False
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        print("💡 Make sure LM Studio is running on port 1234 with Nomic model loaded")
        return False
    finally:
        await embedding_service.close()

if __name__ == "__main__":
    print("🚀 ACAS Embedding Service Test Suite")
    print("=" * 50)
    
    # Run connection test first
    connection_success = asyncio.run(test_connection())
    
    if connection_success:
        print("\n" + "=" * 50)
        # Run full test suite
        test_success = asyncio.run(test_embedding_service())
        
        if test_success:
            print("\n🎯 Ready to integrate with ACAS!")
            print("💡 Next: Set up SQLite-vec database")
        else:
            print("\n🔧 Fix the issues above before proceeding")
    else:
        print("\n🛠️  Setup checklist:")
        print("   1. Make sure LM Studio server is running")
        print("   2. Verify Nomic embedding model is loaded")
        print("   3. Confirm server is on port 1234")
        print("   4. Run this test again")