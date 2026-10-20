"""
Admin views for the restaurant app.

Provides CRUD operations for restaurant content management.
"""

from django.utils import timezone
from PIL import Image
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import CursorPagination
from core.permissions import CanManageRestaurant, CanPublishContent, IsEditor
from core.serializers import SortOrderSerializer
from restaurant.models import (
    BlogPost,
    GalleryImage,
    Restaurant,
    ServicePeriod,
    Testimonial,
)

# Restaurant Profile Views


class RestaurantUpdateView(APIView):
    """
    Admin endpoint to update restaurant profile.
    """

    permission_classes = [IsAuthenticated, CanManageRestaurant]

    def get(self, request: Request) -> Response:
        """Get restaurant profile."""
        restaurant = Restaurant.get_instance()
        if not restaurant:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Restaurant not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

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
        }
        return Response(data)

    def patch(self, request: Request) -> Response:
        """Update restaurant profile."""
        restaurant = Restaurant.get_instance()
        if not restaurant:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Restaurant not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Update allowed fields
        allowed_fields = [
            "name",
            "tagline",
            "description",
            "phone",
            "email",
            "location",
            "social",
            "branding",
        ]
        for field in allowed_fields:
            if field in request.data:
                setattr(restaurant, field, request.data[field])

        restaurant.save()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="restaurant.updated",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="restaurant",
            entity_id=restaurant.id,
            metadata={"changed_fields": list(request.data.keys())},
        )

        return Response({"message": "Restaurant updated successfully."})


class RestaurantSettingsView(APIView):
    """
    Admin endpoint to manage restaurant settings.
    """

    permission_classes = [IsAuthenticated, CanManageRestaurant]

    def get(self, request: Request) -> Response:
        """Get restaurant settings."""
        restaurant = Restaurant.get_instance()
        if not restaurant or not hasattr(restaurant, "settings"):
            return Response(
                {"error": "NOT_FOUND", "message": "Settings not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        settings = restaurant.settings
        data = {
            "id": str(settings.id),
            "timezone": settings.timezone,
            "staff_inbox_email": settings.staff_inbox_email,
            "ga4_measurement_id": settings.ga4_measurement_id,
        }
        return Response(data)

    def patch(self, request: Request) -> Response:
        """Update restaurant settings."""
        restaurant = Restaurant.get_instance()
        if not restaurant or not hasattr(restaurant, "settings"):
            return Response(
                {"error": "NOT_FOUND", "message": "Settings not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        settings = restaurant.settings
        allowed_fields = ["timezone", "staff_inbox_email", "ga4_measurement_id"]
        for field in allowed_fields:
            if field in request.data:
                setattr(settings, field, request.data[field])

        settings.save()

        return Response({"message": "Settings updated successfully."})


# Service Period Views


class ServicePeriodListView(generics.ListAPIView):
    """List all service periods."""

    permission_classes = [IsAuthenticated, CanManageRestaurant]
    pagination_class = CursorPagination

    def get_queryset(self):
        return ServicePeriod.objects.all()

    def list(self, request: Request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for period in queryset:
            data.append(
                {
                    "id": str(period.id),
                    "name": period.name,
                    "weekday": period.weekday,
                    "weekday_display": period.get_weekday_display(),
                    "opens_at": period.opens_at.strftime("%H:%M"),
                    "closes_at": period.closes_at.strftime("%H:%M"),
                }
            )
        return Response({"service_periods": data})


class ServicePeriodCreateView(APIView):
    """Create a new service period."""

    permission_classes = [IsAuthenticated, CanManageRestaurant]

    def post(self, request: Request) -> Response:
        restaurant = Restaurant.get_instance()
        if not restaurant:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Restaurant not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate required fields
        required = ["name", "weekday", "opens_at", "closes_at"]
        for field in required:
            if field not in request.data:
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": f"Missing required field: {field}",
                        "details": {},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        period = ServicePeriod.objects.create(
            restaurant=restaurant,
            name=request.data["name"],
            weekday=request.data["weekday"],
            opens_at=request.data["opens_at"],
            closes_at=request.data["closes_at"],
        )

        return Response(
            {"id": str(period.id), "message": "Service period created successfully."},
            status=status.HTTP_201_CREATED,
        )


class ServicePeriodDetailView(APIView):
    """Retrieve, update or delete a service period."""

    permission_classes = [IsAuthenticated, CanManageRestaurant]

    def get_object(self, pk: str) -> ServicePeriod | None:
        try:
            return ServicePeriod.objects.get(pk=pk)
        except ServicePeriod.DoesNotExist:
            return None

    def get(self, request: Request, pk: str) -> Response:
        period = self.get_object(pk)
        if not period:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Service period not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "id": str(period.id),
            "name": period.name,
            "weekday": period.weekday,
            "weekday_display": period.get_weekday_display(),
            "opens_at": period.opens_at.strftime("%H:%M"),
            "closes_at": period.closes_at.strftime("%H:%M"),
        }
        return Response(data)

    def patch(self, request: Request, pk: str) -> Response:
        period = self.get_object(pk)
        if not period:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Service period not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        allowed_fields = ["name", "weekday", "opens_at", "closes_at"]
        for field in allowed_fields:
            if field in request.data:
                setattr(period, field, request.data[field])

        period.save()
        return Response({"message": "Service period updated successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        period = self.get_object(pk)
        if not period:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Service period not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        period.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Gallery Views


class GalleryImageListView(generics.ListAPIView):
    """List all gallery images (including unpublished)."""

    permission_classes = [IsAuthenticated, IsEditor]
    pagination_class = CursorPagination

    def get_queryset(self):
        return GalleryImage.objects.all()

    def list(self, request: Request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for img in queryset:
            data.append(
                {
                    "id": str(img.id),
                    "url": request.build_absolute_uri(img.image.url)
                    if img.image
                    else None,
                    "alt_text": img.alt_text,
                    "sort_order": img.sort_order,
                    "is_published": img.is_published,
                    "created_at": img.created_at.isoformat(),
                }
            )
        return Response({"images": data})


class GalleryImageCreateView(APIView):
    """Create a new gallery image."""

    permission_classes = [IsAuthenticated, IsEditor]

    def post(self, request: Request) -> Response:
        # Handle file upload
        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Image file is required.",
                    "details": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if image_file.size > max_size:
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Image file too large (max 5MB).",
                    "details": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image_file.content_type not in allowed_types:
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Invalid image type. Allowed types: JPEG, PNG, WebP.",
                    "details": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate image dimensions
        try:
            img = Image.open(image_file)
            if img.width > 4096 or img.height > 4096:
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": "Image dimensions too large (max 4096x4096).",
                        "details": {},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception:
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Invalid image file.",
                    "details": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        alt_text = request.data.get("alt_text", "")
        if not alt_text.strip():
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Alt text is required for accessibility.",
                    "details": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        image = GalleryImage.objects.create(
            image=image_file,
            alt_text=alt_text,
            sort_order=request.data.get("sort_order", 0),
            is_published=request.data.get("is_published", True),
        )

        return Response(
            {"id": str(image.id), "message": "Gallery image created successfully."},
            status=status.HTTP_201_CREATED,
        )


class GalleryImageDetailView(APIView):
    """Retrieve, update or delete a gallery image."""

    permission_classes = [IsAuthenticated, IsEditor]

    def get_object(self, pk: str) -> GalleryImage | None:
        try:
            return GalleryImage.objects.get(pk=pk)
        except GalleryImage.DoesNotExist:
            return None

    def get(self, request: Request, pk: str) -> Response:
        image = self.get_object(pk)
        if not image:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Gallery image not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "id": str(image.id),
            "url": request.build_absolute_uri(image.image.url) if image.image else None,
            "alt_text": image.alt_text,
            "sort_order": image.sort_order,
            "is_published": image.is_published,
        }
        return Response(data)

    def patch(self, request: Request, pk: str) -> Response:
        image = self.get_object(pk)
        if not image:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Gallery image not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate alt text if provided
        if "alt_text" in request.data:
            alt_text = request.data["alt_text"]
            if not alt_text or not alt_text.strip():
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": "Alt text cannot be empty.",
                        "details": {},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            image.alt_text = alt_text

        if "sort_order" in request.data:
            image.sort_order = request.data["sort_order"]

        if "is_published" in request.data:
            new_published = request.data["is_published"]
            # Validate alt text before publishing
            if new_published and (not image.alt_text or not image.alt_text.strip()):
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": "Alt text is required before publishing.",
                        "details": {},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            image.is_published = new_published

        image.save()
        return Response({"message": "Gallery image updated successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        image = self.get_object(pk)
        if not image:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Gallery image not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GalleryImageReorderView(APIView):
    """Reorder gallery images."""

    permission_classes = [IsAuthenticated, IsEditor]

    def patch(self, request: Request) -> Response:
        serializer = SortOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Invalid data.",
                    "details": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = serializer.validated_data["ids"]

        # Update sort orders
        for index, image_id in enumerate(ids):
            try:
                image = GalleryImage.objects.get(pk=image_id)
                image.sort_order = (index + 1) * 10
                image.save()
            except GalleryImage.DoesNotExist:
                return Response(
                    {
                        "error": "NOT_FOUND",
                        "message": f"Gallery image {image_id} not found.",
                        "details": {},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response({"message": "Gallery images reordered successfully."})


# Testimonial Views


class TestimonialListView(generics.ListAPIView):
    """List all testimonials."""

    permission_classes = [IsAuthenticated, IsEditor]
    pagination_class = CursorPagination

    def get_queryset(self):
        return Testimonial.objects.all()

    def list(self, request: Request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for t in queryset:
            data.append(
                {
                    "id": str(t.id),
                    "name": t.name,
                    "rating": t.rating,
                    "text": t.text,
                    "sort_order": t.sort_order,
                    "is_published": t.is_published,
                }
            )
        return Response({"testimonials": data})


class TestimonialCreateView(APIView):
    """Create a new testimonial."""

    permission_classes = [IsAuthenticated, IsEditor]

    def post(self, request: Request) -> Response:
        required = ["name", "rating", "text"]
        for field in required:
            if field not in request.data:
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": f"Missing required field: {field}",
                        "details": {},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        testimonial = Testimonial.objects.create(
            name=request.data["name"],
            rating=request.data["rating"],
            text=request.data["text"],
            sort_order=request.data.get("sort_order", 0),
            is_published=request.data.get("is_published", True),
        )

        return Response(
            {"id": str(testimonial.id), "message": "Testimonial created successfully."},
            status=status.HTTP_201_CREATED,
        )


class TestimonialDetailView(APIView):
    """Retrieve, update or delete a testimonial."""

    permission_classes = [IsAuthenticated, IsEditor]

    def get_object(self, pk: str) -> Testimonial | None:
        try:
            return Testimonial.objects.get(pk=pk)
        except Testimonial.DoesNotExist:
            return None

    def get(self, request: Request, pk: str) -> Response:
        testimonial = self.get_object(pk)
        if not testimonial:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Testimonial not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "id": str(testimonial.id),
            "name": testimonial.name,
            "rating": testimonial.rating,
            "text": testimonial.text,
            "sort_order": testimonial.sort_order,
            "is_published": testimonial.is_published,
        }
        return Response(data)

    def patch(self, request: Request, pk: str) -> Response:
        testimonial = self.get_object(pk)
        if not testimonial:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Testimonial not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        allowed_fields = ["name", "rating", "text", "sort_order", "is_published"]
        for field in allowed_fields:
            if field in request.data:
                setattr(testimonial, field, request.data[field])

        testimonial.save()
        return Response({"message": "Testimonial updated successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        testimonial = self.get_object(pk)
        if not testimonial:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Testimonial not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        testimonial.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TestimonialReorderView(APIView):
    """Reorder testimonials."""

    permission_classes = [IsAuthenticated, IsEditor]

    def patch(self, request: Request) -> Response:
        serializer = SortOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Invalid data.",
                    "details": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = serializer.validated_data["ids"]

        for index, testimonial_id in enumerate(ids):
            try:
                testimonial = Testimonial.objects.get(pk=testimonial_id)
                testimonial.sort_order = (index + 1) * 10
                testimonial.save()
            except Testimonial.DoesNotExist:
                return Response(
                    {
                        "error": "NOT_FOUND",
                        "message": f"Testimonial {testimonial_id} not found.",
                        "details": {},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response({"message": "Testimonials reordered successfully."})


# Blog Views


class BlogPostListView(generics.ListAPIView):
    """List all blog posts (including drafts)."""

    permission_classes = [IsAuthenticated, IsEditor]
    pagination_class = CursorPagination

    def get_queryset(self):
        return BlogPost.objects.all()

    def list(self, request: Request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for post in queryset:
            data.append(
                {
                    "id": str(post.id),
                    "title": post.title,
                    "slug": post.slug,
                    "excerpt": post.body_html[:200] if post.body_html else "",
                    "is_published": post.is_published,
                    "published_at": post.published_at.isoformat()
                    if post.published_at
                    else None,
                    "created_at": post.created_at.isoformat(),
                }
            )
        return Response({"posts": data})


class BlogPostCreateView(APIView):
    """Create a new blog post."""

    permission_classes = [IsAuthenticated, IsEditor]

    def post(self, request: Request) -> Response:
        required = ["title"]
        for field in required:
            if field not in request.data:
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": f"Missing required field: {field}",
                        "details": {},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        post = BlogPost.objects.create(
            title=request.data["title"],
            slug=request.data.get("slug", ""),
            body_json=request.data.get("body_json", {}),
            body_html=request.data.get("body_html", ""),
            seo=request.data.get("seo", {}),
        )

        return Response(
            {"id": str(post.id), "message": "Blog post created successfully."},
            status=status.HTTP_201_CREATED,
        )


class BlogPostDetailView(APIView):
    """Retrieve, update or delete a blog post."""

    permission_classes = [IsAuthenticated, IsEditor]

    def get_object(self, pk: str) -> BlogPost | None:
        try:
            return BlogPost.objects.get(pk=pk)
        except BlogPost.DoesNotExist:
            return None

    def get(self, request: Request, pk: str) -> Response:
        post = self.get_object(pk)
        if not post:
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
            "body_json": post.body_json,
            "body_html": post.body_html,
            "cover_image_url": request.build_absolute_uri(post.cover_image.url)
            if post.cover_image
            else None,
            "is_published": post.is_published,
            "published_at": post.published_at.isoformat()
            if post.published_at
            else None,
            "seo": post.seo,
        }
        return Response(data)

    def patch(self, request: Request, pk: str) -> Response:
        post = self.get_object(pk)
        if not post:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Blog post not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        allowed_fields = ["title", "slug", "body_json", "body_html", "seo"]
        for field in allowed_fields:
            if field in request.data:
                setattr(post, field, request.data[field])

        post.save()
        return Response({"message": "Blog post updated successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        post = self.get_object(pk)
        if not post:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Blog post not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BlogPostPublishView(APIView):
    """Publish or unpublish a blog post."""

    permission_classes = [IsAuthenticated, CanPublishContent]

    def get_object(self, pk: str) -> BlogPost | None:
        try:
            return BlogPost.objects.get(pk=pk)
        except BlogPost.DoesNotExist:
            return None

    def post(self, request: Request, pk: str) -> Response:
        """Publish the blog post."""
        post = self.get_object(pk)
        if not post:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Blog post not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        post.published_at = timezone.now()
        post.save()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="blog.post.published",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="blog_post",
            entity_id=post.id,
            metadata={"title": post.title},
        )

        return Response({"message": "Blog post published successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        """Unpublish the blog post."""
        post = self.get_object(pk)
        if not post:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Blog post not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        post.published_at = None
        post.save()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="blog.post.unpublished",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="blog_post",
            entity_id=post.id,
            metadata={"title": post.title},
        )

        return Response({"message": "Blog post unpublished successfully."})
