"""
Admin URL configuration for the menu app.

Provides CRUD operations for menu management.
"""

from django.urls import path

from menu.views_admin import (
    MenuCategoryCreateView,
    MenuCategoryDetailView,
    MenuCategoryListView,
    MenuCategoryReorderView,
    MenuItemCreateView,
    MenuItemDetailView,
    MenuItemListView,
    MenuItemReorderView,
    MenuItemVariantCreateView,
    MenuItemVariantDetailView,
    MenuItemVariantReorderView,
)

app_name = "menu_admin"

urlpatterns = [
    # Categories
    path("categories/", MenuCategoryListView.as_view(), name="category-list"),
    path("categories/create/", MenuCategoryCreateView.as_view(), name="category-create"),
    path("categories/<uuid:pk>/", MenuCategoryDetailView.as_view(), name="category-detail"),
    path("categories/reorder/", MenuCategoryReorderView.as_view(), name="category-reorder"),
    
    # Items
    path("items/", MenuItemListView.as_view(), name="item-list"),
    path("items/create/", MenuItemCreateView.as_view(), name="item-create"),
    path("items/<uuid:pk>/", MenuItemDetailView.as_view(), name="item-detail"),
    path("items/reorder/", MenuItemReorderView.as_view(), name="item-reorder"),
    
    # Variants
    path("variants/create/", MenuItemVariantCreateView.as_view(), name="variant-create"),
    path("variants/<uuid:pk>/", MenuItemVariantDetailView.as_view(), name="variant-detail"),
    path("variants/reorder/", MenuItemVariantReorderView.as_view(), name="variant-reorder"),
]
