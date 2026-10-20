"""
Core views for the restaurant backend.

Provides health check and other system endpoints.
"""

import logging
from datetime import datetime
from typing import Any

from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.views import View
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class HealthCheckView(View):
    """
    Health check endpoint for monitoring.

    Returns service status and basic system information.
    Used by load balancers and monitoring systems.
    """

    def get(self, request: Any) -> JsonResponse:
        """Handle GET request for health check."""
        checks = {
            "database": self._check_database(),
        }

        # Determine overall status
        all_healthy = all(check["healthy"] for check in checks.values())

        response_data = {
            "status": "healthy" if all_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": "0.1.0",
            "checks": checks,
        }

        status_code = (
            status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        )

        return JsonResponse(response_data, status=status_code)

    def _check_database(self) -> dict[str, Any]:
        """Check database connectivity."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return {
                "healthy": True,
                "message": "Database connection successful",
            }
        except DatabaseError as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "healthy": False,
                "message": f"Database connection failed: {str(e)}",
            }


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request: Request) -> Response:
    """
    API root endpoint.

    Provides information about available API versions and endpoints.
    """
    return Response(
        {
            "name": "Restaurant Backend API",
            "version": "v1",
            "description": "API for restaurant website and admin dashboard",
            "documentation": "/api/docs/",  # Placeholder for future docs
            "endpoints": {
                "public": "/api/v1/public/",
                "admin": "/api/v1/admin/",
                "health": "/health/",
            },
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def version_info(request: Request) -> Response:
    """
    Version information endpoint.

    Returns detailed version and build information.
    """
    return Response(
        {
            "version": "0.1.0",
            "api_version": "v1",
            "django_version": get_django_version(),
            "python_version": get_python_version(),
        }
    )


def get_django_version() -> str:
    """Get Django version string."""
    try:
        import django

        return django.get_version()
    except ImportError:
        return "unknown"


def get_python_version() -> str:
    """Get Python version string."""
    import sys

    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
