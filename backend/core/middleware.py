"""
Custom middleware for the restaurant backend.

Provides API versioning, request logging, and other cross-cutting concerns.
"""

import logging
import time
import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("restaurant.request")


class RequestLoggingMiddleware:
    """
    Middleware for structured request logging.
    
    Logs each request with:
    - Timestamp
    - Request ID (for tracing)
    - Method, path, status code
    - Duration
    - User ID (if authenticated)
    - IP address
    """
    
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Generate request ID for tracing (use 12 chars to reduce collision risk)
        request_id = uuid.uuid4().hex[:12]
        request.request_id = request_id  # Attach to request for use in views
        
        # Record start time
        start_time = time.time()
        
        # Process the request
        response = self.get_response(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Build log context
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "ip_address": self._get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
        }
        
        # Add user info if authenticated
        if hasattr(request, "user") and request.user.is_authenticated:
            log_data["user_id"] = str(request.user.id)
            log_data["user_email"] = request.user.email
        
        # Log at appropriate level based on status code
        if response.status_code >= 500:
            logger.error("Server error", extra=log_data)
        elif response.status_code >= 400:
            logger.warning("Client error", extra=log_data)
        else:
            logger.info("Request completed", extra=log_data)
        
        # Add request ID to response headers for client-side tracing
        response["X-Request-ID"] = request_id
        
        return response
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            # Get first IP in the chain
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR", "")
        return ip


class APIVersionMiddleware:
    """
    Middleware for API version handling.
    
    Adds version information to the request and response.
    """
    
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Extract version from URL path if present
        # URL pattern: /api/v1/... or /api/v2/...
        path_parts = request.path.strip("/").split("/")
        
        # Check if this is an API request with version
        if len(path_parts) >= 2 and path_parts[0] == "api":
            version = None
            if len(path_parts) >= 2 and path_parts[1].startswith("v"):
                version = path_parts[1]
            
            # Attach version to request
            request.api_version = version
        else:
            request.api_version = None
        
        response = self.get_response(request)
        
        # Add API version header to response
        if hasattr(request, "api_version") and request.api_version:
            response["X-API-Version"] = request.api_version
        
        return response


class SecurityHeadersMiddleware:
    """
    Middleware for adding security headers to responses.
    
    Adds headers for additional security in production.
    """
    
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        
        # Add security headers
        # Prevent MIME type sniffing
        response.setdefault("X-Content-Type-Options", "nosniff")
        
        # Prevent clickjacking
        response.setdefault("X-Frame-Options", "DENY")
        
        # XSS protection is deprecated - remove legacy header
        # Content Security Policy (CSP) should be used instead for XSS protection
        # response.setdefault("X-XSS-Protection", "1; mode=block")
        
        # Referrer policy
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        
        return response


class CORSMiddleware:
    """
    Placeholder for custom CORS handling if needed beyond django-cors-headers.
    
    Currently using django-cors-headers, but this can be extended for
    more complex CORS requirements.
    """
    
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        return self.get_response(request)
