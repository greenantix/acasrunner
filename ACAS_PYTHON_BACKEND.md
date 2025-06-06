# leo Python Backend Implementation

This document describes the complete Python FastAPI backend implementation for the AI Coding Assistant System (leo) that integrates with the existing TypeScript/Next.js frontend and Firebase infrastructure.

## 🏗️ Architecture Overview

The Python backend serves as the core AI processing engine that bridges:
- **Local AI Models** (LEO gatekeeper + Nomic embeddings via LM Studio)
- **Firebase Cloud Services** (authentication, metadata, collaboration)
- **SQLite-vec Database** (fast local vector storage)
- **VS Code Extension** (code indexing and search)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VS Code Ext   │◄──►│  Python Backend │◄──►│    Firebase     │
│   (TypeScript)  │    │   (FastAPI)     │    │ Auth + Metadata │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ LM Studio APIs  │    │   SQLite-vec    │
                       │ LEO + Embeddings│    │ Vector Storage  │
                       └─────────────────┘    └─────────────────┘
```

## 📁 File Structure

```
src/
├── main.py                     # FastAPI application entry point
├── services/
│   ├── embedding_service.py    # ✅ Nomic embedding API client
│   ├── leo_service.py          # ✅ LEO gatekeeper service
│   ├── vector_service.py       # NEW: SQLite-vec operations
│   └── firebase_service.py     # NEW: Firebase Admin SDK integration
├── middleware/
│   └── auth_middleware.py      # NEW: Authentication & authorization
├── models/
│   └── api_models.py          # NEW: Pydantic request/response models
├── utils/
│   ├── config.py              # NEW: Configuration management
│   └── logging_config.py      # NEW: Structured logging
└── data/                      # Vector database storage
    └── embeddings.db          # SQLite-vec database file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Note: sqlite-vec requires manual installation
# Follow instructions at: https://github.com/asg017/sqlite-vec
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Firebase and LM Studio configuration
nano .env
```

### 3. Start Required Services

```bash
# Start LM Studio with LEO model (Llama 3.1 8B)
# Run on port 1234

# Start embedding service with Nomic model
# Run on port 1235
```

### 4. Run the Backend

```bash
# Using the startup script (recommended)
python run_leo.py

# Or directly with uvicorn
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Verify Installation

```bash
# Check health endpoint
curl http://localhost:8000/health

# View API documentation
open http://localhost:8000/docs
```

## 🔧 Core Services

### VectorService (`src/services/vector_service.py`)

**Purpose**: Manages SQLite-vec database for code embeddings and semantic search.

**Key Features**:
- Compatible with existing TypeScript SQLite-vec schema
- Fallback similarity search if sqlite-vec extension unavailable
- Batch processing for efficient indexing
- Project-based isolation and statistics

**Usage**:
```python
vector_service = VectorService()

# Index a code file
await vector_service.index_code_snippet(
    file_path="src/components/Button.tsx",
    content="const Button = ({ children, onClick }) => { ... }",
    language="typescript",
    project_id="my-project",
    metadata={"function_name": "Button"}
)

# Search for similar code
results = await vector_service.search_similar_code(
    query="button component with click handler",
    project_id="my-project",
    limit=10
)
```

### LeoGatekeeperService (`src/services/leo_service.py`)

**Purpose**: Local AI gatekeeper for operation approval and struggle detection.

**Enhanced Features**:
- Structured operation evaluation
- Struggle pattern detection and categorization
- JSON-formatted decision responses
- Fallback handling for service failures

**Usage**:
```python
leo_service = LeoGatekeeperService()

# Evaluate code operation
decision = await leo_service.evaluate_code_operation(
    operation_type="index code file",
    file_path="src/api/auth.ts",
    details={"file_type": "typescript", "project_name": "leo"}
)

# Detect struggle patterns
pattern = await leo_service.detect_struggle_pattern(
    error_message="TypeError: Cannot read property 'map' of undefined",
    context={"file_path": "src/components/List.tsx", "language": "typescript"}
)
```

### FirebaseService (`src/services/firebase_service.py`)

**Purpose**: Integration with Firebase Admin SDK for authentication and data sync.

**Key Features**:
- User authentication and profile management
- Project creation and collaboration
- Struggle pattern tracking
- Search activity analytics
- Compatible with existing Firebase schema

**Usage**:
```python
firebase_service = FirebaseService()

# Verify user token
user = await firebase_service.verify_token(id_token)

# Create project
result = await firebase_service.create_project(
    user_uid=user['uid'],
    project_data={"name": "My Project", "description": "A cool project"}
)

# Record struggle
struggle_id = await firebase_service.record_struggle(
    user_uid=user['uid'],
    struggle_data={
        "pattern_type": "syntax",
        "error_message": "Missing semicolon",
        "file_path": "src/index.js"
    }
)
```

## 🛡️ Authentication & Security

### JWT Token Validation

All protected endpoints require Firebase JWT tokens:

```bash
curl -H "Authorization: Bearer <firebase-jwt-token>" \
     http://localhost:8000/api/projects
```

### Role-Based Access Control

```python
# Require verified email
@app.post("/api/projects")
async def create_project(user = Depends(require_verified_email)):
    pass

# Check project access
async def check_project_access(project_id: str, user: dict):
    project = await firebase_service.get_project(project_id, user['uid'])
    return project is not None
```

### Rate Limiting

```python
# Built-in rate limiting per user
rate_limiter = RateLimiter()

@app.post("/api/code/search")
async def search_code(user = Depends(rate_limiter.create_rate_limit_dependency("search"))):
    pass
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/profile` - Create/update user profile
- `GET /api/auth/profile` - Get user profile

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List user projects
- `GET /api/projects/{id}` - Get specific project
- `GET /api/projects/{id}/stats` - Get project statistics

### Code Operations
- `POST /api/code/index` - Index code file (LEO approval required)
- `POST /api/code/search` - Search similar code
- `GET /api/stats/overview` - Get overview statistics

### Struggle Tracking
- `POST /api/struggles` - Report struggle pattern
- `GET /api/struggles` - Get user struggle history

### System
- `GET /` - API information
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

## 🔄 Integration with Existing Codebase

### TypeScript Compatibility

The Python backend is designed to work alongside the existing TypeScript infrastructure:

1. **Shared Database**: Uses the same SQLite-vec database schema as the TypeScript service
2. **Firebase Integration**: Connects to the same Firebase project and collections
3. **Compatible APIs**: Provides endpoints that match the expected interface for the VS Code extension

### Migration Strategy

```typescript
// TypeScript services can gradually delegate to Python backend
const pythonBackend = 'http://localhost:8000';

async function searchCode(query: string) {
  // Use Python backend for AI-powered search
  const response = await fetch(`${pythonBackend}/api/code/search`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${firebaseToken}` },
    body: JSON.stringify({ query })
  });
  return response.json();
}
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_vector_service.py

# Run with coverage
pytest --cov=src tests/
```

### Integration Tests

```bash
# Test full workflow
pytest tests/test_integration.py

# Test with real Firebase (requires test config)
ENVIRONMENT=test pytest tests/test_firebase_integration.py
```

### Load Testing

```bash
# Test search performance
python tests/load_test_search.py

# Test indexing performance
python tests/load_test_indexing.py
```

## 📊 Monitoring & Logging

### Structured Logging

```python
from src.utils.logging_config import get_logger, log_api_request

logger = get_logger("my_service")
logger.info("Processing request", extra={"user_id": "123", "project_id": "abc"})

# API requests are automatically logged
log_api_request(
    endpoint="/api/code/search",
    method="POST",
    user_id="123",
    duration_ms=250.5,
    status_code=200
)
```

### Performance Monitoring

```python
from src.utils.logging_config import PerformanceTimer

async def expensive_operation():
    with PerformanceTimer("embedding_generation"):
        embeddings = await generate_embeddings(content)
    return embeddings
```

### Health Monitoring

```bash
# Check service health
curl http://localhost:8000/health

# Response includes service status
{
  "status": "healthy",
  "services": {
    "firebase": "connected",
    "vector_db": "connected",
    "leo_gatekeeper": "connected",
    "embedding_service": "connected"
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Core services
FIREBASE_PROJECT_ID=your-project
LM_STUDIO_URL=http://localhost:1234
VECTOR_DB_PATH=./data/embeddings.db

# Performance tuning
MAX_CONCURRENT_EMBEDDINGS=10
EMBEDDING_BATCH_SIZE=5
RATE_LIMIT_SEARCH_PER_HOUR=100

# Security
CORS_ORIGINS=https://yourdomain.com
```

### Production Configuration

```python
# Production settings
class ProductionSettings(Settings):
    debug: bool = False
    log_level: str = "INFO"
    cors_origins: List[str] = ["https://yourdomain.com"]
    api_host: str = "127.0.0.1"
```

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src/ src/
COPY run_leo.py .

EXPOSE 8000
CMD ["python", "run_leo.py"]
```

### Production Checklist

- [ ] Configure Firebase service account
- [ ] Set up LM Studio with proper models
- [ ] Configure CORS origins
- [ ] Set up SSL/TLS termination
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure backup for vector database
- [ ] Set up log aggregation

## 🤝 Integration Points

### VS Code Extension

The extension should call Python backend endpoints:

```typescript
// In VS Code extension
const leoBackend = 'http://localhost:8000';

async function indexCurrentFile() {
  const content = vscode.window.activeTextEditor?.document.getText();
  const language = vscode.window.activeTextEditor?.document.languageId;
  
  await fetch(`${leoBackend}/api/code/index`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file_path: currentFile,
      content,
      language,
      project_id: currentProject
    })
  });
}
```

### Next.js Frontend

The web interface can proxy requests to the Python backend:

```typescript
// In Next.js API route
export async function POST(request: Request) {
  const body = await request.json();
  
  const response = await fetch('http://localhost:8000/api/code/search', {
    method: 'POST',
    headers: {
      'Authorization': request.headers.get('authorization'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  return Response.json(await response.json());
}
```

## 🎯 Success Criteria

✅ **Authentication**: Firebase token validation working  
✅ **LEO Integration**: Local gatekeeper making decisions  
✅ **Vector Search**: Code indexing and similarity search functional  
✅ **Firebase Sync**: Metadata syncing to Firestore  
✅ **Error Handling**: Graceful degradation and retry logic  
✅ **Performance**: Sub-second response times for search  
✅ **Documentation**: API documentation with OpenAPI/Swagger  
✅ **Compatibility**: Works with existing TypeScript infrastructure  

## 🔍 Troubleshooting

### Common Issues

1. **sqlite-vec not found**
   ```bash
   # Install sqlite-vec extension
   # Follow: https://github.com/asg017/sqlite-vec
   ```

2. **Firebase initialization failed**
   ```bash
   # Check environment variables
   echo $FIREBASE_PROJECT_ID
   # Verify service account key
   ```

3. **LM Studio connection failed**
   ```bash
   # Check if LM Studio is running
   curl http://localhost:1234/v1/models
   ```

4. **Import errors**
   ```bash
   # Ensure src is in Python path
   export PYTHONPATH="${PYTHONPATH}:./src"
   ```

### Debug Mode

```bash
# Run with debug logging
ENVIRONMENT=development LOG_LEVEL=DEBUG python run_leo.py

# Check specific service
python -c "from src.services.vector_service import VectorService; VectorService()"
```

This implementation provides a complete, production-ready Python backend that seamlessly integrates with your existing leo infrastructure while adding powerful AI capabilities through local models and cloud services.
