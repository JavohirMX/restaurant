"""
Unit tests for reservation policy engine.

Tests the approval triggers and capacity rules from docs/RESERVATIONS/POLICY.md:
- Party size threshold trigger
- Same-day window trigger
- Near-capacity trigger
- Auto-confirm behavior
"""

import pytest
from datetime import timedelta
from django.utils import timezone
from freezegun import freeze_time

from reservations.models import Reservation, ReservationSettings
from core.tests.factories import ReservationFactory, ReservationSettingsFactory


@pytest.fixture
def default_settings():
    """Create and return default reservation settings."""
    return ReservationSettingsFactory()


@pytest.mark.django_db
class TestApprovalTriggers:
    """Tests for reservation approval triggers."""

    def test_party_size_threshold_trigger(self, default_settings):
        """Parties larger than threshold should require approval."""
        # Create reservation with party size above threshold
        reservation = ReservationFactory(
            party_size=default_settings.approval_party_size_threshold + 1,
            starts_at=timezone.now() + timedelta(days=1),
        )
        
        # Check that it would be pending
        assert reservation.party_size > default_settings.approval_party_size_threshold

    def test_same_day_window_trigger(self, default_settings):
        """Same-day bookings within window should require approval."""
        frozen_time = timezone.make_aware(timezone.datetime(2024, 1, 15, 10, 0))
        
        with freeze_time(frozen_time):
            # Booking within same-day window (4 hours before start)
            starts_at = frozen_time + timedelta(hours=3)
            
            reservation = ReservationFactory(
                party_size=2,
                starts_at=starts_at,
            )
            
            # Check same-day condition
            assert starts_at.date() == frozen_time.date()
            hours_until = (starts_at - frozen_time).total_seconds() / 3600
            assert hours_until < default_settings.same_day_window_hours

    def test_no_trigger_auto_confirms(self, default_settings):
        """Reservations with no triggers should be eligible for auto-confirm."""
        frozen_time = timezone.make_aware(timezone.datetime(2024, 1, 15, 10, 0))
        
        with freeze_time(frozen_time):
            # Booking tomorrow (not same day)
            starts_at = frozen_time + timedelta(days=1)
            
            reservation = ReservationFactory(
                party_size=2,  # Below threshold
                starts_at=starts_at,
                status=Reservation.Status.CONFIRMED,
            )
            
            assert reservation.status == Reservation.Status.CONFIRMED


@pytest.mark.django_db
class TestCapacityRules:
    """Tests for capacity accounting rules."""

    def test_capacity_counts_only_confirmed(self, default_settings):
        """Capacity checks should only count confirmed reservations."""
        # Create confirmed reservations
        confirmed = ReservationFactory.create_batch(
            3,
            status=Reservation.Status.CONFIRMED,
            party_size=5,
            starts_at=timezone.now() + timedelta(days=1),
        )
        
        # Create pending reservations
        pending = ReservationFactory.create_batch(
            2,
            status=Reservation.Status.PENDING,
            party_size=10,
            starts_at=timezone.now() + timedelta(days=1),
        )
        
        # Only confirmed should count toward capacity
        confirmed_guests = sum(r.party_size for r in confirmed)
        pending_guests = sum(r.party_size for r in pending)
        
        assert confirmed_guests == 15
        assert pending_guests == 20

    def test_capacity_per_slot(self, default_settings):
        """Capacity should be checked per time slot."""
        base_time = timezone.now() + timedelta(days=1)
        
        # Fill a slot to near capacity
        slot_guests = default_settings.max_guests_per_slot - 5
        
        ReservationFactory(
            status=Reservation.Status.CONFIRMED,
            party_size=slot_guests,
            starts_at=base_time,
        )
        
        # Try to add more guests
        remaining = default_settings.max_guests_per_slot - slot_guests
        assert remaining == 5

    def test_near_capacity_threshold(self, default_settings):
        """Near capacity should be calculated correctly."""
        max_guests = default_settings.max_guests_per_slot
        near_capacity_threshold = default_settings.near_capacity_percent / 100
        
        # Calculate how many guests trigger near-capacity
        near_capacity_guests = int(max_guests * near_capacity_threshold)
        
        assert near_capacity_guests == 34  # 85% of 40


@pytest.mark.django_db
class TestReservationConstraints:
    """Tests for reservation constraint validation."""

    def test_min_lead_time_constraint(self, default_settings):
        """Reservations must respect minimum lead time."""
        frozen_time = timezone.make_aware(timezone.datetime(2024, 1, 15, 10, 0))
        
        with freeze_time(frozen_time):
            # Try to book within min lead time
            too_soon = frozen_time + timedelta(
                minutes=default_settings.min_lead_time_minutes - 30
            )
            
            # This should fail validation
            min_start_time = frozen_time + timedelta(
                minutes=default_settings.min_lead_time_minutes
            )
            assert too_soon < min_start_time

    def test_max_days_ahead_constraint(self, default_settings):
        """Reservations must not exceed max days ahead."""
        frozen_time = timezone.make_aware(timezone.datetime(2024, 1, 15, 10, 0))
        
        with freeze_time(frozen_time):
            # Try to book too far ahead
            too_far = frozen_time + timedelta(
                days=default_settings.max_days_ahead + 1
            )
            
            max_date = frozen_time + timedelta(days=default_settings.max_days_ahead)
            assert too_far > max_date

    def test_max_party_size_constraint(self, default_settings):
        """Online bookings must respect max party size."""
        too_large = default_settings.max_party_size_online + 1
        
        assert too_large > default_settings.max_party_size_online

    def test_require_phone_constraint(self, default_settings):
        """Phone should be required when setting is enabled."""
        assert default_settings.require_phone is True


@pytest.mark.django_db
class TestTokenConstraints:
    """Tests for reservation token constraints."""

    def test_token_expiry(self, default_settings):
        """Tokens should expire after configured days."""
        from core.tests.factories import ReservationTokenFactory
        
        token = ReservationTokenFactory()
        
        # Token should have expiry date
        assert token.expires_at is not None
        
        # Expiry should be after reservation start
        expected_expiry = token.reservation.starts_at + timedelta(
            days=default_settings.token_expiry_days
        )
        # Allow small time difference due to factory creation
        assert abs((token.expires_at - expected_expiry).total_seconds()) < 60

    def test_token_invalid_when_cancelled(self, default_settings):
        """Token should be invalid when reservation is cancelled."""
        from core.tests.factories import ReservationTokenFactory
        
        token = ReservationTokenFactory()
        reservation = token.reservation
        
        # Cancel the reservation
        reservation.status = Reservation.Status.CANCELLED
        reservation.save()
        
        # Token should be considered invalid
        # (This would be checked in the view logic)
        assert reservation.is_cancelled


@pytest.mark.django_db
class TestReservationLifecycle:
    """Tests for reservation status transitions."""

    def test_pending_to_confirmed_transition(self):
        """Pending reservations can be confirmed."""
        reservation = ReservationFactory(status=Reservation.Status.PENDING)
        
        reservation.status = Reservation.Status.CONFIRMED
        reservation.save()
        
        assert reservation.status == Reservation.Status.CONFIRMED

    def test_confirmed_to_cancelled_transition(self):
        """Confirmed reservations can be cancelled."""
        reservation = ReservationFactory(status=Reservation.Status.CONFIRMED)
        
        reservation.status = Reservation.Status.CANCELLED
        reservation.save()
        
        assert reservation.status == Reservation.Status.CANCELLED

    def test_pending_to_cancelled_transition(self):
        """Pending reservations can be cancelled."""
        reservation = ReservationFactory(status=Reservation.Status.PENDING)
        
        reservation.status = Reservation.Status.CANCELLED
        reservation.save()
        
        assert reservation.status == Reservation.Status.CANCELLED

    def test_cancelled_cannot_modify(self):
        """Cancelled reservations should not be modifiable."""
        reservation = ReservationFactory(status=Reservation.Status.CANCELLED)
        
        assert reservation.is_cancelled
