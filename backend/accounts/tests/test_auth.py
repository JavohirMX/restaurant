"""
Integration tests for authentication endpoints.

Tests login, refresh, logout, and me endpoints.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from core.models import AuditEvent
from core.tests.factories import UserFactory


@pytest.fixture
def api_client():
    """Return APIClient instance."""
    return APIClient()


@pytest.fixture
def admin_user():
    """Create and return an admin user."""
    return UserFactory(role=User.Role.ADMIN, password="adminpass123")


@pytest.mark.django_db
class TestLoginView:
    """Tests for the login endpoint."""

    def test_login_success(self, api_client, admin_user):
        """Successful login should return tokens and user info."""
        url = reverse("accounts_admin:login")
        data = {
            "email": admin_user.email,
            "password": "adminpass123",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.data
        # refresh_token is set as httpOnly cookie, not in response data
        assert "refresh_token" in response.cookies
        assert "user" in response.data
        assert response.data["user"]["email"] == admin_user.email
        assert response.data["user"]["role"] == User.Role.ADMIN

    def test_login_invalid_credentials(self, api_client, admin_user):
        """Login with wrong password should return 401."""
        url = reverse("accounts_admin:login")
        data = {
            "email": admin_user.email,
            "password": "wrongpassword",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["error"] == "UNAUTHORIZED"

    def test_login_nonexistent_user(self, api_client):
        """Login with non-existent email should return 401."""
        url = reverse("accounts_admin:login")
        data = {
            "email": "nonexistent@example.com",
            "password": "somepassword",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_email(self, api_client):
        """Login without email should return 400."""
        url = reverse("accounts_admin:login")
        data = {
            "password": "somepassword",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_password(self, api_client):
        """Login without password should return 400."""
        url = reverse("accounts_admin:login")
        data = {
            "email": "test@example.com",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_creates_audit_event(self, api_client, admin_user):
        """Successful login should create an audit event."""
        url = reverse("accounts_admin:login")
        data = {
            "email": admin_user.email,
            "password": "adminpass123",
        }

        api_client.post(url, data, format="json")

        audit_event = AuditEvent.objects.filter(event="admin.login").first()
        assert audit_event is not None
        assert audit_event.actor_id == admin_user.id

    def test_login_failed_creates_audit_event(self, api_client, admin_user):
        """Failed login should create an audit event."""
        url = reverse("accounts_admin:login")
        data = {
            "email": admin_user.email,
            "password": "wrongpassword",
        }

        api_client.post(url, data, format="json")

        audit_event = AuditEvent.objects.filter(event="admin.login_failed").first()
        assert audit_event is not None
        # actor_id should be None for failed login attempts
        assert audit_event.actor_id is None


@pytest.mark.django_db
class TestRefreshView:
    """Tests for the token refresh endpoint."""

    def test_refresh_success(self, api_client, admin_user):
        """Successful refresh should return new access token."""
        # First login to get tokens
        login_url = reverse("accounts_admin:login")
        login_data = {
            "email": admin_user.email,
            "password": "adminpass123",
        }
        login_response = api_client.post(login_url, login_data, format="json")
        # Get refresh token from cookie
        refresh_token = login_response.cookies.get("refresh_token").value

        # Now refresh - token should be in cookie
        url = reverse("accounts_admin:refresh")
        api_client.cookies["refresh_token"] = refresh_token

        response = api_client.post(url, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.data

    def test_refresh_invalid_token(self, api_client):
        """Refresh with invalid token should return 401."""
        url = reverse("accounts_admin:refresh")
        data = {"refresh_token": "invalid.token.here"}

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_missing_token(self, api_client):
        """Refresh without token should return 401."""
        url = reverse("accounts_admin:refresh")
        # Don't set any cookie - token should be missing

        response = api_client.post(url, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestLogoutView:
    """Tests for the logout endpoint."""

    def test_logout_success(self, api_client, admin_user):
        """Successful logout should return 204."""
        # First login
        login_url = reverse("accounts_admin:login")
        login_data = {
            "email": admin_user.email,
            "password": "adminpass123",
        }
        login_response = api_client.post(login_url, login_data, format="json")
        access_token = login_response.data["access_token"]

        # Logout
        url = reverse("accounts_admin:logout")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.post(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_logout_creates_audit_event(self, api_client, admin_user):
        """Logout should create an audit event."""
        # First login
        login_url = reverse("accounts_admin:login")
        login_data = {
            "email": admin_user.email,
            "password": "adminpass123",
        }
        login_response = api_client.post(login_url, login_data, format="json")
        access_token = login_response.data["access_token"]

        # Logout
        url = reverse("accounts_admin:logout")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        api_client.post(url)

        audit_event = AuditEvent.objects.filter(event="admin.logout").first()
        assert audit_event is not None
        assert audit_event.actor_id == admin_user.id

    def test_logout_unauthorized(self, api_client):
        """Logout without authentication should return 401."""
        url = reverse("accounts_admin:logout")
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMeView:
    """Tests for the me endpoint."""

    def test_me_success(self, api_client, admin_user):
        """Authenticated user should get their profile."""
        # First login
        login_url = reverse("accounts_admin:login")
        login_data = {
            "email": admin_user.email,
            "password": "adminpass123",
        }
        login_response = api_client.post(login_url, login_data, format="json")
        access_token = login_response.data["access_token"]

        # Get profile
        url = reverse("accounts_admin:me")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(admin_user.id)
        assert response.data["email"] == admin_user.email
        assert response.data["role"] == User.Role.ADMIN

    def test_me_unauthorized(self, api_client):
        """Unauthenticated request should return 401."""
        url = reverse("accounts_admin:me")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_returns_permissions(self, api_client, admin_user):
        """Me endpoint should include permissions."""
        # First login
        login_url = reverse("accounts_admin:login")
        login_data = {
            "email": admin_user.email,
            "password": "adminpass123",
        }
        login_response = api_client.post(login_url, login_data, format="json")
        access_token = login_response.data["access_token"]

        # Get profile
        url = reverse("accounts_admin:me")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.get(url)

        assert "permissions" in response.data


@pytest.mark.django_db
class TestRolePermissions:
    """Tests that different roles can access appropriate endpoints."""

    @pytest.mark.parametrize(
        "role,expected_status",
        [
            (User.Role.ADMIN, status.HTTP_200_OK),
            (User.Role.MANAGER, status.HTTP_200_OK),
            (User.Role.HOST, status.HTTP_200_OK),
            (User.Role.EDITOR, status.HTTP_403_FORBIDDEN),
        ],
    )
    def test_reservation_list_access(self, api_client, role, expected_status):
        """Test that only appropriate roles can access reservation list."""
        user = UserFactory(role=role, password="testpass123")

        # Login
        login_url = reverse("accounts_admin:login")
        login_data = {
            "email": user.email,
            "password": "testpass123",
        }
        login_response = api_client.post(login_url, login_data, format="json")
        access_token = login_response.data["access_token"]

        # Try to access reservations
        url = reverse("reservations_admin:reservation-list")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.get(url)

        assert response.status_code == expected_status
