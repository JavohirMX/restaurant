"""
Views for the accounts app.

Provides authentication endpoints for staff users.
"""

import logging
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import login, logout
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from accounts.serializers import LoginSerializer, UserSerializer
from core.models import AuditEvent

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "")
    return ip


def log_audit_event(
    event: str,
    actor_type: str,
    actor_id: Any,
    entity_type: str,
    entity_id: Any,
    metadata: dict,
    ip_address: str,
) -> None:
    """Log an audit event."""
    AuditEvent.objects.create(
        event=event,
        actor_type=actor_type,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata,
        ip_address=ip_address,
    )


class LoginView(APIView):
    """
    Login endpoint for staff users.

    Accepts email and password, returns JWT tokens on success.
    Rate limited to prevent brute force attacks.
    """

    permission_classes = [AllowAny]

    @ratelimit(key='ip', rate='5/m', method='POST')
    def post(self, request: Request) -> Response:
        """Handle login request."""
        client_ip = get_client_ip(request)

        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            # Check if this is a validation error (missing fields) or auth error
            error_code = None
            for field_errors in serializer.errors.values():
                if field_errors:
                    error_code = field_errors[0].code
                    break

            # Log failed login attempt
            email = request.data.get("email", "unknown")
            log_audit_event(
                event="admin.login_failed",
                actor_type=AuditEvent.ActorType.SYSTEM,
                actor_id=None,
                entity_type="user",
                entity_id=None,
                metadata={"email": email, "reason": "invalid_credentials"},
                ip_address=client_ip,
            )
            logger.warning(
                f"Failed login attempt for {email} from {client_ip}"
            )

            # Return 400 for missing fields, 401 for invalid credentials
            if error_code == "required":
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": "Missing required fields.",
                        "details": serializer.errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {
                        "error": "UNAUTHORIZED",
                        "message": "Invalid email or password.",
                        "details": serializer.errors,
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        
        user = serializer.validated_data["user"]
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Log successful login
        log_audit_event(
            event="admin.login",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            metadata={"email": user.email},
            ip_address=client_ip,
        )
        logger.info(f"User {user.email} logged in from {client_ip}")
        
        # Prepare response
        response_data = {
            "access_token": access_token,
            "expires_in": int(timedelta(minutes=15).total_seconds()),
            "user": UserSerializer(user).data,
        }
        
        # Create response
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Set refresh token in httpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=settings.COOKIE_HTTPONLY,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            max_age=int(timedelta(days=settings.COOKIE_MAX_AGE_DAYS).total_seconds()),
        )
        
        return response


class RefreshTokenView(APIView):
    """
    Token refresh endpoint.
    
    Reads refresh token from httpOnly cookie and returns new access token.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request: Request) -> Response:
        """Handle token refresh request."""
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get("refresh_token")
        
        if not refresh_token:
            return Response(
                {
                    "error": "UNAUTHORIZED",
                    "message": "Refresh token not found.",
                    "details": {},
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        try:
            # Validate refresh token
            refresh = RefreshToken(refresh_token)
            user_id = refresh["user_id"]
            
            # Get user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {
                        "error": "UNAUTHORIZED",
                        "message": "User not found.",
                        "details": {},
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            
            # Check if user is active
            if not user.is_active:
                return Response(
                    {
                        "error": "UNAUTHORIZED",
                        "message": "User account is disabled.",
                        "details": {},
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            
            # Generate new tokens
            new_refresh = RefreshToken.for_user(user)
            access_token = str(new_refresh.access_token)
            
            # Blacklist old refresh token if configured
            if hasattr(refresh, "blacklist"):
                refresh.blacklist()
            
            # Prepare response
            response_data = {
                "access_token": access_token,
                "expires_in": int(timedelta(minutes=15).total_seconds()),
            }
            
            response = Response(response_data, status=status.HTTP_200_OK)
            
            # Set new refresh token in cookie
            response.set_cookie(
                key="refresh_token",
                value=str(new_refresh),
                httponly=settings.COOKIE_HTTPONLY,
                secure=settings.COOKIE_SECURE,
                samesite=settings.COOKIE_SAMESITE,
                max_age=int(timedelta(days=settings.COOKIE_MAX_AGE_DAYS).total_seconds()),
            )
            
            return response
            
        except (TokenError, InvalidToken) as e:
            logger.warning(f"Invalid refresh token: {e}")
            return Response(
                {
                    "error": "UNAUTHORIZED",
                    "message": "Invalid or expired refresh token.",
                    "details": {},
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as e:
            logger.error(f"Unexpected error in token refresh: {e}")
            return Response(
                {
                    "error": "INTERNAL_ERROR",
                    "message": "An error occurred while refreshing your token.",
                    "details": {},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogoutView(APIView):
    """
    Logout endpoint.
    
    Invalidates the refresh token and clears the cookie.
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request: Request) -> Response:
        """Handle logout request."""
        client_ip = get_client_ip(request)
        user = request.user
        
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get("refresh_token")
        
        if refresh_token:
            try:
                # Blacklist the refresh token
                token = RefreshToken(refresh_token)
                if hasattr(token, "blacklist"):
                    token.blacklist()
            except Exception as e:
                logger.warning(f"Failed to blacklist token: {e}")
        
        # Log logout
        log_audit_event(
            event="admin.logout",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            metadata={"email": user.email},
            ip_address=client_ip,
        )
        logger.info(f"User {user.email} logged out from {client_ip}")
        
        # Create response and clear cookie
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie("refresh_token")
        
        return response


class UserProfileView(APIView):
    """
    User profile endpoint.
    
    Returns the current user's profile information.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request: Request) -> Response:
        """Get current user profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request: Request) -> Response:
        """Update current user profile."""
        # Only allow updating certain fields
        allowed_fields = ["first_name", "last_name"]
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        serializer = UserSerializer(
            request.user,
            data=data,
            partial=True,
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(
            {
                "error": "VALIDATION_ERROR",
                "message": "Invalid data provided.",
                "details": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
