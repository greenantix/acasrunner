import logging
import sys
from typing import Dict, Any
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields from record
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'lineno', 'funcName', 'created', 
                          'msecs', 'relativeCreated', 'thread', 'threadName', 
                          'processName', 'process', 'exc_info', 'exc_text', 'stack_info']:
                log_data[key] = value
        
        return json.dumps(log_data, default=str)

class leoLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter for leo-specific context"""
    
    def process(self, msg, kwargs):
        """Add context to log messages"""
        extra = kwargs.get('extra', {})
        
        # Add default leo context
        extra.update({
            'service': 'leo-backend',
            'version': '1.0.0',
            **self.extra
        })
        
        kwargs['extra'] = extra
        return msg, kwargs

def setup_logging(
    level: str = "INFO",
    json_format: bool = False,
    log_file: str = None
) -> None:
    """Setup logging configuration for leo"""
    
    # Clear any existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    
    # Set level
    log_level = getattr(logging, level.upper(), logging.INFO)
    root_logger.setLevel(log_level)
    
    # Create formatter
    if json_format:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("firebase_admin").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    
    # Create leo-specific loggers
    leo_logger = logging.getLogger("leo")
    leo_logger.setLevel(log_level)

def get_logger(name: str, **context) -> leoLoggerAdapter:
    """Get a logger with leo context"""
    logger = logging.getLogger(f"leo.{name}")
    return leoLoggerAdapter(logger, context)

def log_api_request(
    endpoint: str,
    method: str,
    user_id: str = None,
    project_id: str = None,
    duration_ms: float = None,
    status_code: int = None,
    **kwargs
):
    """Log API request with structured data"""
    logger = get_logger("api")
    
    log_data = {
        'event_type': 'api_request',
        'endpoint': endpoint,
        'method': method,
        'user_id': user_id,
        'project_id': project_id,
        'duration_ms': duration_ms,
        'status_code': status_code,
        **kwargs
    }
    
    level = logging.INFO
    if status_code and status_code >= 400:
        level = logging.WARNING
    if status_code and status_code >= 500:
        level = logging.ERROR
    
    logger.log(level, f"{method} {endpoint}", extra=log_data)

def log_service_event(
    service: str,
    event: str,
    success: bool = True,
    duration_ms: float = None,
    **kwargs
):
    """Log service event with structured data"""
    logger = get_logger("service")
    
    log_data = {
        'event_type': 'service_event',
        'service': service,
        'event': event,
        'success': success,
        'duration_ms': duration_ms,
        **kwargs
    }
    
    level = logging.INFO if success else logging.ERROR
    message = f"{service}: {event} {'succeeded' if success else 'failed'}"
    
    logger.log(level, message, extra=log_data)

def log_leo_decision(
    operation: str,
    decision: str,
    confidence: float = None,
    user_id: str = None,
    project_id: str = None,
    **kwargs
):
    """Log LEO gatekeeper decisions"""
    logger = get_logger("leo")
    
    log_data = {
        'event_type': 'leo_decision',
        'operation': operation,
        'decision': decision,
        'confidence': confidence,
        'user_id': user_id,
        'project_id': project_id,
        **kwargs
    }
    
    logger.info(f"LEO decision: {decision} for {operation}", extra=log_data)

def log_struggle_pattern(
    pattern_type: str,
    severity: str,
    user_id: str,
    project_id: str = None,
    frequency: int = None,
    **kwargs
):
    """Log struggle pattern detection"""
    logger = get_logger("struggle")
    
    log_data = {
        'event_type': 'struggle_pattern',
        'pattern_type': pattern_type,
        'severity': severity,
        'user_id': user_id,
        'project_id': project_id,
        'frequency': frequency,
        **kwargs
    }
    
    level = logging.WARNING
    if severity in ['high', 'critical']:
        level = logging.ERROR
    
    logger.log(level, f"Struggle pattern detected: {pattern_type}", extra=log_data)

def log_embedding_operation(
    operation: str,
    file_count: int = None,
    success_count: int = None,
    error_count: int = None,
    duration_ms: float = None,
    **kwargs
):
    """Log embedding operations"""
    logger = get_logger("embedding")
    
    log_data = {
        'event_type': 'embedding_operation',
        'operation': operation,
        'file_count': file_count,
        'success_count': success_count,
        'error_count': error_count,
        'duration_ms': duration_ms,
        **kwargs
    }
    
    success_rate = success_count / file_count if file_count and success_count else None
    level = logging.INFO
    if success_rate and success_rate < 0.9:
        level = logging.WARNING
    
    logger.log(level, f"Embedding {operation}: {success_count}/{file_count} files", extra=log_data)

# Middleware for request logging
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request start
        logger = get_logger("request")
        
        # Extract user info if available
        user_id = None
        if hasattr(request.state, 'user'):
            user_id = getattr(request.state.user, 'uid', None)
        
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Log request completion
        log_api_request(
            endpoint=str(request.url.path),
            method=request.method,
            user_id=user_id,
            duration_ms=duration_ms,
            status_code=response.status_code,
            query_params=dict(request.query_params),
            user_agent=request.headers.get('user-agent')
        )
        
        return response

# Performance monitoring helpers
class PerformanceTimer:
    """Context manager for timing operations"""
    
    def __init__(self, operation_name: str, logger: logging.Logger = None):
        self.operation_name = operation_name
        self.logger = logger or get_logger("performance")
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000
        
        success = exc_type is None
        level = logging.INFO if success else logging.ERROR
        
        self.logger.log(
            level,
            f"Operation {self.operation_name} completed in {duration_ms:.2f}ms",
            extra={
                'event_type': 'performance_timing',
                'operation': self.operation_name,
                'duration_ms': duration_ms,
                'success': success,
                'error_type': exc_type.__name__ if exc_type else None
            }
        )

# Export commonly used functions
__all__ = [
    'setup_logging',
    'get_logger',
    'log_api_request',
    'log_service_event',
    'log_leo_decision',
    'log_struggle_pattern',
    'log_embedding_operation',
    'RequestLoggingMiddleware',
    'PerformanceTimer'
]