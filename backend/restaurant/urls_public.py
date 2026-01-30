"""
Public URL configuration for the restaurant app.

Provides read-only access to restaurant information.
"""

from django.urls import path

from restaurant.views_public import (
    BlogDetailView,
    BlogListView,
    GalleryListView,
    RestaurantInfoView,
    ServicePeriodsListView,
    TestimonialsListView,
)

app_name = "restaurant_public"

urlpatterns = [
    # Restaurant info
    path("info/", RestaurantInfoView.as_view(), name="restaurant-info"),
    
    # Service periods / hours
    path("hours/", ServicePeriodsListView.as_view(), name="service-periods"),
    
    # Gallery
    path("gallery/", GalleryListView.as_view(), name="gallery-list"),
    
    # Testimonials
    path("testimonials/", TestimonialsListView.as_view(), name="testimonials-list"),
    
    # Blog
    path("blog/", BlogListView.as_view(), name="blog-list"),
    path("blog/<slug:slug>/", BlogDetailView.as_view(), name="blog-detail"),
]
