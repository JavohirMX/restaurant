"""
Security utilities for the restaurant backend.

Provides input validation, sanitization, and security helpers.
"""

import html
import re
from typing import Any
from urllib.parse import urlparse

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from PIL import Image


# =============================================================================
# Input Sanitization
# =============================================================================

def sanitize_html(text: str) -> str:
    """
    Sanitize user input by escaping HTML entities.

    This prevents XSS attacks by converting special characters to their
    HTML entity equivalents.

    Args:
        text: Raw user input string

    Returns:
        Sanitized string with HTML entities escaped
    """
    if not text:
        return ""
    return html.escape(text.strip())


def sanitize_text(text: str, max_length: int = 5000) -> str:
    """
    Sanitize plain text input.

    - Strips leading/trailing whitespace
    - Removes control characters
    - Limits length

    Args:
        text: Raw user input string
        max_length: Maximum allowed length

    Returns:
        Sanitized text string
    """
    if not text:
        return ""

    # Strip whitespace
    text = text.strip()

    # Remove control characters except newlines and tabs
    text = "".join(char for char in text if char == "\n" or char == "\t" or (ord(char) >= 32 and ord(char) <= 126))

    # Limit length
    return text[:max_length]


def validate_phone_number(phone: str) -> str:
    """
    Validate and sanitize phone number.

    Allows:
    - Digits (0-9)
    - Common separators: space, hyphen, parentheses, plus sign
    - Extension indicators: ext, x

    Args:
        phone: Phone number string

    Returns:
        Sanitized phone number

    Raises:
        ValidationError: If phone number contains invalid characters
    """
    if not phone:
        return ""

    # Remove all whitespace
    phone = phone.strip()

    # Allowed characters pattern
    allowed_pattern = re.compile(r"^[\d\s\-\(\)\+\.extEXT,]+$")

    if not allowed_pattern.match(phone):
        raise ValidationError(
            "Phone number contains invalid characters. "
            "Only digits, spaces, hyphens, parentheses, plus signs, and extension indicators are allowed."
        )

    # Minimum length check (at least 7 digits for a valid number)
    digits_only = re.sub(r"\D", "", phone)
    if len(digits_only) < 7:
        raise ValidationError("Phone number must contain at least 7 digits.")

    return phone


# =============================================================================
# File Upload Validation
# =============================================================================

# Allowed image MIME types and their extensions
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/gif": [".gif"],
}

# Maximum file sizes (in bytes)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB

# Maximum image dimensions
MAX_IMAGE_WIDTH = 4096
MAX_IMAGE_HEIGHT = 4096


def validate_image_file(file, max_size: int = MAX_IMAGE_SIZE) -> None:
    """
    Validate uploaded image file.

    Checks:
    - File size limit
    - MIME type (via content, not just extension)
    - Image format validity
    - Maximum dimensions

    Args:
        file: Uploaded file object
        max_size: Maximum allowed file size in bytes

    Raises:
        ValidationError: If file fails validation
    """
    # Check file size
    if file.size > max_size:
        size_mb = max_size / (1024 * 1024)
        raise ValidationError(f"File size exceeds maximum allowed ({size_mb:.1f} MB).")

    # Verify it's a valid image
    try:
        image = Image.open(file)
        image.verify()  # Verify it's a valid image file
    except Exception as e:
        raise ValidationError(f"Invalid image file: {str(e)}")

    # Re-open for format check (verify() closes the file)
    file.seek(0)
    image = Image.open(file)

    # Check format
    format_mime = image.format
    if not format_mime:
        raise ValidationError("Could not determine image format.")

    # Map PIL format to MIME type
    format_to_mime = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
        "GIF": "image/gif",
    }

    mime_type = format_to_mime.get(format_mime.upper())
    if not mime_type or mime_type not in ALLOWED_IMAGE_TYPES:
        allowed = ", ".join(ALLOWED_IMAGE_TYPES.keys())
        raise ValidationError(f"Unsupported image format. Allowed types: {allowed}")

    # Check dimensions
    width, height = image.size
    if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
        raise ValidationError(
            f"Image dimensions exceed maximum allowed ({MAX_IMAGE_WIDTH}x{MAX_IMAGE_HEIGHT}). "
            f"Uploaded image: {width}x{height}"
        )

    # Reset file pointer for subsequent reads
    file.seek(0)


def validate_avatar_file(file) -> None:
    """
    Validate avatar image file with stricter limits.

    Args:
        file: Uploaded file object

    Raises:
        ValidationError: If file fails validation
    """
    validate_image_file(file, max_size=MAX_AVATAR_SIZE)


# =============================================================================
# URL Validation
# =============================================================================

_url_validator = URLValidator(schemes=["http", "https"])


def validate_safe_url(url: str, allowed_hosts: list[str] | None = None) -> str:
    """
    Validate URL is safe for redirects or embedding.

    Checks:
    - Valid URL format
    - HTTP/HTTPS scheme only
    - Not pointing to internal/private IPs (if allowed_hosts specified)

    Args:
        url: URL string to validate
        allowed_hosts: Optional list of allowed hostnames

    Returns:
        Validated URL string

    Raises:
        ValidationError: If URL is invalid or unsafe
    """
    if not url:
        raise ValidationError("URL is required.")

    # Basic URL validation
    try:
        _url_validator(url)
    except ValidationError as e:
        raise ValidationError(f"Invalid URL: {str(e)}")

    parsed = urlparse(url)

    # Only allow HTTP/HTTPS
    if parsed.scheme not in ("http", "https"):
        raise ValidationError("Only HTTP and HTTPS URLs are allowed.")

    # Check against allowed hosts if specified
    if allowed_hosts:
        host = parsed.hostname or ""
        if host not in allowed_hosts:
            raise ValidationError(f"URL host '{host}' is not in the allowed list.")

    return url


# =============================================================================
# Query Parameter Validation
# =============================================================================

MAX_QUERY_LENGTH = 200
ALLOWED_QUERY_PATTERN = re.compile(r"^[\w\s\-\.@]+$")


def sanitize_search_query(query: str) -> str:
    """
    Sanitize search query input.

    Removes potentially dangerous characters while preserving
    alphanumeric characters and common search operators.

    Args:
        query: Raw search query string

    Returns:
        Sanitized query string
    """
    if not query:
        return ""

    # Strip whitespace
    query = query.strip()

    # Limit length
    query = query[:MAX_QUERY_LENGTH]

    # Remove SQL injection risky characters
    # Allow: alphanumeric, spaces, hyphens, dots, @ (for emails)
    query = re.sub(r"[^\w\s\-\.@]", "", query)

    return query


def validate_pagination_params(
    page: Any,
    page_size: Any,
    max_page_size: int = 100,
    default_page_size: int = 20,
) -> tuple[int, int]:
    """
    Validate and sanitize pagination parameters.

    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        max_page_size: Maximum allowed page size
        default_page_size: Default page size if invalid

    Returns:
        Tuple of (page, page_size) as integers
    """
    try:
        page = int(page) if page else 1
        page = max(1, page)  # Minimum page is 1
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = int(page_size) if page_size else default_page_size
        page_size = max(1, min(page_size, max_page_size))  # Clamp to valid range
    except (ValueError, TypeError):
        page_size = default_page_size

    return page, page_size


# =============================================================================
# Password Validation Helpers
# =============================================================================

MIN_PASSWORD_LENGTH = 12


def validate_password_strength(password: str) -> list[str]:
    """
    Validate password strength.

    Returns list of validation errors (empty if password is strong).

    Requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    Args:
        password: Password string to validate

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")

    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")

    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")

    if not re.search(r"\d", password):
        errors.append("Password must contain at least one digit.")

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+\[\]\\;/`~]", password):
        errors.append("Password must contain at least one special character.")

    return errors


# =============================================================================
# Rate Limiting Keys
# =============================================================================

def get_client_ip(request) -> str:
    """
    Get client IP address from request.

    Handles X-Forwarded-For header for requests behind reverse proxy.

    Args:
        request: Django request object

    Returns:
        Client IP address string
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # Get first IP in the chain (client IP)
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "")
    return ip
