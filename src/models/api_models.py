from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any, Union
from datetime import datetime
from enum import Enum

# Enums
class ProjectRole(str, Enum):
    owner = "owner"
    admin = "admin"
    collaborator = "collaborator"
    viewer = "viewer"

class StrugglePattern(str, Enum):
    syntax = "syntax"
    logic = "logic"
    dependency = "dependency"
    environment = "environment"
    other = "other"

class StruggleSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class RecommendedAction(str, Enum):
    auto_fix = "auto_fix"
    escalate = "escalate"
    provide_hints = "provide_hints"
    ignore = "ignore"

class LeoDecision(str, Enum):
    approve = "approve"
    deny = "deny"
    escalate = "escalate"

class IndexingStatus(str, Enum):
    pending = "pending"
    indexing = "indexing"
    completed = "completed"
    failed = "failed"
    empty = "empty"

# Base Models
class TimestampMixin(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# User Models
class UserProfile(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    bio: Optional[str] = None
    github_username: Optional[str] = None
    preferred_languages: Optional[List[str]] = []
    
class UserStats(BaseModel):
    total_searches: int = 0
    total_projects: int = 0
    total_struggles: int = 0
    last_activity: Optional[datetime] = None

class AuthenticatedUser(BaseModel):
    uid: str
    email: Optional[str]
    email_verified: bool = False
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: Optional[str] = None
    custom_claims: Dict[str, Any] = {}

# Project Models
class ProjectSettings(BaseModel):
    auto_index: bool = True
    file_patterns: List[str] = [".py", ".js", ".ts", ".java", ".cpp", ".c", ".go", ".rs"]
    exclude_patterns: List[str] = ["node_modules", "__pycache__", ".git", "dist", "build"]
    embedding_model: str = "nomic-embed-text-v1.5"
    max_file_size: int = 1024 * 1024  # 1MB
    enable_auto_struggle_detection: bool = True

class ProjectIndexingStatus(BaseModel):
    total_files: int = 0
    indexed_files: int = 0
    failed_files: int = 0
    last_indexed: Optional[datetime] = None
    status: IndexingStatus = IndexingStatus.pending
    error_message: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    settings: Optional[ProjectSettings] = ProjectSettings()
    
    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Project name cannot be empty')
        return v.strip()

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    settings: Optional[ProjectSettings] = None

class Project(TimestampMixin):
    project_id: str
    name: str
    description: str = ""
    owner_uid: str
    collaborators: Dict[str, ProjectRole] = {}
    settings: ProjectSettings = ProjectSettings()
    indexing_status: ProjectIndexingStatus = ProjectIndexingStatus()

class ProjectSummary(BaseModel):
    project_id: str
    name: str
    description: str = ""
    role: ProjectRole
    indexing_status: ProjectIndexingStatus
    last_activity: Optional[datetime] = None

# Code Models
class CodeMetadata(BaseModel):
    function_name: Optional[str] = None
    class_name: Optional[str] = None
    file_type: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    complexity_score: Optional[float] = None
    context_info: Dict[str, Any] = {}

class CodeIndexRequest(BaseModel):
    file_path: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)
    project_id: str = Field(..., min_length=1)
    metadata: Optional[CodeMetadata] = CodeMetadata()
    force_reindex: bool = False
    
    @validator('content')
    def validate_content_length(cls, v):
        if len(v) > 1024 * 1024:  # 1MB limit
            raise ValueError('Content too large (max 1MB)')
        return v
    
    @validator('file_path')
    def validate_file_path(cls, v):
        if not v.strip():
            raise ValueError('File path cannot be empty')
        return v.strip()

class BatchIndexRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    files: List[CodeIndexRequest] = Field(..., min_items=1, max_items=100)

class CodeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    project_id: Optional[str] = None
    language: Optional[str] = None
    file_types: Optional[List[str]] = None
    limit: int = Field(10, ge=1, le=100)
    threshold: float = Field(0.7, ge=0.0, le=1.0)
    include_context: bool = True

class CodeSearchResult(BaseModel):
    file_path: str
    content: str
    language: str
    function_name: Optional[str] = None
    class_name: Optional[str] = None
    similarity: float
    context_info: Dict[str, Any] = {}
    project_id: Optional[str] = None

class CodeSearchResponse(BaseModel):
    query: str
    results: List[CodeSearchResult]
    total: int
    search_time_ms: Optional[float] = None
    cached: bool = False

# Struggle Models
class StruggleContext(BaseModel):
    file_path: Optional[str] = None
    language: Optional[str] = None
    line_number: Optional[int] = None
    error_count: int = 0
    time_since_last: Optional[str] = None
    stack_trace: Optional[str] = None
    user_action: Optional[str] = None
    additional_info: Dict[str, Any] = {}

class StruggleReport(BaseModel):
    project_id: Optional[str] = None
    error_message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[StruggleContext] = StruggleContext()
    
    @validator('error_message')
    def validate_error_message(cls, v):
        if not v.strip():
            raise ValueError('Error message cannot be empty')
        return v.strip()

class LeoAnalysis(BaseModel):
    pattern_type: Optional[StrugglePattern] = None
    severity: Optional[StruggleSeverity] = None
    confidence: Optional[float] = None
    recommended_action: Optional[RecommendedAction] = None
    reasoning: Optional[str] = None

class StruggleRecord(TimestampMixin):
    struggle_id: str
    user_uid: str
    project_id: Optional[str] = None
    error_message: str
    error_hash: str
    frequency: int = 1
    status: str = "active"
    context: StruggleContext = StruggleContext()
    leo_analysis: Optional[LeoAnalysis] = None
    escalation_threshold: int = 3
    auto_ignore: bool = False

# LEO Models
class LeoDecisionRequest(BaseModel):
    operation_type: str
    file_path: Optional[str] = None
    context: Dict[str, Any] = {}

class LeoDecisionResponse(BaseModel):
    decision: LeoDecision
    confidence: Optional[float] = None
    risk_level: Optional[str] = None
    reasoning: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class LeoOperationResult(BaseModel):
    success: bool
    decision: Optional[LeoDecisionResponse] = None
    error: Optional[str] = None

# Statistics Models
class ProjectStats(BaseModel):
    total_files: int = 0
    indexed_files: int = 0
    languages: int = 0
    total_chars: int = 0
    last_indexed: Optional[datetime] = None
    status: IndexingStatus = IndexingStatus.empty
    
    # Language breakdown
    language_distribution: Dict[str, int] = {}
    file_type_distribution: Dict[str, int] = {}
    
    # Performance metrics
    average_similarity_scores: Optional[float] = None
    search_performance: Optional[Dict[str, float]] = None

class SystemStats(BaseModel):
    total_embeddings: int = 0
    total_projects: int = 0
    total_users: int = 0
    active_users_24h: int = 0
    
    # Resource usage
    database_size_mb: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    
    # Service health
    services_status: Dict[str, str] = {}
    uptime_seconds: Optional[float] = None

class UserOverviewStats(BaseModel):
    user: Dict[str, Any] = {}
    projects: List[ProjectSummary] = []
    recent_searches: int = 0
    recent_struggles: int = 0
    system: SystemStats = SystemStats()

# Response Models
class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class HealthCheckResponse(BaseModel):
    status: str  # "healthy", "degraded", "unhealthy"
    services: Dict[str, str]
    timestamp: datetime = Field(default_factory=datetime.now)
    uptime_seconds: Optional[float] = None

# Pagination Models
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(10, ge=1, le=100)
    
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

# Webhook Models (for future integrations)
class WebhookEvent(BaseModel):
    event_type: str
    timestamp: datetime = Field(default_factory=datetime.now)
    user_uid: Optional[str] = None
    project_id: Optional[str] = None
    data: Dict[str, Any] = {}

# Export all models
__all__ = [
    # Enums
    'ProjectRole', 'StrugglePattern', 'StruggleSeverity', 'RecommendedAction', 
    'LeoDecision', 'IndexingStatus',
    
    # User Models
    'UserProfile', 'UserStats', 'AuthenticatedUser',
    
    # Project Models
    'ProjectSettings', 'ProjectIndexingStatus', 'ProjectCreate', 'ProjectUpdate',
    'Project', 'ProjectSummary',
    
    # Code Models
    'CodeMetadata', 'CodeIndexRequest', 'BatchIndexRequest', 'CodeSearchRequest',
    'CodeSearchResult', 'CodeSearchResponse',
    
    # Struggle Models
    'StruggleContext', 'StruggleReport', 'LeoAnalysis', 'StruggleRecord',
    
    # LEO Models
    'LeoDecisionRequest', 'LeoDecisionResponse', 'LeoOperationResult',
    
    # Statistics Models
    'ProjectStats', 'SystemStats', 'UserOverviewStats',
    
    # Response Models
    'SuccessResponse', 'ErrorResponse', 'HealthCheckResponse',
    'PaginatedResponse', 'PaginationParams',
    
    # Webhook Models
    'WebhookEvent'
]