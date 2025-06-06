import os
from pydantic import BaseSettings, validator
from typing import Optional, List
import logging

class Settings(BaseSettings):
    """Application configuration settings"""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    log_level: str = "INFO"
    
    # Firebase Configuration
    firebase_project_id: Optional[str] = None
    firebase_private_key_id: Optional[str] = None
    firebase_private_key: Optional[str] = None
    firebase_client_email: Optional[str] = None
    firebase_client_id: Optional[str] = None
    firebase_auth_uri: str = "https://accounts.google.com/o/oauth2/auth"
    firebase_token_uri: str = "https://oauth2.googleapis.com/token"
    firebase_cert_url: Optional[str] = None
    
    # Alternative: Firebase service account file path
    google_application_credentials: Optional[str] = None
    
    # LM Studio Configuration
    lm_studio_url: str = "http://localhost:1234"
    embedding_service_url: str = "http://localhost:1235"  # Different port for embeddings
    leo_model_name: str = "meta-llama-3.1-8b-instruct"
    embedding_model_name: str = "text-embedding-nomic-embed-text-v1.5-embedding"
    
    # Database Configuration
    vector_db_path: str = "./data/embeddings.db"
    
    # Cache Configuration
    cache_size: int = 1000
    cache_ttl: int = 300  # 5 minutes
    
    # Security Configuration
    cors_origins: List[str] = ["*"]  # Configure appropriately for production
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]
    
    # Rate Limiting Configuration
    rate_limit_enabled: bool = True
    rate_limit_search_per_hour: int = 100
    rate_limit_index_per_hour: int = 1000
    rate_limit_struggle_per_hour: int = 50
    
    # Performance Configuration
    max_concurrent_embeddings: int = 10
    embedding_batch_size: int = 5
    max_content_length: int = 1024 * 1024  # 1MB
    
    # Monitoring Configuration
    enable_metrics: bool = True
    metrics_port: int = 9090
    
    @validator('firebase_private_key')
    def decode_private_key(cls, v):
        """Decode Firebase private key from environment"""
        if v:
            return v.replace('\\n', '\n')
        return v
    
    @validator('log_level')
    def validate_log_level(cls, v):
        """Validate log level"""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'Log level must be one of: {valid_levels}')
        return v.upper()
    
    @validator('vector_db_path')
    def create_db_directory(cls, v):
        """Ensure database directory exists"""
        import os
        db_dir = os.path.dirname(v)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        return v
    
    def is_firebase_configured(self) -> bool:
        """Check if Firebase is properly configured"""
        if self.google_application_credentials:
            return os.path.exists(self.google_application_credentials)
        
        required_fields = [
            self.firebase_project_id,
            self.firebase_private_key,
            self.firebase_client_email
        ]
        return all(field is not None for field in required_fields)
    
    def is_lm_studio_configured(self) -> bool:
        """Check if LM Studio is configured"""
        return bool(self.lm_studio_url)
    
    def get_database_url(self) -> str:
        """Get the full database URL"""
        return os.path.abspath(self.vector_db_path)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

class DevelopmentSettings(Settings):
    """Development-specific settings"""
    debug: bool = True
    log_level: str = "DEBUG"
    rate_limit_enabled: bool = False
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]

class ProductionSettings(Settings):
    """Production-specific settings"""
    debug: bool = False
    log_level: str = "INFO"
    cors_origins: List[str] = []  # Must be explicitly set in production
    api_host: str = "127.0.0.1"  # More restrictive in production

class TestSettings(Settings):
    """Test-specific settings"""
    debug: bool = True
    log_level: str = "DEBUG"
    vector_db_path: str = ":memory:"  # Use in-memory database for tests
    rate_limit_enabled: bool = False
    firebase_project_id: str = "test-project"

def get_settings() -> Settings:
    """Get application settings based on environment"""
    environment = os.getenv("ENVIRONMENT", "development").lower()
    
    if environment == "production":
        return ProductionSettings()
    elif environment == "test":
        return TestSettings()
    else:
        return DevelopmentSettings()

def setup_logging(settings: Settings):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            # Add file handler for production
            *([logging.FileHandler("leo.log")] if not settings.debug else [])
        ]
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("firebase_admin").setLevel(logging.WARNING)

def validate_required_services(settings: Settings) -> List[str]:
    """Validate that required services are configured"""
    missing_services = []
    
    if not settings.is_firebase_configured():
        missing_services.append("Firebase (check Firebase environment variables)")
    
    if not settings.is_lm_studio_configured():
        missing_services.append("LM Studio (check LM_STUDIO_URL)")
    
    # Check if vector database directory is writable
    try:
        db_dir = os.path.dirname(settings.get_database_url())
        if not os.access(db_dir, os.W_OK):
            missing_services.append(f"Vector database directory not writable: {db_dir}")
    except Exception as e:
        missing_services.append(f"Vector database path error: {e}")
    
    return missing_services

def create_service_urls(settings: Settings) -> dict:
    """Create service URLs configuration"""
    return {
        "leo_gatekeeper": f"{settings.lm_studio_url}/v1/chat/completions",
        "embedding_service": f"{settings.embedding_service_url}/v1/embeddings",
        "vector_database": settings.get_database_url(),
        "firebase_project": settings.firebase_project_id
    }

# Configuration validation
def validate_configuration():
    """Validate the complete configuration"""
    settings = get_settings()
    
    # Check required services
    missing = validate_required_services(settings)
    if missing:
        logging.warning(f"Missing or misconfigured services: {', '.join(missing)}")
        return False, missing
    
    # Validate CORS configuration for production
    if not settings.debug and settings.cors_origins == ["*"]:
        logging.warning("CORS origins set to '*' in production mode")
        return False, ["CORS origins must be explicitly configured for production"]
    
    return True, []

# Export settings instance
settings = get_settings()

# Setup logging
setup_logging(settings)