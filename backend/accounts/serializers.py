"""
Serializers for the accounts app.

Provides serialization for User model and authentication.
"""

from typing import Any

from django.contrib.auth import authenticate
from rest_framework import serializers

from accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model.
    
    Includes basic user information and computed permission flags.
    """
    
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "date_joined",
            "permissions",
        ]
        read_only_fields = [
            "id",
            "date_joined",
            "is_active",
        ]
    
    def get_permissions(self, obj: User) -> dict[str, bool]:
        """Get permission flags for the user."""
        return {
            "is_admin": obj.is_admin,
            "is_manager": obj.is_manager,
            "can_manage_reservations": obj.can_manage_reservations,
            "can_manage_content": obj.can_manage_content,
        }


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users.
    
    Handles password setting and validation.
    """
    
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="Password must be at least 8 characters",
    )
    password_confirm = serializers.CharField(
        write_only=True,
        help_text="Confirm the password",
    )
    
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id"]
    
    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        """Validate that passwords match."""
        if data.get("password") != data.get("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return data
    
    def create(self, validated_data: dict[str, Any]) -> User:
        """Create user with password."""
        # Remove password_confirm from data
        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating users.
    
    Allows updating profile information without password.
    """
    
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
        ]
        read_only_fields = ["id"]


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login requests.
    
    Validates email and password credentials.
    """
    
    email = serializers.EmailField(
        help_text="User's email address",
    )
    password = serializers.CharField(
        write_only=True,
        help_text="User's password",
    )
    
    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        """Validate credentials."""
        email = data.get("email")
        password = data.get("password")

        if email and password:
            user = authenticate(
                request=self.context.get("request"),
                email=email,
                password=password,
            )

            if not user:
                raise serializers.ValidationError(
                    "Invalid email or password.",
                    code="authorization",
                )

            if not user.is_active:
                raise serializers.ValidationError(
                    "User account is disabled.",
                    code="authorization",
                )

            data["user"] = user
        else:
            raise serializers.ValidationError(
                "Must include 'email' and 'password'.",
                code="required",
            )

        return data


class TokenResponseSerializer(serializers.Serializer):
    """
    Serializer for token response.
    
    Standardizes the login/refresh response format.
    """
    
    access_token = serializers.CharField(
        help_text="JWT access token",
    )
    refresh_token = serializers.CharField(
        help_text="JWT refresh token",
        required=False,
    )
    expires_in = serializers.IntegerField(
        help_text="Access token expiration time in seconds",
    )
    user = UserSerializer(
        help_text="User profile information",
    )


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change requests.
    """
    
    current_password = serializers.CharField(
        write_only=True,
        help_text="Current password",
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="New password (min 8 characters)",
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        help_text="Confirm new password",
    )
    
    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        """Validate password change."""
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return data
    
    def validate_current_password(self, value: str) -> str:
        """Validate current password."""
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
