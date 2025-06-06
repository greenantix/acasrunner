#!/usr/bin/env python3
"""
ACAS Backend Startup Script

This script initializes and runs the ACAS (AI Coding Assistant System) backend.
It performs system checks, validates configuration, and starts the FastAPI server.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.utils.config import get_settings, validate_configuration, setup_logging
from src.utils.logging_config import get_logger, log_service_event

def check_system_requirements():
    """Check system requirements and dependencies"""
    logger = get_logger("startup")
    
    requirements = []
    
    # Check Python version
    if sys.version_info < (3.8, 0):
        requirements.append("Python 3.8+ is required")
    
    # Check required directories
    data_dir = Path("./data")
    if not data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Created data directory")
    
    # Check environment variables
    env_file = Path(".env")
    if not env_file.exists():
        requirements.append(".env file not found. Copy .env.example to .env and configure.")
    
    return requirements

def check_service_dependencies():
    """Check external service dependencies"""
    import aiohttp
    logger = get_logger("startup")
    
    async def check_lm_studio():
        """Check if LM Studio is running"""
        settings = get_settings()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{settings.lm_studio_url}/v1/models",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        logger.info("✅ LM Studio connection verified")
                        return True
        except Exception as e:
            logger.warning(f"❌ LM Studio not available: {e}")
            return False
        return False
    
    async def check_embedding_service():
        """Check if embedding service is running"""
        settings = get_settings()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{settings.embedding_service_url}/v1/models",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        logger.info("✅ Embedding service connection verified")
                        return True
        except Exception as e:
            logger.warning(f"❌ Embedding service not available: {e}")
            return False
        return False
    
    # Run checks
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        lm_studio_ok = loop.run_until_complete(check_lm_studio())
        embedding_ok = loop.run_until_complete(check_embedding_service())
        
        if not lm_studio_ok:
            logger.warning("LM Studio not available. LEO gatekeeper will not function.")
        
        if not embedding_ok:
            logger.warning("Embedding service not available. Code indexing will not function.")
        
        return lm_studio_ok and embedding_ok
        
    finally:
        loop.close()

def initialize_database():
    """Initialize the vector database"""
    from src.services.vector_service import VectorService
    logger = get_logger("startup")
    
    try:
        vector_service = VectorService()
        logger.info("✅ Vector database initialized")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize vector database: {e}")
        return False

def validate_firebase_config():
    """Validate Firebase configuration"""
    from src.services.firebase_service import FirebaseService
    logger = get_logger("startup")
    
    try:
        firebase_service = FirebaseService()
        logger.info("✅ Firebase configuration validated")
        return True
    except Exception as e:
        logger.error(f"❌ Firebase configuration invalid: {e}")
        return False

def print_startup_banner():
    """Print startup banner"""
    banner = """
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║     🤖 ACAS - AI Coding Assistant System                     ║
    ║                                                               ║
    ║     Local AI + Cloud Collaboration Platform                   ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def print_system_status(
    config_valid: bool,
    db_ok: bool,
    firebase_ok: bool,
    services_ok: bool
):
    """Print system status"""
    print("\n📊 System Status:")
    print(f"   Configuration: {'✅ Valid' if config_valid else '❌ Invalid'}")
    print(f"   Vector Database: {'✅ Ready' if db_ok else '❌ Failed'}")
    print(f"   Firebase: {'✅ Connected' if firebase_ok else '❌ Disconnected'}")
    print(f"   External Services: {'✅ Available' if services_ok else '⚠️  Partial'}")
    
    if not all([config_valid, db_ok, firebase_ok]):
        print("\n⚠️  Some services are not available. ACAS may have limited functionality.")
    else:
        print("\n🚀 All systems ready! ACAS is fully operational.")

def main():
    """Main startup function"""
    print_startup_banner()
    
    # Load settings and setup logging
    settings = get_settings()
    setup_logging(settings.log_level)
    logger = get_logger("startup")
    
    logger.info("Starting ACAS Backend...")
    
    # Check system requirements
    system_issues = check_system_requirements()
    if system_issues:
        logger.error("System requirements not met:")
        for issue in system_issues:
            logger.error(f"  - {issue}")
        sys.exit(1)
    
    # Validate configuration
    config_valid, config_issues = validate_configuration()
    if config_issues:
        logger.warning("Configuration issues detected:")
        for issue in config_issues:
            logger.warning(f"  - {issue}")
    
    # Initialize components
    db_ok = initialize_database()
    firebase_ok = validate_firebase_config()
    services_ok = check_service_dependencies()
    
    # Print status
    print_system_status(config_valid, db_ok, firebase_ok, services_ok)
    
    # Check if we can start the server
    if not db_ok:
        logger.error("Cannot start without vector database. Please check configuration.")
        sys.exit(1)
    
    if not firebase_ok:
        logger.error("Cannot start without Firebase. Please check configuration.")
        sys.exit(1)
    
    # Log startup event
    log_service_event(
        service="acas-backend",
        event="startup",
        success=True,
        config_valid=config_valid,
        db_ok=db_ok,
        firebase_ok=firebase_ok,
        services_ok=services_ok
    )
    
    # Start the server
    import uvicorn
    from src.main import app
    
    print(f"\n🌐 Starting server on {settings.api_host}:{settings.api_port}")
    print(f"📚 API documentation available at: http://{settings.api_host}:{settings.api_port}/docs")
    print(f"🔧 Health check endpoint: http://{settings.api_host}:{settings.api_port}/health")
    
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
        access_log=settings.debug
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 ACAS Backend stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n💥 Failed to start ACAS Backend: {e}")
        sys.exit(1)