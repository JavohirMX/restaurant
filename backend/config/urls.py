"""
URL configuration for the restaurant backend.

Routes URLs to views across all apps.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.views import HealthCheckView, api_root, version_info

# Admin URLs
admin_urlpatterns = [
    path("admin/", admin.site.urls),
]

# API URLs with versioning
api_urlpatterns = [
    # API root
    path("api/", api_root, name="api-root"),
    path("api/version/", version_info, name="api-version"),
    
    # Version 1 API
    path("api/v1/", include([
        # Public endpoints (no authentication required)
        path("public/", include([
            # Restaurant app public URLs
            path("restaurant/", include("restaurant.urls_public")),
            # Menu app public URLs
            path("menu/", include("menu.urls_public")),
            # Reservations app public URLs
            path("reservations/", include("reservations.urls_public")),
        ])),
        
        # Admin endpoints (authentication required)
        path("admin/", include([
            # Accounts app admin URLs (auth, users)
            path("auth/", include("accounts.urls_admin")),
            # Restaurant app admin URLs
            path("restaurant/", include("restaurant.urls_admin")),
            # Menu app admin URLs
            path("menu/", include("menu.urls_admin")),
            # Reservations app admin URLs
            path("reservations/", include("reservations.urls_admin")),
        ])),
    ])),
]

# Health check (outside API namespace)
health_urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
]

# Combine all URL patterns
urlpatterns = admin_urlpatterns + api_urlpatterns + health_urlpatterns

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Serve static files in development
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
