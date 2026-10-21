"""
Custom permission classes for role-based access control.

Implements the permission matrix from docs/ADMIN/PERMISSIONS.md:
- admin: Full access
- manager: All content + reservations
- host: Reservations only
- editor: Content only (menu, gallery, testimonials, blog)
"""

from typing import Any

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import View


class IsAdmin(permissions.BasePermission):
    """
    Permission that only allows admin users.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsManager(permissions.BasePermission):
    """
    Permission that allows admin and manager users.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return (
            request.user and request.user.is_authenticated and request.user.is_manager
        )


class IsHost(permissions.BasePermission):
    """
    Permission that allows admin, manager, and host users.
    Used for reservation management endpoints.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_manage_reservations
        )


class IsEditor(permissions.BasePermission):
    """
    Permission that allows admin, manager, and editor users.
    Used for content management endpoints (menu, gallery, testimonials, blog).
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_manage_content
        )


class IsOwner(permissions.BasePermission):
    """
    Permission that checks if the user is the owner of the object.
    Used for user-specific resources.
    """

    def has_object_permission(self, request: Request, view: View, obj: Any) -> bool:
        # First check that user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if object has a user attribute
        if hasattr(obj, "user"):
            return obj.user == request.user

        # Check if object has a created_by attribute
        if hasattr(obj, "created_by"):
            return obj.created_by == request.user

        # Check if object is the user itself
        if hasattr(obj, "pk") and hasattr(request.user, "pk"):
            return obj.pk == request.user.pk

        return False


class ReadOnly(permissions.BasePermission):
    """
    Permission that only allows safe (read-only) methods.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return request.method in permissions.SAFE_METHODS


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to anyone, but write access only to admins.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsManagerOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to anyone, but write access only to managers/admins.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user and request.user.is_authenticated and request.user.is_manager
        )


class IsEditorOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to anyone, but write access only to editors/managers/admins.
    Used for public-facing content that staff can edit.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_manage_content
        )


class IsHostOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to anyone, but write access only to hosts/managers/admins.
    Used for reservation endpoints where hosts need to view and modify.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True  # Allow read access without auth
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_manage_reservations
        )


# Composite permission classes for common use cases


class IsStaff(permissions.BasePermission):
    """
    Permission that allows any authenticated staff member (any role).
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return request.user and request.user.is_authenticated and request.user.is_staff


class IsCustomer(permissions.BasePermission):
    """
    Permission for customer-facing endpoints (token-based or public).
    This is a placeholder - actual customer auth is token-based for reservations.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        # Customers can access public endpoints without authentication
        # or use token-based auth for reservation management
        return True


# Permission combinations using DRF's built-in operators


class IsAdminOrManager(permissions.BasePermission):
    """
    Combined permission for admin or manager access.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return IsAdmin().has_permission(request, view) or IsManager().has_permission(
            request, view
        )


class CanManageRestaurant(permissions.BasePermission):
    """
    Permission to manage restaurant settings and configuration.
    Only admins and managers can modify restaurant info.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        return (
            request.user and request.user.is_authenticated and request.user.is_manager
        )


class CanPublishContent(permissions.BasePermission):
    """
    Permission to publish/unpublish content.

    Policy Option A (safer): Only admin/manager can publish
    Policy Option B: Editor can also publish

    Currently implements Option A - only admin/manager can publish.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        # For safe methods, allow if user can view content
        if request.method in permissions.SAFE_METHODS:
            return (
                request.user
                and request.user.is_authenticated
                and request.user.can_manage_content
            )

        # For publishing actions (POST, PUT, PATCH with publish status)
        # Only admin and manager can publish
        return (
            request.user and request.user.is_authenticated and request.user.is_manager
        )
