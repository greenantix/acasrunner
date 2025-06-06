from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import asyncio
import logging
import os
from contextlib import asynccontextmanager

# Import our services
from .services.firebase_service import FirebaseService
from .services.vector_service import VectorService
from .services.leo_service import LeoGatekeeperService, process_operation_request
from .services.embedding_service import NomicEmbeddingService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global service instances
firebase_service = None
vector_service = None
leo_service = None
embedding_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global firebase_service, vector_service, leo_service, embedding_service
    
    # Startup
    logger.info("🚀 Starting ACAS services...")
    
    try:
        firebase_service = FirebaseService()
        logger.info("✅ Firebase initialized")
        
        vector_service = VectorService()
        logger.info("✅ Vector database initialized")
        
        leo_service = LeoGatekeeperService()
        logger.info("✅ LEO gatekeeper ready")
        
        embedding_service = NomicEmbeddingService()
        logger.info("✅ Embedding service ready")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down ACAS services...")
    if leo_service:
        await leo_service.close()
    if embedding_service:
        await embedding_service.close()

# Create FastAPI app
app = FastAPI(
    title="ACAS - AI Coding Assistant System",
    description="Local AI coding assistant with cloud collaboration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class UserProfile(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    auto_index: Optional[bool] = True
    file_patterns: Optional[List[str]] = [".py", ".js", ".ts", ".java"]
    exclude_patterns: Optional[List[str]] = ["node_modules", "__pycache__", ".git"]

class CodeIndexRequest(BaseModel):
    file_path: str
    content: str
    language: str
    project_id: str
    metadata: Optional[Dict] = {}

class CodeSearchRequest(BaseModel):
    query: str
    project_id: Optional[str] = None
    language: Optional[str] = None
    limit: Optional[int] = 10
    threshold: Optional[float] = 0.7

class StruggleReport(BaseModel):
    project_id: Optional[str] = None
    error_message: str
    file_path: Optional[str] = None
    language: Optional[str] = None
    context: Optional[Dict] = {}

# Dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """FastAPI dependency for authenticated routes"""
    global firebase_service
    
    if not firebase_service:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase service not initialized"
        )
    
    token = credentials.credentials
    user_info = await firebase_service.verify_token(token)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_info

async def require_verified_email(user = Depends(get_current_user)):
    """Require email verification for sensitive operations"""
    if not user.get('email_verified', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    return user

# Root and health endpoints
@app.get("/")
async def root():
    return {"message": "ACAS AI Coding Assistant System", "status": "operational"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    global firebase_service, vector_service, leo_service, embedding_service
    
    services_status = {
        "firebase": "connected" if firebase_service else "disconnected",
        "vector_db": "connected" if vector_service else "disconnected",
        "leo_gatekeeper": "connected" if leo_service else "disconnected",
        "embedding_service": "connected" if embedding_service else "disconnected"
    }
    
    all_healthy = all(status == "connected" for status in services_status.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": services_status
    }

# Authentication endpoints
@app.post("/api/auth/profile")
async def create_or_update_profile(
    profile_data: UserProfile,
    user = Depends(get_current_user)
):
    """Create or update user profile"""
    global firebase_service
    
    success = await firebase_service.create_or_update_user_profile(
        uid=user['uid'],
        user_data=profile_data.dict(exclude_none=True)
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    
    return {"message": "Profile updated successfully"}

@app.get("/api/auth/profile")
async def get_profile(user = Depends(get_current_user)):
    """Get user profile"""
    global firebase_service
    
    profile = await firebase_service.get_user_profile(user['uid'])
    return {
        "uid": user['uid'],
        "email": user.get('email'),
        "email_verified": user.get('email_verified', False),
        "profile": profile
    }

# Project endpoints
@app.post("/api/projects")
async def create_project(
    project_data: ProjectCreate,
    user = Depends(require_verified_email)
):
    """Create a new project"""
    global firebase_service
    
    result = await firebase_service.create_project(
        user_uid=user['uid'],
        project_data=project_data.dict()
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to create project'))
    
    return {
        "message": "Project created successfully",
        "project_id": result['project_id'],
        "project": result['project_doc']
    }

@app.get("/api/projects")
async def get_user_projects(user = Depends(get_current_user)):
    """Get all projects for the current user"""
    global firebase_service
    
    projects = await firebase_service.get_user_projects(user['uid'])
    return {"projects": projects}

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, user = Depends(get_current_user)):
    """Get a specific project"""
    global firebase_service
    
    project = await firebase_service.get_project(project_id, user['uid'])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    return {"project": project}

@app.get("/api/projects/{project_id}/stats")
async def get_project_stats(project_id: str, user = Depends(get_current_user)):
    """Get indexing statistics for a project"""
    global firebase_service, vector_service
    
    # Check access
    project = await firebase_service.get_project(project_id, user['uid'])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    stats = await vector_service.get_project_stats(project_id)
    return {
        "project_id": project_id,
        "stats": stats
    }

# Code indexing and search endpoints
@app.post("/api/code/index")
async def index_code_file(
    request: CodeIndexRequest,
    user = Depends(get_current_user)
):
    """Index a code file for semantic search"""
    global firebase_service, vector_service, leo_service
    
    # Check project access
    project = await firebase_service.get_project(request.project_id, user['uid'])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    # Get LEO's approval for indexing operation
    leo_decision = await leo_service.evaluate_code_operation(
        operation_type="index code file",
        file_path=request.file_path,
        details={
            "file_type": request.language,
            "project_name": project.get('name', 'unknown'),
            "content_length": len(request.content),
            "user_uid": user['uid']
        }
    )
    
    if not leo_decision["success"]:
        raise HTTPException(status_code=500, detail="LEO service unavailable")
    
    decision = leo_decision["decision"]
    
    if decision.get("decision") == "deny":
        raise HTTPException(
            status_code=403, 
            detail=f"Operation denied: {decision.get('reasoning', 'LEO denied the operation')}"
        )
    
    if decision.get("decision") == "escalate":
        # TODO: Implement escalation to Claude Opus
        raise HTTPException(
            status_code=202, 
            detail="Operation requires escalation - not implemented yet"
        )
    
    # LEO approved - proceed with indexing
    success = await vector_service.index_code_snippet(
        file_path=request.file_path,
        content=request.content,
        language=request.language,
        project_id=request.project_id,
        metadata=request.metadata
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to index code file")
    
    # Update project indexing status
    await firebase_service.update_project_indexing_status(
        project_id=request.project_id,
        status_data={
            "status": "indexing",
            "last_indexed": "now"
        }
    )
    
    return {
        "message": "Code file indexed successfully",
        "file_path": request.file_path,
        "leo_decision": decision
    }

@app.post("/api/code/search")
async def search_code(
    request: CodeSearchRequest,
    user = Depends(get_current_user)
):
    """Search for similar code using semantic search"""
    global firebase_service, vector_service
    
    # If project_id specified, check access
    if request.project_id:
        project = await firebase_service.get_project(request.project_id, user['uid'])
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    results = await vector_service.search_similar_code(
        query=request.query,
        project_id=request.project_id,
        language=request.language,
        limit=request.limit or 10,
        threshold=request.threshold or 0.7
    )
    
    # Record search activity
    if request.project_id:
        await firebase_service.record_search_activity(
            user_uid=user['uid'],
            project_id=request.project_id,
            query=request.query,
            results_count=len(results)
        )
    
    return {
        "query": request.query,
        "results": results,
        "total": len(results)
    }

# Struggle detection endpoints
@app.post("/api/struggles")
async def report_struggle(
    struggle_data: StruggleReport,
    user = Depends(get_current_user)
):
    """Report a struggle pattern for tracking and analysis"""
    global firebase_service, leo_service
    
    # Use LEO to analyze the struggle pattern
    leo_analysis = await leo_service.detect_struggle_pattern(
        error_message=struggle_data.error_message,
        context={
            "file_path": struggle_data.file_path,
            "language": struggle_data.language,
            "project_id": struggle_data.project_id,
            **struggle_data.context
        }
    )
    
    # Prepare struggle data for Firebase
    struggle_record = {
        "project_id": struggle_data.project_id,
        "error_message": struggle_data.error_message,
        "file_path": struggle_data.file_path,
        "language": struggle_data.language,
        "context": struggle_data.context,
        "error_hash": str(hash(struggle_data.error_message)),
    }
    
    # Add LEO analysis if successful
    if leo_analysis.get("success") and "decision" in leo_analysis:
        decision = leo_analysis["decision"]
        struggle_record.update({
            "pattern_type": decision.get("pattern_type"),
            "severity": decision.get("severity"),
            "recommended_action": decision.get("recommended_action"),
            "leo_confidence": decision.get("confidence")
        })
    
    # Record in Firebase
    struggle_id = await firebase_service.record_struggle(
        user_uid=user['uid'],
        struggle_data=struggle_record
    )
    
    if not struggle_id:
        raise HTTPException(status_code=500, detail="Failed to record struggle")
    
    return {
        "message": "Struggle recorded successfully",
        "struggle_id": struggle_id,
        "leo_analysis": leo_analysis.get("decision") if leo_analysis.get("success") else None
    }

@app.get("/api/struggles")
async def get_user_struggles(
    project_id: Optional[str] = None,
    limit: int = 50,
    user = Depends(get_current_user)
):
    """Get user's struggle history"""
    global firebase_service
    
    struggles = await firebase_service.get_user_struggles(
        user_uid=user['uid'],
        project_id=project_id,
        limit=limit
    )
    
    return {"struggles": struggles}

# Statistics endpoints
@app.get("/api/stats/overview")
async def get_overview_stats(user = Depends(get_current_user)):
    """Get overview statistics for the user"""
    global firebase_service, vector_service
    
    # Get user's projects
    projects = await firebase_service.get_user_projects(user['uid'])
    
    # Get overall vector database stats
    vector_stats = await vector_service.get_all_stats()
    
    # Get user's struggles
    struggles = await firebase_service.get_user_struggles(user['uid'], limit=10)
    
    return {
        "user": {
            "total_projects": len(projects),
            "recent_struggles": len(struggles)
        },
        "system": {
            "total_embeddings": vector_stats.get("total_embeddings", 0),
            "supported_languages": list(vector_stats.get("languages", {}).keys())
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)