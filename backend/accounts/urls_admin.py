"""
Admin URL configuration for the accounts app.

Provides authentication endpoints for staff users.
"""

from django.urls import path

from accounts.views import (
    LoginView,
    LogoutView,
    RefreshTokenView,
    UserProfileView,
)

app_name = "accounts_admin"

urlpatterns = [
    # Authentication endpoints
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", UserProfileView.as_view(), name="me"),
]
