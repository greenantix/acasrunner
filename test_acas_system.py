# test_acas_system.py
import asyncio
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

async def test_acas_system():
    """Test the complete ACAS system"""
    print("🧪 Testing ACAS System Components...")
    print("=" * 50)
    
    try:
        # Test embedding service with correct port
        from src.services.embedding_service import NomicEmbeddingService
        embedding_service = NomicEmbeddingService()  # Now uses port 1234
        
        print("📝 Testing embedding service...")
        test_embedding = await embedding_service.embed_single("test code")
        if test_embedding:
            print(f"✅ Embedding service working! (Dimensions: {len(test_embedding)})")
        else:
            print("❌ Embedding service failed")
            return False
        
        # Test vector service
        from src.services.vector_service import VectorService
        vector_service = VectorService()
        
        print("📊 Testing vector service...")
        stats = await vector_service.get_all_stats()
        print(f"✅ Vector service working! (Total embeddings: {stats['total_embeddings']})")
        
        # Test LEO service
        from src.services.leo_service import LeoGatekeeperService
        leo_service = LeoGatekeeperService()
        
        print("🤖 Testing LEO gatekeeper...")
        test_decision = await leo_service.make_decision("Test operation: install lodash package")
        if test_decision.get("success"):
            print("✅ LEO service working!")
            print(f"   Decision: {test_decision['decision'].get('decision')}")
        else:
            print("❌ LEO service failed")
        
        print("\n🎉 ACAS System Ready!")
        print("💡 You can now run: python -m src.main")
        
        await embedding_service.close()
        await leo_service.close()
        return True
        
    except Exception as e:
        print(f"❌ System test failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_acas_system())
