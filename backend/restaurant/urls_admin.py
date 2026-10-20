"""
Admin URL configuration for the restaurant app.

Provides CRUD operations for restaurant content management.
"""

from django.urls import path

from restaurant.views_admin import (
    BlogPostCreateView,
    BlogPostDetailView,
    BlogPostListView,
    BlogPostPublishView,
    GalleryImageCreateView,
    GalleryImageDetailView,
    GalleryImageListView,
    GalleryImageReorderView,
    RestaurantSettingsView,
    RestaurantUpdateView,
    ServicePeriodCreateView,
    ServicePeriodDetailView,
    ServicePeriodListView,
    TestimonialCreateView,
    TestimonialDetailView,
    TestimonialListView,
    TestimonialReorderView,
)

app_name = "restaurant_admin"

urlpatterns = [
    # Restaurant profile
    path("profile/", RestaurantUpdateView.as_view(), name="restaurant-profile"),
    path("settings/", RestaurantSettingsView.as_view(), name="restaurant-settings"),
    # Service periods (hours)
    path("hours/", ServicePeriodListView.as_view(), name="hours-list"),
    path("hours/create/", ServicePeriodCreateView.as_view(), name="hours-create"),
    path("hours/<uuid:pk>/", ServicePeriodDetailView.as_view(), name="hours-detail"),
    # Gallery
    path("gallery/", GalleryImageListView.as_view(), name="gallery-list"),
    path("gallery/create/", GalleryImageCreateView.as_view(), name="gallery-create"),
    path("gallery/<uuid:pk>/", GalleryImageDetailView.as_view(), name="gallery-detail"),
    path("gallery/reorder/", GalleryImageReorderView.as_view(), name="gallery-reorder"),
    # Testimonials
    path("testimonials/", TestimonialListView.as_view(), name="testimonials-list"),
    path(
        "testimonials/create/",
        TestimonialCreateView.as_view(),
        name="testimonials-create",
    ),
    path(
        "testimonials/<uuid:pk>/",
        TestimonialDetailView.as_view(),
        name="testimonials-detail",
    ),
    path(
        "testimonials/reorder/",
        TestimonialReorderView.as_view(),
        name="testimonials-reorder",
    ),
    # Blog
    path("blog/", BlogPostListView.as_view(), name="blog-list"),
    path("blog/create/", BlogPostCreateView.as_view(), name="blog-create"),
    path("blog/<uuid:pk>/", BlogPostDetailView.as_view(), name="blog-detail"),
    path("blog/<uuid:pk>/publish/", BlogPostPublishView.as_view(), name="blog-publish"),
]
