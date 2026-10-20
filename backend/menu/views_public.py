"""
Public views for the menu app.

Provides read-only access to menu information for the public website.
"""

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from menu.models import MenuCategory


class MenuListView(APIView):
    """
    Public endpoint for the full menu.

    Returns all categories with their items and variants,
    sorted by sort_order.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        """Get the full menu."""
        categories = MenuCategory.objects.prefetch_related("items__variants").all()

        menu_data = []
        for category in categories:
            category_data = {
                "id": str(category.id),
                "name": category.name,
                "sort_order": category.sort_order,
                "items": self._serialize_items(category.items.all(), request),
            }
            menu_data.append(category_data)

        return Response({"categories": menu_data})

    def _serialize_items(self, items, request: Request) -> list[dict]:
        """Serialize menu items."""
        result = []
        for item in items:
            item_data = {
                "id": str(item.id),
                "name": item.name,
                "description": item.description,
                "tags": item.tags,
                "photos": self._serialize_photos(item.photos, request),
                "sort_order": item.sort_order,
                "variants": self._serialize_variants(item.variants.all()),
            }
            result.append(item_data)
        return result

    def _serialize_photos(self, photos: list, request: Request) -> list[dict]:
        """Serialize photo URLs."""
        result = []
        for photo in photos:
            if isinstance(photo, str):
                # If it's just a filename/path
                result.append(
                    {
                        "url": request.build_absolute_uri(f"/media/{photo}"),
                    }
                )
            elif isinstance(photo, dict):
                # If it's already a dict with metadata
                photo_copy = photo.copy()
                if "url" in photo_copy and not photo_copy["url"].startswith("http"):
                    photo_copy["url"] = request.build_absolute_uri(photo_copy["url"])
                result.append(photo_copy)
        return result

    def _serialize_variants(self, variants) -> list[dict]:
        """Serialize menu item variants."""
        result = []
        for variant in variants:
            variant_data = {
                "id": str(variant.id),
                "name": variant.name,
                "price_cents": variant.price_cents,
                "price_display": variant.price_display,
                "sort_order": variant.sort_order,
            }
            result.append(variant_data)
        return result
