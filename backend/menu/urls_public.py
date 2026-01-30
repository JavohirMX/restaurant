"""
Public URL configuration for the menu app.

Provides read-only access to menu information.
"""

from django.urls import path

from menu.views_public import MenuListView

app_name = "menu_public"

urlpatterns = [
    path("", MenuListView.as_view(), name="menu-list"),
]
