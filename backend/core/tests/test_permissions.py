"""
Unit tests for permission classes.

Tests the role-based permission matrix from docs/ADMIN/PERMISSIONS.md:
- admin: Full access
- manager: All content + reservations
- host: Reservations only
- editor: Content only (menu, gallery, testimonials, blog)
"""

import pytest
from rest_framework.test import APIRequestFactory

from accounts.models import User
from core.permissions import IsAdmin, IsEditor, IsHost, IsManager, IsOwner, ReadOnly
from core.tests.factories import UserFactory


@pytest.fixture
def factory():
    """Return APIRequestFactory."""
    return APIRequestFactory()


@pytest.fixture
def mock_view():
    """Return a mock view object."""
    class MockView:
        pass

    return MockView()


@pytest.mark.django_db
class TestIsAdminPermission:
    """Tests for IsAdmin permission class."""

    def test_admin_user_has_permission(self, factory, mock_view):
        """Admin users should have permission."""
        user = UserFactory(role=User.Role.ADMIN)
        request = factory.get("/test/")
        request.user = user

        permission = IsAdmin()
        assert permission.has_permission(request, mock_view) is True

    def test_manager_user_denied(self, factory, mock_view):
        """Manager users should be denied."""
        user = UserFactory(role=User.Role.MANAGER)
        request = factory.get("/test/")
        request.user = user

        permission = IsAdmin()
        assert permission.has_permission(request, mock_view) is False

    def test_host_user_denied(self, factory, mock_view):
        """Host users should be denied."""
        user = UserFactory(role=User.Role.HOST)
        request = factory.get("/test/")
        request.user = user

        permission = IsAdmin()
        assert permission.has_permission(request, mock_view) is False

    def test_editor_user_denied(self, factory, mock_view):
        """Editor users should be denied."""
        user = UserFactory(role=User.Role.EDITOR)
        request = factory.get("/test/")
        request.user = user

        permission = IsAdmin()
        assert permission.has_permission(request, mock_view) is False

    def test_anonymous_user_denied(self, factory, mock_view):
        """Anonymous users should be denied."""
        from django.contrib.auth.models import AnonymousUser

        request = factory.get("/test/")
        request.user = AnonymousUser()

        permission = IsAdmin()
        assert permission.has_permission(request, mock_view) is False


@pytest.mark.django_db
class TestIsManagerPermission:
    """Tests for IsManager permission class."""

    def test_admin_user_has_permission(self, factory, mock_view):
        """Admin users should have permission."""
        user = UserFactory(role=User.Role.ADMIN)
        request = factory.get("/test/")
        request.user = user

        permission = IsManager()
        assert permission.has_permission(request, mock_view) is True

    def test_manager_user_has_permission(self, factory, mock_view):
        """Manager users should have permission."""
        user = UserFactory(role=User.Role.MANAGER)
        request = factory.get("/test/")
        request.user = user

        permission = IsManager()
        assert permission.has_permission(request, mock_view) is True

    def test_host_user_denied(self, factory, mock_view):
        """Host users should be denied."""
        user = UserFactory(role=User.Role.HOST)
        request = factory.get("/test/")
        request.user = user

        permission = IsManager()
        assert permission.has_permission(request, mock_view) is False

    def test_editor_user_denied(self, factory, mock_view):
        """Editor users should be denied."""
        user = UserFactory(role=User.Role.EDITOR)
        request = factory.get("/test/")
        request.user = user

        permission = IsManager()
        assert permission.has_permission(request, mock_view) is False


@pytest.mark.django_db
class TestIsHostPermission:
    """Tests for IsHost permission class.
    
    Host permission allows admin, manager, and host users.
    Used for reservation management endpoints.
    """

    def test_admin_user_has_permission(self, factory, mock_view):
        """Admin users should have permission."""
        user = UserFactory(role=User.Role.ADMIN)
        request = factory.get("/test/")
        request.user = user

        permission = IsHost()
        assert permission.has_permission(request, mock_view) is True

    def test_manager_user_has_permission(self, factory, mock_view):
        """Manager users should have permission."""
        user = UserFactory(role=User.Role.MANAGER)
        request = factory.get("/test/")
        request.user = user

        permission = IsHost()
        assert permission.has_permission(request, mock_view) is True

    def test_host_user_has_permission(self, factory, mock_view):
        """Host users should have permission."""
        user = UserFactory(role=User.Role.HOST)
        request = factory.get("/test/")
        request.user = user

        permission = IsHost()
        assert permission.has_permission(request, mock_view) is True

    def test_editor_user_denied(self, factory, mock_view):
        """Editor users should be denied."""
        user = UserFactory(role=User.Role.EDITOR)
        request = factory.get("/test/")
        request.user = user

        permission = IsHost()
        assert permission.has_permission(request, mock_view) is False


@pytest.mark.django_db
class TestIsEditorPermission:
    """Tests for IsEditor permission class.
    
    Editor permission allows admin, manager, and editor users.
    Used for content management endpoints.
    """

    def test_admin_user_has_permission(self, factory, mock_view):
        """Admin users should have permission."""
        user = UserFactory(role=User.Role.ADMIN)
        request = factory.get("/test/")
        request.user = user

        permission = IsEditor()
        assert permission.has_permission(request, mock_view) is True

    def test_manager_user_has_permission(self, factory, mock_view):
        """Manager users should have permission."""
        user = UserFactory(role=User.Role.MANAGER)
        request = factory.get("/test/")
        request.user = user

        permission = IsEditor()
        assert permission.has_permission(request, mock_view) is True

    def test_editor_user_has_permission(self, factory, mock_view):
        """Editor users should have permission."""
        user = UserFactory(role=User.Role.EDITOR)
        request = factory.get("/test/")
        request.user = user

        permission = IsEditor()
        assert permission.has_permission(request, mock_view) is True

    def test_host_user_denied(self, factory, mock_view):
        """Host users should be denied."""
        user = UserFactory(role=User.Role.HOST)
        request = factory.get("/test/")
        request.user = user

        permission = IsEditor()
        assert permission.has_permission(request, mock_view) is False


@pytest.mark.django_db
class TestIsOwnerPermission:
    """Tests for IsOwner permission class."""

    def test_user_is_owner_by_user_attribute(self, factory, mock_view):
        """User should have permission if they own the object via user attribute."""
        user = UserFactory()
        request = factory.get("/test/")
        request.user = user

        # Create mock object with user attribute
        class MockObj:
            def __init__(self, owner_user):
                self.user = owner_user

        permission = IsOwner()
        assert permission.has_object_permission(request, mock_view, MockObj(user)) is True

    def test_user_is_owner_by_created_by_attribute(self, factory, mock_view):
        """User should have permission if they own the object via created_by attribute."""
        user = UserFactory()
        request = factory.get("/test/")
        request.user = user

        # Create mock object with created_by attribute
        class MockObj:
            def __init__(self, owner_user):
                self.created_by = owner_user

        permission = IsOwner()
        assert permission.has_object_permission(request, mock_view, MockObj(user)) is True

    def test_user_is_owner_by_pk(self, factory, mock_view):
        """User should have permission if object pk matches user pk."""
        user = UserFactory()
        request = factory.get("/test/")
        request.user = user

        # Create mock object with pk attribute
        class MockObj:
            def __init__(self, owner_pk):
                self.pk = owner_pk

        permission = IsOwner()
        assert permission.has_object_permission(request, mock_view, MockObj(user.pk)) is True

    def test_different_user_denied(self, factory, mock_view):
        """Different user should be denied."""
        user = UserFactory()
        other_user = UserFactory()
        request = factory.get("/test/")
        request.user = user

        # Create mock object owned by other user
        class MockObj:
            def __init__(self, owner_user):
                self.user = owner_user

        permission = IsOwner()
        assert permission.has_object_permission(request, mock_view, MockObj(other_user)) is False

    def test_anonymous_user_denied(self, factory, mock_view):
        """Anonymous user should be denied."""
        from django.contrib.auth.models import AnonymousUser

        request = factory.get("/test/")
        request.user = AnonymousUser()

        # Create mock object owned by a user
        class MockObj:
            def __init__(self, owner_user):
                self.user = owner_user

        permission = IsOwner()
        assert permission.has_object_permission(request, mock_view, MockObj(UserFactory())) is False


@pytest.mark.django_db
class TestReadOnlyPermission:
    """Tests for ReadOnly permission class."""

    def test_safe_methods_allowed(self, factory, mock_view):
        """GET, HEAD, OPTIONS should be allowed."""
        user = UserFactory()
        permission = ReadOnly()

        for method in ["GET", "HEAD", "OPTIONS"]:
            request = factory.generic(method, "/test/")
            request.user = user
            assert permission.has_permission(request, mock_view) is True

    def test_unsafe_methods_denied(self, factory, mock_view):
        """POST, PUT, PATCH, DELETE should be denied."""
        user = UserFactory()
        permission = ReadOnly()

        for method in ["POST", "PUT", "PATCH", "DELETE"]:
            request = factory.generic(method, "/test/")
            request.user = user
            assert permission.has_permission(request, mock_view) is False


@pytest.mark.django_db
class TestPermissionMatrix:
    """Tests the complete permission matrix from docs/ADMIN/PERMISSIONS.md."""

    @pytest.mark.parametrize(
        "role,permission_class,expected",
        [
            # Admin has all permissions
            (User.Role.ADMIN, IsAdmin, True),
            (User.Role.ADMIN, IsManager, True),
            (User.Role.ADMIN, IsHost, True),
            (User.Role.ADMIN, IsEditor, True),
            # Manager has manager, host, editor permissions
            (User.Role.MANAGER, IsAdmin, False),
            (User.Role.MANAGER, IsManager, True),
            (User.Role.MANAGER, IsHost, True),
            (User.Role.MANAGER, IsEditor, True),
            # Host only has host permission
            (User.Role.HOST, IsAdmin, False),
            (User.Role.HOST, IsManager, False),
            (User.Role.HOST, IsHost, True),
            (User.Role.HOST, IsEditor, False),
            # Editor only has editor permission
            (User.Role.EDITOR, IsAdmin, False),
            (User.Role.EDITOR, IsManager, False),
            (User.Role.EDITOR, IsHost, False),
            (User.Role.EDITOR, IsEditor, True),
        ],
    )
    def test_permission_matrix(self, factory, mock_view, role, permission_class, expected):
        """Test the complete permission matrix."""
        user = UserFactory(role=role)
        request = factory.get("/test/")
        request.user = user

        permission = permission_class()
        assert permission.has_permission(request, mock_view) is expected
