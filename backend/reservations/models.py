"""
Reservation models: settings, reservations, and tokens for guest management.
"""

import secrets
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import BaseModel


class ReservationSettings(BaseModel):
    """
    Reservation system configuration. Singleton pattern.
    Values based on docs/RESERVATIONS/POLICY.md.
    """

    # Slot configuration
    slot_interval_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Time between reservation slots",
    )
    turn_time_minutes = models.PositiveIntegerField(
        default=90,
        help_text="Expected duration of a reservation",
    )

    # Capacity
    max_guests_per_slot = models.PositiveIntegerField(
        default=40,
        help_text="Maximum guests per time slot (confirmed reservations only)",
    )
    max_party_size_online = models.PositiveIntegerField(
        default=8,
        help_text="Maximum party size for online booking (larger parties must call)",
    )

    # Booking constraints
    min_lead_time_minutes = models.PositiveIntegerField(
        default=120,
        help_text="Minimum advance notice required (default: 2 hours)",
    )
    max_days_ahead = models.PositiveIntegerField(
        default=30,
        help_text="How far in advance guests can book (default: 30 days)",
    )
    require_phone = models.BooleanField(
        default=True,
        help_text="Whether phone number is required for booking",
    )

    # Approval triggers
    approval_party_size_threshold = models.PositiveIntegerField(
        default=6,
        help_text="Parties larger than this require approval",
    )
    same_day_window_hours = models.PositiveIntegerField(
        default=4,
        help_text="Same-day bookings within this window require approval",
    )
    near_capacity_percent = models.PositiveIntegerField(
        default=85,
        help_text="Slots at this utilization % or higher require approval",
    )
    approval_windows = models.JSONField(
        default=list,
        blank=True,
        help_text="Time windows that always require approval (e.g., holidays)",
    )

    # Token settings
    token_expiry_days = models.PositiveIntegerField(
        default=30,
        help_text="Days after reservation start that manage token expires",
    )

    class Meta:
        verbose_name = "Reservation Settings"
        verbose_name_plural = "Reservation Settings"

    def __str__(self):
        return "Reservation Settings"

    def save(self, *args, **kwargs):
        # Enforce singleton pattern - always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        """Get the singleton instance, creating with defaults if needed."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Reservation(BaseModel):
    """
    A guest reservation.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    party_size = models.PositiveIntegerField()
    starts_at = models.DateTimeField(db_index=True)

    # Guest information
    guest_name = models.CharField(max_length=200)
    guest_email = models.EmailField()
    guest_phone = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["status", "starts_at"]),
        ]

    def __str__(self):
        return f"{self.guest_name} - {self.party_size} guests on {self.starts_at}"

    @property
    def is_pending(self):
        return self.status == self.Status.PENDING

    @property
    def is_confirmed(self):
        return self.status == self.Status.CONFIRMED

    @property
    def is_cancelled(self):
        return self.status == self.Status.CANCELLED

    @property
    def ends_at(self):
        """Calculate end time based on turn time from settings."""
        settings = ReservationSettings.get_instance()
        return self.starts_at + timedelta(minutes=settings.turn_time_minutes)


class ReservationToken(BaseModel):
    """
    Secure token for guest reservation management (view/modify/cancel).
    """

    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name="token",
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
    )
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Token for {self.reservation}"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            settings = ReservationSettings.get_instance()
            self.expires_at = self.reservation.starts_at + timedelta(
                days=settings.token_expiry_days
            )
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        """Check if token is still valid (not expired and reservation not cancelled)."""
        return (
            timezone.now() < self.expires_at
            and not self.reservation.is_cancelled
        )

    @classmethod
    def get_by_token(cls, token_string):
        """Get a valid token by its string value, or None if invalid/expired."""
        try:
            token = cls.objects.select_related("reservation").get(token=token_string)
            return token if token.is_valid else None
        except cls.DoesNotExist:
            return None
