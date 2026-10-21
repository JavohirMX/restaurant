"""
Base serializer classes with common functionality.

Provides audit field handling and common validation patterns
for all API serializers.
"""

from typing import Any

from rest_framework import serializers


class BaseModelSerializer(serializers.ModelSerializer):
    """
    Base serializer with common functionality for all models.

    Features:
    - Includes audit fields (created_at, updated_at) by default
    - Provides consistent field handling
    """

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        abstract = True


class AuditModelSerializer(BaseModelSerializer):
    """
    Serializer with full audit field support.

    Includes created_by and updated_by tracking when available.
    """

    created_by = serializers.SerializerMethodField(read_only=True)
    updated_by = serializers.SerializerMethodField(read_only=True)

    class Meta:
        abstract = True

    def get_created_by(self, obj: Any) -> dict[str, Any] | None:
        """Get the user who created this object."""
        if hasattr(obj, "created_by") and obj.created_by:
            return {
                "id": str(obj.created_by.id),
                "email": obj.created_by.email,
                "name": obj.created_by.get_full_name() or obj.created_by.email,
            }
        return None

    def get_updated_by(self, obj: Any) -> dict[str, Any] | None:
        """Get the user who last updated this object."""
        if hasattr(obj, "updated_by") and obj.updated_by:
            return {
                "id": str(obj.updated_by.id),
                "email": obj.updated_by.email,
                "name": obj.updated_by.get_full_name() or obj.updated_by.email,
            }
        return None

    def create(self, validated_data: dict) -> Any:
        """Create object with current user tracking."""
        # Set created_by if the model has this field
        if hasattr(self.Meta.model, "created_by"):
            request = self.context.get("request")
            if request and request.user and request.user.is_authenticated:
                validated_data["created_by"] = request.user

        return super().create(validated_data)

    def update(self, instance: Any, validated_data: dict) -> Any:
        """Update object with current user tracking."""
        # Set updated_by if the model has this field
        if hasattr(instance, "updated_by"):
            request = self.context.get("request")
            if request and request.user and request.user.is_authenticated:
                validated_data["updated_by"] = request.user

        return super().update(instance, validated_data)


class ReadOnlyModelSerializer(serializers.ModelSerializer):
    """
    Serializer for read-only endpoints.

    All fields are read-only by default.
    """

    class Meta:
        abstract = True

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        # Make all fields read-only
        for field in self.fields.values():
            field.read_only = True


class CreateOnlyModelSerializer(serializers.ModelSerializer):
    """
    Serializer that allows create but not update.

    Useful for immutable resources like audit logs.
    """

    class Meta:
        abstract = True

    def update(self, instance: Any, validated_data: dict) -> Any:
        """Prevent updates."""
        raise serializers.ValidationError("This resource cannot be modified.")


class SortOrderSerializer(serializers.Serializer):
    """
    Serializer for reordering operations.

    Used with PATCH /.../reorder endpoints.
    """

    ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of IDs in the desired order",
    )

    def validate_ids(self, value: list) -> list:
        """Validate that all IDs are unique."""
        if len(value) != len(set(value)):
            raise serializers.ValidationError("IDs must be unique.")
        return value


class EmptySerializer(serializers.Serializer):
    """
    Empty serializer for endpoints that don't need request body.
    """

    pass


class ErrorSerializer(serializers.Serializer):
    """
    Serializer for standardized error responses.

    Matches the error schema from docs/API/CONTRACT.md.
    """

    error = serializers.CharField(help_text="Error code")
    message = serializers.CharField(help_text="Human-readable error message")
    details = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()),
        required=False,
        help_text="Field-level error details",
    )


class PaginationSerializer(serializers.Serializer):
    """
    Serializer for pagination metadata.
    """

    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    count = serializers.IntegerField()


class PaginatedResponseSerializer(serializers.Serializer):
    """
    Serializer for paginated list responses.
    """

    data = serializers.ListField(child=serializers.DictField())
    pagination = PaginationSerializer()


# Common field validators


def validate_non_empty_string(value: str) -> str:
    """Validate that a string is not empty or whitespace-only."""
    if not value or not value.strip():
        raise serializers.ValidationError("This field cannot be empty.")
    return value.strip()


def validate_positive_integer(value: int) -> int:
    """Validate that an integer is positive."""
    if value <= 0:
        raise serializers.ValidationError("This field must be a positive integer.")
    return value


def validate_phone_number(value: str) -> str:
    """
    Basic phone number validation.

    Allows digits, spaces, dashes, parentheses, and plus sign.
    """
    import re

    if not value:
        return value

    # Remove common formatting characters
    cleaned = re.sub(r"[\s\-\(\)\.]+", "", value)

    # Check for valid characters (digits and optional leading +)
    if not re.match(r"^\+?[\d]+$", cleaned):
        raise serializers.ValidationError(
            "Phone number must contain only digits, spaces, dashes, parentheses, "
            "and an optional leading plus sign."
        )

    # Check length (reasonable range)
    digits_only = re.sub(r"\D", "", value)
    if len(digits_only) < 7 or len(digits_only) > 15:
        raise serializers.ValidationError(
            "Phone number must contain between 7 and 15 digits."
        )

    return value


def validate_hex_color(value: str) -> str:
    """Validate hex color code (e.g., #C9A227)."""
    import re

    if not value:
        return value

    if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
        raise serializers.ValidationError(
            "Color must be a valid hex code (e.g., #C9A227)."
        )

    return value.upper()
