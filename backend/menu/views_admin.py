"""
Admin views for the menu app.

Provides CRUD operations for menu management.
"""

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import CursorPagination
from core.permissions import IsEditor
from core.serializers import SortOrderSerializer
from menu.models import MenuCategory, MenuItem, MenuItemVariant

# Category Views


class MenuCategoryListView(generics.ListAPIView):
    """List all menu categories."""

    permission_classes = [IsAuthenticated, IsEditor]
    pagination_class = CursorPagination

    def get_queryset(self):
        return MenuCategory.objects.prefetch_related("items__variants").all()

    def list(self, request: Request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for category in queryset:
            items_data = []
            for item in category.items.all():
                variants_data = [
                    {
                        "id": str(v.id),
                        "name": v.name,
                        "price_cents": v.price_cents,
                        "sort_order": v.sort_order,
                    }
                    for v in item.variants.all()
                ]
                items_data.append(
                    {
                        "id": str(item.id),
                        "name": item.name,
                        "description": item.description,
                        "tags": item.tags,
                        "sort_order": item.sort_order,
                        "variants_count": len(variants_data),
                        "variants": variants_data,
                    }
                )

            data.append(
                {
                    "id": str(category.id),
                    "name": category.name,
                    "sort_order": category.sort_order,
                    "items_count": len(items_data),
                    "items": items_data,
                }
            )

        return Response({"categories": data})


class MenuCategoryCreateView(APIView):
    """Create a new menu category."""

    permission_classes = [IsAuthenticated, IsEditor]

    def post(self, request: Request) -> Response:
        name = request.data.get("name")
        if not name:
            return Response(
                {
                    "error": "VALIDATION_ERROR",
                    "message": "Name is required.",
                    "details": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        category = MenuCategory.objects.create(
            name=name,
            sort_order=request.data.get("sort_order", 0),
        )

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.category.created",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_category",
            entity_id=category.id,
            metadata={"name": category.name},
        )

        return Response(
            {"id": str(category.id), "message": "Category created successfully."},
            status=status.HTTP_201_CREATED,
        )


class MenuCategoryDetailView(APIView):
    """Retrieve, update or delete a menu category."""

    permission_classes = [IsAuthenticated, IsEditor]

    def get_object(self, pk: str) -> MenuCategory | None:
        try:
            return MenuCategory.objects.prefetch_related("items__variants").get(pk=pk)
        except MenuCategory.DoesNotExist:
            return None

    def get(self, request: Request, pk: str) -> Response:
        category = self.get_object(pk)
        if not category:
            return Response(
                {"error": "NOT_FOUND", "message": "Category not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        items_data = []
        for item in category.items.all():
            variants_data = [
                {
                    "id": str(v.id),
                    "name": v.name,
                    "price_cents": v.price_cents,
                    "sort_order": v.sort_order,
                }
                for v in item.variants.all()
            ]
            items_data.append(
                {
                    "id": str(item.id),
                    "name": item.name,
                    "description": item.description,
                    "tags": item.tags,
                    "photos": item.photos,
                    "sort_order": item.sort_order,
                    "variants": variants_data,
                }
            )

        data = {
            "id": str(category.id),
            "name": category.name,
            "sort_order": category.sort_order,
            "items": items_data,
        }
        return Response(data)

    def patch(self, request: Request, pk: str) -> Response:
        category = self.get_object(pk)
        if not category:
            return Response(
                {"error": "NOT_FOUND", "message": "Category not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "name" in request.data:
            category.name = request.data["name"]
        if "sort_order" in request.data:
            category.sort_order = request.data["sort_order"]

        category.save()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.category.updated",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_category",
            entity_id=category.id,
            metadata={"name": category.name},
        )

        return Response({"message": "Category updated successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        category = self.get_object(pk)
        if not category:
            return Response(
                {"error": "NOT_FOUND", "message": "Category not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        category_name = category.name
        category.delete()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.category.deleted",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_category",
            entity_id=None,
            metadata={"name": category_name},
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class MenuCategoryReorderView(APIView):
    """Reorder menu categories."""

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

        for index, category_id in enumerate(ids):
            try:
                category = MenuCategory.objects.get(pk=category_id)
                category.sort_order = (index + 1) * 10
                category.save()
            except MenuCategory.DoesNotExist:
                return Response(
                    {
                        "error": "NOT_FOUND",
                        "message": f"Category {category_id} not found.",
                        "details": {},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response({"message": "Categories reordered successfully."})


# Item Views


class MenuItemListView(generics.ListAPIView):
    """List all menu items."""

    permission_classes = [IsAuthenticated, IsEditor]
    pagination_class = CursorPagination

    def get_queryset(self):
        return MenuItem.objects.prefetch_related("variants").all()

    def list(self, request: Request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for item in queryset:
            variants_data = [
                {
                    "id": str(v.id),
                    "name": v.name,
                    "price_cents": v.price_cents,
                    "sort_order": v.sort_order,
                }
                for v in item.variants.all()
            ]
            data.append(
                {
                    "id": str(item.id),
                    "name": item.name,
                    "category_id": str(item.category_id),
                    "description": item.description,
                    "tags": item.tags,
                    "sort_order": item.sort_order,
                    "variants": variants_data,
                }
            )
        return Response({"items": data})


class MenuItemCreateView(APIView):
    """Create a new menu item."""

    permission_classes = [IsAuthenticated, IsEditor]

    def post(self, request: Request) -> Response:
        required = ["name", "category_id"]
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

        try:
            category = MenuCategory.objects.get(pk=request.data["category_id"])
        except MenuCategory.DoesNotExist:
            return Response(
                {"error": "NOT_FOUND", "message": "Category not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        item = MenuItem.objects.create(
            category=category,
            name=request.data["name"],
            description=request.data.get("description", ""),
            tags=request.data.get("tags", []),
            photos=request.data.get("photos", []),
            sort_order=request.data.get("sort_order", 0),
        )

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.item.created",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_item",
            entity_id=item.id,
            metadata={"name": item.name, "category": category.name},
        )

        return Response(
            {"id": str(item.id), "message": "Menu item created successfully."},
            status=status.HTTP_201_CREATED,
        )


class MenuItemDetailView(APIView):
    """Retrieve, update or delete a menu item."""

    permission_classes = [IsAuthenticated, IsEditor]

    def get_object(self, pk: str) -> MenuItem | None:
        try:
            return MenuItem.objects.prefetch_related("variants").get(pk=pk)
        except MenuItem.DoesNotExist:
            return None

    def get(self, request: Request, pk: str) -> Response:
        item = self.get_object(pk)
        if not item:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Menu item not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        variants_data = [
            {
                "id": str(v.id),
                "name": v.name,
                "price_cents": v.price_cents,
                "sort_order": v.sort_order,
            }
            for v in item.variants.all()
        ]

        data = {
            "id": str(item.id),
            "name": item.name,
            "category_id": str(item.category_id),
            "description": item.description,
            "tags": item.tags,
            "photos": item.photos,
            "sort_order": item.sort_order,
            "variants": variants_data,
        }
        return Response(data)

    def patch(self, request: Request, pk: str) -> Response:
        item = self.get_object(pk)
        if not item:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Menu item not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        allowed_fields = ["name", "description", "tags", "photos", "sort_order"]
        for field in allowed_fields:
            if field in request.data:
                setattr(item, field, request.data[field])

        # Handle category change
        if "category_id" in request.data:
            try:
                category = MenuCategory.objects.get(pk=request.data["category_id"])
                item.category = category
            except MenuCategory.DoesNotExist:
                return Response(
                    {
                        "error": "NOT_FOUND",
                        "message": "Category not found.",
                        "details": {},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        item.save()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.item.updated",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_item",
            entity_id=item.id,
            metadata={"name": item.name},
        )

        return Response({"message": "Menu item updated successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        item = self.get_object(pk)
        if not item:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Menu item not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        item_name = item.name
        item.delete()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.item.deleted",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_item",
            entity_id=None,
            metadata={"name": item_name},
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class MenuItemReorderView(APIView):
    """Reorder menu items within a category."""

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

        for index, item_id in enumerate(ids):
            try:
                item = MenuItem.objects.get(pk=item_id)
                item.sort_order = (index + 1) * 10
                item.save()
            except MenuItem.DoesNotExist:
                return Response(
                    {
                        "error": "NOT_FOUND",
                        "message": f"Menu item {item_id} not found.",
                        "details": {},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response({"message": "Menu items reordered successfully."})


# Variant Views


class MenuItemVariantCreateView(APIView):
    """Create a new menu item variant."""

    permission_classes = [IsAuthenticated, IsEditor]

    def post(self, request: Request) -> Response:
        required = ["name", "price_cents", "item_id"]
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

        try:
            item = MenuItem.objects.get(pk=request.data["item_id"])
        except MenuItem.DoesNotExist:
            return Response(
                {
                    "error": "NOT_FOUND",
                    "message": "Menu item not found.",
                    "details": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        variant = MenuItemVariant.objects.create(
            item=item,
            name=request.data["name"],
            price_cents=request.data["price_cents"],
            sort_order=request.data.get("sort_order", 0),
        )

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.variant.created",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_variant",
            entity_id=variant.id,
            metadata={"name": variant.name, "item": item.name},
        )

        return Response(
            {"id": str(variant.id), "message": "Variant created successfully."},
            status=status.HTTP_201_CREATED,
        )


class MenuItemVariantDetailView(APIView):
    """Retrieve, update or delete a menu item variant."""

    permission_classes = [IsAuthenticated, IsEditor]

    def get_object(self, pk: str) -> MenuItemVariant | None:
        try:
            return MenuItemVariant.objects.get(pk=pk)
        except MenuItemVariant.DoesNotExist:
            return None

    def get(self, request: Request, pk: str) -> Response:
        variant = self.get_object(pk)
        if not variant:
            return Response(
                {"error": "NOT_FOUND", "message": "Variant not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "id": str(variant.id),
            "name": variant.name,
            "price_cents": variant.price_cents,
            "price_display": variant.price_display,
            "sort_order": variant.sort_order,
            "item_id": str(variant.item_id),
        }
        return Response(data)

    def patch(self, request: Request, pk: str) -> Response:
        variant = self.get_object(pk)
        if not variant:
            return Response(
                {"error": "NOT_FOUND", "message": "Variant not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        allowed_fields = ["name", "price_cents", "sort_order"]
        for field in allowed_fields:
            if field in request.data:
                setattr(variant, field, request.data[field])

        variant.save()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.variant.updated",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_variant",
            entity_id=variant.id,
            metadata={"name": variant.name},
        )

        return Response({"message": "Variant updated successfully."})

    def delete(self, request: Request, pk: str) -> Response:
        variant = self.get_object(pk)
        if not variant:
            return Response(
                {"error": "NOT_FOUND", "message": "Variant not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )

        variant_name = variant.name
        variant.delete()

        # Log audit event
        from core.models import AuditEvent

        AuditEvent.objects.create(
            event="menu.variant.deleted",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="menu_variant",
            entity_id=None,
            metadata={"name": variant_name},
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class MenuItemVariantReorderView(APIView):
    """Reorder menu item variants."""

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

        for index, variant_id in enumerate(ids):
            try:
                variant = MenuItemVariant.objects.get(pk=variant_id)
                variant.sort_order = (index + 1) * 10
                variant.save()
            except MenuItemVariant.DoesNotExist:
                return Response(
                    {
                        "error": "NOT_FOUND",
                        "message": f"Variant {variant_id} not found.",
                        "details": {},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response({"message": "Variants reordered successfully."})
