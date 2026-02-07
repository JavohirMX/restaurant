"""
Custom user model with role-based access control.
"""

import re
import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.db import models


class UserManager(BaseUserManager):
    """Custom user manager that uses email as the unique identifier."""

    def _validate_password(self, password: str) -> None:
        """Validate password meets security requirements.

        Raises:
            ValidationError: If password does not meet requirements.
        """
        if password is None:
            raise ValidationError("Password is required.")

        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long.")

        if not re.search(r"[A-Z]", password):
            raise ValidationError(
                "Password must contain at least one uppercase letter."
            )

        if not re.search(r"[a-z]", password):
            raise ValidationError(
                "Password must contain at least one lowercase letter."
            )

        if not re.search(r"\d", password):
            raise ValidationError("Password must contain at least one digit.")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-=\[\]\\;'/`~]", password):
            raise ValidationError(
                "Password must contain at least one special character."
            )

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        # Validate password before setting
        if password is not None:
            self._validate_password(password)

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        # Validate password before creating
        if password is not None:
            self._validate_password(password)

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model with email as the primary identifier and role-based permissions.
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        HOST = "host", "Host"
        EDITOR = "editor", "Editor"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Remove username field
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.HOST,
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # Email is already required by USERNAME_FIELD

    class Meta:
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["email"], name="accounts_user_email_idx"),
            models.Index(fields=["role"], name="accounts_user_role_idx"),
            models.Index(
                fields=["is_active", "role"], name="accounts_user_active_role_idx"
            ),
        ]

    def __str__(self):
        return self.email

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_manager(self):
        return self.role in (self.Role.ADMIN, self.Role.MANAGER)

    @property
    def can_manage_reservations(self):
        return self.role in (self.Role.ADMIN, self.Role.MANAGER, self.Role.HOST)

    @property
    def can_manage_content(self):
        return self.role in (self.Role.ADMIN, self.Role.MANAGER, self.Role.EDITOR)
