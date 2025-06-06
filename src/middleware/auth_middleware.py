from fastapi import HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import logging
from ..services.firebase_service import FirebaseService

logger = logging.getLogger(__name__)

class AuthMiddleware:
    def __init__(self, firebase_service: FirebaseService):
        self.firebase_service = firebase_service
        self.security = HTTPBearer()
    
    async def get_current_user(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
    ) -> Dict[str, Any]:
        """FastAPI dependency for authenticated routes"""
        token = credentials.credentials
        user_info = await self.firebase_service.verify_token(token)
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_info
    
    async def require_verified_email(
        self, 
        user: Dict[str, Any] = Depends(lambda: None)  # Will be overridden
    ) -> Dict[str, Any]:
        """Require email verification for sensitive operations"""
        if user is None:
            user = await self.get_current_user()
        
        if not user.get('email_verified', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email verification required for this operation"
            )
        return user
    
    async def require_admin(
        self, 
        user: Dict[str, Any] = Depends(lambda: None)  # Will be overridden
    ) -> Dict[str, Any]:
        """Require admin privileges"""
        if user is None:
            user = await self.get_current_user()
        
        custom_claims = user.get('custom_claims', {})
        if not custom_claims.get('admin', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        return user
    
    async def check_project_access(
        self,
        project_id: str,
        user: Dict[str, Any],
        required_role: str = "collaborator"
    ) -> bool:
        """Check if user has access to a project with specified role"""
        try:
            project = await self.firebase_service.get_project(project_id, user['uid'])
            if not project:
                return False
            
            # Owner always has access
            if project.get('owner_uid') == user['uid']:
                return True
            
            # Check collaborator role
            collaborators = project.get('collaborators', {})
            user_role = collaborators.get(user['uid'])
            
            if not user_role:
                return False
            
            # Define role hierarchy
            role_hierarchy = {
                'viewer': 1,
                'collaborator': 2,
                'admin': 3,
                'owner': 4
            }
            
            required_level = role_hierarchy.get(required_role, 2)
            user_level = role_hierarchy.get(user_role, 1)
            
            return user_level >= required_level
            
        except Exception as e:
            logger.error(f"Error checking project access: {e}")
            return False
    
    def create_project_access_dependency(self, required_role: str = "collaborator"):
        """Create a dependency that checks project access"""
        async def check_access(
            project_id: str,
            user: Dict[str, Any] = Depends(lambda: None)  # Will be overridden
        ):
            if user is None:
                user = await self.get_current_user()
            
            has_access = await self.check_project_access(project_id, user, required_role)
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions for project {project_id}"
                )
            return user
        
        return check_access

class OptionalAuth:
    """Optional authentication for public endpoints that benefit from user context"""
    
    def __init__(self, firebase_service: FirebaseService):
        self.firebase_service = firebase_service
    
    async def get_optional_user(self, request: Request) -> Optional[Dict[str, Any]]:
        """Get user info if token is provided, otherwise return None"""
        auth_header = request.headers.get("authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header[7:]  # Remove "Bearer " prefix
        
        try:
            user_info = await self.firebase_service.verify_token(token)
            return user_info
        except Exception as e:
            logger.debug(f"Optional auth failed: {e}")
            return None

# Rate limiting helpers
class RateLimiter:
    """Simple in-memory rate limiter for development"""
    
    def __init__(self):
        self.requests = {}  # {user_id: {endpoint: [timestamps]}}
        self.limits = {
            'search': {'count': 100, 'window': 3600},  # 100 searches per hour
            'index': {'count': 1000, 'window': 3600},   # 1000 index operations per hour
            'struggle': {'count': 50, 'window': 3600}   # 50 struggle reports per hour
        }
    
    async def check_rate_limit(
        self, 
        user_id: str, 
        endpoint: str, 
        action: str = 'default'
    ) -> bool:
        """Check if user has exceeded rate limit for endpoint"""
        import time
        
        current_time = time.time()
        
        if user_id not in self.requests:
            self.requests[user_id] = {}
        
        if endpoint not in self.requests[user_id]:
            self.requests[user_id][endpoint] = []
        
        # Clean old requests
        window = self.limits.get(action, self.limits.get('default', {'window': 3600}))['window']
        cutoff_time = current_time - window
        
        self.requests[user_id][endpoint] = [
            timestamp for timestamp in self.requests[user_id][endpoint]
            if timestamp > cutoff_time
        ]
        
        # Check limit
        limit_config = self.limits.get(action, self.limits.get('default', {'count': 100}))
        current_count = len(self.requests[user_id][endpoint])
        
        if current_count >= limit_config['count']:
            return False
        
        # Add current request
        self.requests[user_id][endpoint].append(current_time)
        return True
    
    def create_rate_limit_dependency(self, endpoint: str, action: str = 'default'):
        """Create a dependency that enforces rate limiting"""
        async def check_limit(user: Dict[str, Any]):
            allowed = await self.check_rate_limit(user['uid'], endpoint, action)
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded for {action}"
                )
            return user
        
        return check_limit

# Error handling utilities
class AuthError(Exception):
    """Custom authentication error"""
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

def create_auth_error_handler():
    """Create error handler for authentication errors"""
    async def auth_error_handler(request: Request, exc: AuthError):
        from fastapi.responses import JSONResponse
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.message,
                "type": "authentication_error"
            }
        )
    
    return auth_error_handler

# Security headers middleware
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    return response