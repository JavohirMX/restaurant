"""
Custom exception handling for standardized API error responses.

Follows the error schema defined in docs/API/CONTRACT.md:
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": { ... }
}
"""

from typing import Any

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler


# Custom API Exceptions with specific error codes
class ConflictError(APIException):
    """Resource conflict (e.g., capacity exceeded)."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "CONFLICT"
    default_detail = "Resource conflict occurred."


class RateLimitError(Throttled):
    """Rate limit exceeded with custom error code."""

    default_code = "RATE_LIMITED"
    default_detail = "Too many requests. Please try again later."


class ServiceUnavailableError(APIException):
    """Service temporarily unavailable."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_code = "SERVICE_UNAVAILABLE"
    default_detail = "Service temporarily unavailable."


# Error code mapping
ERROR_CODE_MAP = {
    ValidationError: "VALIDATION_ERROR",
    AuthenticationFailed: "UNAUTHORIZED",
    NotAuthenticated: "UNAUTHORIZED",
    PermissionDenied: "FORBIDDEN",
    NotFound: "NOT_FOUND",
    ConflictError: "CONFLICT",
    Throttled: "RATE_LIMITED",
    RateLimitError: "RATE_LIMITED",
}


def custom_exception_handler(exc: Exception, context: dict) -> Response | None:
    """
    Custom exception handler that standardizes error responses.

    Args:
        exc: The exception that was raised
        context: Dictionary containing the request and view context

    Returns:
        Standardized Response object or None
    """
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)

    if response is None:
        # Handle non-DRF exceptions
        if isinstance(exc, APIException):
            response = Response(
                {
                    "error": "INTERNAL_ERROR",
                    "message": str(exc.detail) if hasattr(exc, "detail") else str(exc),
                    "details": {},
                },
                status=exc.status_code
                if hasattr(exc, "status_code")
                else status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        else:
            # Unhandled exception - let Django handle it
            return None

    # Standardize the response format
    error_code = _get_error_code(exc)
    message = _get_error_message(exc, response)
    details = _get_error_details(exc, response)

    standardized_response = {
        "error": error_code,
        "message": message,
        "details": details,
    }

    response.data = standardized_response

    # Add Retry-After header for rate limiting
    if isinstance(exc, (Throttled, RateLimitError)):
        retry_after = getattr(exc, "wait", None)
        if retry_after:
            response["Retry-After"] = int(retry_after)

    return response


def _get_error_code(exc: Exception) -> str:
    """Get the error code for the exception."""
    for exc_class, code in ERROR_CODE_MAP.items():
        if isinstance(exc, exc_class):
            return code

    # Default codes based on status
    if hasattr(exc, "status_code"):
        status_code = exc.status_code
        if status_code == 400:
            return "VALIDATION_ERROR"
        elif status_code == 401:
            return "UNAUTHORIZED"
        elif status_code == 403:
            return "FORBIDDEN"
        elif status_code == 404:
            return "NOT_FOUND"
        elif status_code == 409:
            return "CONFLICT"
        elif status_code == 429:
            return "RATE_LIMITED"
        elif status_code >= 500:
            return "INTERNAL_ERROR"

    return "INTERNAL_ERROR"


def _get_error_message(exc: Exception, response: Response) -> str:
    """Extract human-readable message from exception."""
    if hasattr(exc, "detail"):
        detail = exc.detail
        if isinstance(detail, str):
            return detail
        elif isinstance(detail, dict) and "detail" in detail:
            return str(detail["detail"])
        elif isinstance(detail, list) and detail:
            return str(detail[0])

    # Default messages based on status code
    status_code = response.status_code
    default_messages = {
        400: "Invalid request data.",
        401: "Authentication required.",
        403: "Permission denied.",
        404: "Resource not found.",
        409: "Resource conflict.",
        429: "Too many requests. Please try again later.",
        500: "Internal server error.",
        503: "Service temporarily unavailable.",
    }

    return default_messages.get(status_code, "An error occurred.")


def _get_error_details(exc: Exception, response: Response) -> dict[str, Any]:
    """Extract detailed error information."""
    details = {}

    if hasattr(exc, "detail"):
        detail = exc.detail

        # Handle validation errors with field-level details
        if isinstance(exc, ValidationError) and isinstance(detail, dict):
            for field, errors in detail.items():
                if isinstance(errors, list):
                    details[field] = [str(e) for e in errors]
                else:
                    details[field] = [str(errors)]

        # Handle throttled errors with wait time
        elif isinstance(exc, Throttled):
            wait = getattr(exc, "wait", None)
            if wait:
                details["retryAfter"] = int(wait)

    return details
