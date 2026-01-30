"""
Public views for the restaurant app.

Provides read-only access to restaurant information for the public website.
"""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import CursorPagination
from restaurant.models import BlogPost, GalleryImage, Restaurant, ServicePeriod, Testimonial


class RestaurantInfoView(APIView):
    """
    Public endpoint for restaurant information.
    
    Returns restaurant profile, contact info, location, and social links.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request: Request) -> Response:
        """Get restaurant information."""
        restaurant = Restaurant.get_instance()
        
        if not restaurant:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Restaurant information not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Get settings if available
        settings_data = {}
        if hasattr(restaurant, "settings"):
            settings = restaurant.settings
            settings_data = {
                "timezone": settings.timezone,
                "ga4_measurement_id": settings.ga4_measurement_id,
            }
        
        data = {
            "id": str(restaurant.id),
            "name": restaurant.name,
            "tagline": restaurant.tagline,
            "description": restaurant.description,
            "phone": restaurant.phone,
            "email": restaurant.email,
            "location": restaurant.location,
            "social": restaurant.social,
            "branding": restaurant.branding,
            "settings": settings_data,
        }
        
        return Response(data)


class ServicePeriodsListView(APIView):
    """
    Public endpoint for service periods (opening hours).
    
    Returns all service periods grouped by weekday.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request: Request) -> Response:
        """Get all service periods."""
        restaurant = Restaurant.get_instance()
        
        if not restaurant:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Restaurant information not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Get service periods
        periods = ServicePeriod.objects.filter(restaurant=restaurant)
        
        # Group by weekday
        weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        grouped_periods = {day: [] for day in weekdays}
        
        for period in periods:
            day_name = weekdays[period.weekday]
            grouped_periods[day_name].append({
                "id": str(period.id),
                "name": period.name,
                "opens_at": period.opens_at.strftime("%H:%M"),
                "closes_at": period.closes_at.strftime("%H:%M"),
            })
        
        # Remove empty days
        grouped_periods = {k: v for k, v in grouped_periods.items() if v}
        
        return Response({
            "timezone": restaurant.settings.timezone if hasattr(restaurant, "settings") else "UTC",
            "schedule": grouped_periods,
        })


class GalleryListView(generics.ListAPIView):
    """
    Public endpoint for gallery images.
    
    Returns published gallery images sorted by sort_order.
    """
    
    permission_classes = [AllowAny]
    pagination_class = CursorPagination
    
    def get_queryset(self):
        """Return published gallery images."""
        return GalleryImage.objects.filter(is_published=True)
    
    def list(self, request: Request, *args, **kwargs):
        """List gallery images."""
        queryset = self.get_queryset()
        
        # Manual serialization for public view
        images = []
        for img in queryset:
            images.append({
                "id": str(img.id),
                "url": request.build_absolute_uri(img.image.url) if img.image else None,
                "alt_text": img.alt_text,
                "sort_order": img.sort_order,
            })
        
        return Response({"images": images})


class TestimonialsListView(generics.ListAPIView):
    """
    Public endpoint for testimonials.
    
    Returns published testimonials sorted by sort_order.
    """
    
    permission_classes = [AllowAny]
    pagination_class = CursorPagination
    
    def get_queryset(self):
        """Return published testimonials."""
        return Testimonial.objects.filter(is_published=True)
    
    def list(self, request: Request, *args, **kwargs):
        """List testimonials."""
        queryset = self.get_queryset()
        
        # Manual serialization for public view
        testimonials = []
        for t in queryset:
            testimonials.append({
                "id": str(t.id),
                "name": t.name,
                "rating": t.rating,
                "text": t.text,
                "sort_order": t.sort_order,
            })
        
        return Response({"testimonials": testimonials})


class BlogListView(generics.ListAPIView):
    """
    Public endpoint for blog posts.
    
    Returns published blog posts with pagination.
    """
    
    permission_classes = [AllowAny]
    pagination_class = CursorPagination
    
    def get_queryset(self):
        """Return published blog posts."""
        return BlogPost.objects.filter(
            published_at__isnull=False,
            published_at__lte=timezone.now(),
        )
    
    def list(self, request: Request, *args, **kwargs):
        """List blog posts."""
        queryset = self.get_queryset()
        
        # Manual pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            posts = self._serialize_posts(page, request)
            return self.get_paginated_response(posts)
        
        posts = self._serialize_posts(queryset, request)
        return Response({"posts": posts})
    
    def _serialize_posts(self, posts, request: Request):
        """Serialize blog posts for public view."""
        result = []
        for post in posts:
            data = {
                "id": str(post.id),
                "title": post.title,
                "slug": post.slug,
                "excerpt": self._generate_excerpt(post.body_html),
                "cover_image_url": (
                    request.build_absolute_uri(post.cover_image.url)
                    if post.cover_image else None
                ),
                "published_at": post.published_at.isoformat() if post.published_at else None,
                "seo": post.seo,
            }
            result.append(data)
        return result
    
    def _generate_excerpt(self, html: str, max_length: int = 200) -> str:
        """Generate excerpt from HTML content."""
        import re
        
        if not html:
            return ""
        
        # Remove HTML tags
        text = re.sub(r"<[^>]+>", "", html)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()
        
        if len(text) <= max_length:
            return text
        
        # Truncate at word boundary
        truncated = text[:max_length]
        last_space = truncated.rfind(" ")
        if last_space > 0:
            truncated = truncated[:last_space]
        
        return truncated + "..."


class BlogDetailView(APIView):
    """
    Public endpoint for a single blog post.
    
    Returns full blog post details including HTML content.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request: Request, slug: str) -> Response:
        """Get blog post by slug."""
        try:
            post = BlogPost.objects.get(
                slug=slug,
                published_at__isnull=False,
                published_at__lte=timezone.now(),
            )
        except BlogPost.DoesNotExist:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Blog post not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        
        data = {
            "id": str(post.id),
            "title": post.title,
            "slug": post.slug,
            "body_html": post.body_html,
            "cover_image_url": (
                request.build_absolute_uri(post.cover_image.url)
                if post.cover_image else None
            ),
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "seo": post.seo,
        }
        
        return Response(data)
