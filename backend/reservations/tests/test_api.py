"""
Integration tests for reservation API endpoints.

Tests the public and admin reservation endpoints.
"""

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from core.tests.factories import (
    ReservationFactory,
    ReservationSettingsFactory,
    RestaurantFactory,
    ServicePeriodFactory,
    UserFactory,
)
from reservations.models import Reservation


@pytest.fixture
def api_client():
    """Return APIClient instance."""
    return APIClient()


@pytest.fixture
def restaurant():
    """Create and return a restaurant with settings."""
    return RestaurantFactory()


@pytest.fixture
def service_period(restaurant):
    """Create and return a service period for the restaurant."""
    return ServicePeriodFactory(
        restaurant=restaurant,
        weekday=0,  # Monday
        opens_at="11:00:00",
        closes_at="22:00:00",
    )


@pytest.fixture
def reservation_settings():
    """Create default reservation settings."""
    return ReservationSettingsFactory()


@pytest.mark.django_db
class TestAvailabilityEndpoint:
    """Tests for the availability endpoint."""

    def test_availability_returns_slots(
        self, api_client, restaurant, service_period, reservation_settings
    ):
        """Availability endpoint should return time slots."""
        # Get next Monday
        today = timezone.now().date()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)

        url = reverse("reservations_public:availability")
        response = api_client.get(url, {"date": next_monday.isoformat()})

        assert response.status_code == status.HTTP_200_OK
        assert "slots" in response.data
        assert "date" in response.data
        assert response.data["date"] == next_monday.isoformat()

    def test_availability_closed_day(
        self, api_client, restaurant, reservation_settings
    ):
        """Availability should return empty slots for closed days."""
        # Get next Tuesday (assuming no service period for Tuesday)
        today = timezone.now().date()
        days_until_tuesday = (1 - today.weekday()) % 7
        if days_until_tuesday == 0:
            days_until_tuesday = 7
        next_tuesday = today + timedelta(days=days_until_tuesday)

        url = reverse("reservations_public:availability")
        response = api_client.get(url, {"date": next_tuesday.isoformat()})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["slots"] == []

    def test_availability_missing_date(self, api_client):
        """Availability without date should return 400."""
        url = reverse("reservations_public:availability")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_availability_invalid_date_format(self, api_client):
        """Availability with invalid date format should return 400."""
        url = reverse("reservations_public:availability")
        response = api_client.get(url, {"date": "invalid-date"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestReservationCreateEndpoint:
    """Tests for the reservation create endpoint."""

    def test_create_reservation_success(
        self, api_client, restaurant, service_period, reservation_settings
    ):
        """Should create a reservation successfully."""
        # Get next Monday
        today = timezone.now().date()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)

        url = reverse("reservations_public:reservation-create")
        data = {
            "party_size": 4,
            "starts_at": f"{next_monday.isoformat()}T12:00:00",
            "guest": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
            },
            "notes": "Special occasion",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "reservation" in response.data
        assert "token" in response.data
        assert response.data["reservation"]["party_size"] == 4

    def test_create_reservation_honeypot(
        self, api_client, restaurant, service_period, reservation_settings
    ):
        """Should silently reject honeypot submissions."""
        today = timezone.now().date()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)

        url = reverse("reservations_public:reservation-create")
        data = {
            "party_size": 4,
            "starts_at": f"{next_monday.isoformat()}T12:00:00",
            "guest": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
            },
            "website": "spam-bot",  # Honeypot field
        }

        response = api_client.post(url, data, format="json")

        # Should return 201 but not create actual reservation
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_reservation_missing_required_fields(self, api_client):
        """Should return 400 for missing required fields."""
        url = reverse("reservations_public:reservation-create")
        data = {
            "party_size": 4,
            # Missing starts_at and guest
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_reservation_missing_guest_info(
        self, api_client, restaurant, service_period, reservation_settings
    ):
        """Should return 400 for missing guest info."""
        today = timezone.now().date()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)

        url = reverse("reservations_public:reservation-create")
        data = {
            "party_size": 4,
            "starts_at": f"{next_monday.isoformat()}T12:00:00",
            "guest": {
                # Missing name and email
                "phone": "+1234567890",
            },
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestReservationDetailEndpoint:
    """Tests for the reservation detail endpoint."""

    def test_get_reservation_by_token(self, api_client):
        """Should return reservation details by token."""
        from core.tests.factories import ReservationTokenFactory

        token = ReservationTokenFactory()
        reservation = token.reservation

        url = reverse(
            "reservations_public:reservation-detail", kwargs={"token": token.token}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["reservation"]["id"] == str(reservation.id)

    def test_get_reservation_invalid_token(self, api_client):
        """Should return 404 for invalid token."""
        url = reverse(
            "reservations_public:reservation-detail", kwargs={"token": "invalid-token"}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestReservationModifyEndpoint:
    """Tests for the reservation modify endpoint."""

    def test_modify_party_size(self, api_client):
        """Should modify party size successfully."""
        from core.tests.factories import ReservationTokenFactory

        token = ReservationTokenFactory()
        old_size = token.reservation.party_size

        url = reverse(
            "reservations_public:reservation-modify", kwargs={"token": token.token}
        )
        data = {"party_size": old_size + 2}

        response = api_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["changes"]["party_size"]["to"] == old_size + 2

    def test_modify_cancelled_reservation_fails(self, api_client):
        """Should not allow modifying cancelled reservations."""
        from core.tests.factories import ReservationTokenFactory

        token = ReservationTokenFactory()
        token.reservation.status = Reservation.Status.CANCELLED
        token.reservation.save()

        url = reverse(
            "reservations_public:reservation-modify", kwargs={"token": token.token}
        )
        data = {"party_size": 6}

        response = api_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_409_CONFLICT

    def test_modify_invalid_token(self, api_client):
        """Should return 404 for invalid token."""
        url = reverse(
            "reservations_public:reservation-modify", kwargs={"token": "invalid-token"}
        )
        data = {"party_size": 6}

        response = api_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestReservationCancelEndpoint:
    """Tests for the reservation cancel endpoint."""

    def test_cancel_reservation(self, api_client):
        """Should cancel reservation successfully."""
        from core.tests.factories import ReservationTokenFactory

        token = ReservationTokenFactory()

        url = reverse(
            "reservations_public:reservation-cancel", kwargs={"token": token.token}
        )
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        token.reservation.refresh_from_db()
        assert token.reservation.status == Reservation.Status.CANCELLED

    def test_cancel_already_cancelled_fails(self, api_client):
        """Should not allow cancelling already cancelled reservations."""
        from core.tests.factories import ReservationTokenFactory

        token = ReservationTokenFactory()
        token.reservation.status = Reservation.Status.CANCELLED
        token.reservation.save()

        url = reverse(
            "reservations_public:reservation-cancel", kwargs={"token": token.token}
        )
        response = api_client.post(url)

        assert response.status_code == status.HTTP_409_CONFLICT

    def test_cancel_invalid_token(self, api_client):
        """Should return 404 for invalid token."""
        url = reverse(
            "reservations_public:reservation-cancel", kwargs={"token": "invalid-token"}
        )
        response = api_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAdminReservationEndpoints:
    """Tests for admin reservation endpoints."""

    @pytest.fixture
    def admin_client(self, api_client):
        """Create and return authenticated admin client."""
        user = UserFactory(role=User.Role.ADMIN, password="adminpass123")

        # Login
        login_url = reverse("accounts_admin:login")
        login_data = {
            "email": user.email,
            "password": "adminpass123",
        }
        response = api_client.post(login_url, login_data, format="json")
        access_token = response.data["access_token"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        return api_client

    def test_list_reservations(self, admin_client):
        """Should list all reservations."""
        # Create some reservations
        ReservationFactory.create_batch(3)

        url = reverse("reservations_admin:reservation-list")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_list_reservations_filter_by_status(self, admin_client):
        """Should filter reservations by status."""
        ReservationFactory(status=Reservation.Status.CONFIRMED)
        ReservationFactory(status=Reservation.Status.PENDING)
        ReservationFactory(status=Reservation.Status.CANCELLED)

        url = reverse("reservations_admin:reservation-list")
        response = admin_client.get(url, {"status": "confirmed"})

        assert response.status_code == status.HTTP_200_OK

    def test_approve_reservation(self, admin_client):
        """Should approve pending reservation."""
        reservation = ReservationFactory(status=Reservation.Status.PENDING)

        url = reverse(
            "reservations_admin:reservation-approve", kwargs={"pk": reservation.id}
        )
        response = admin_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        reservation.refresh_from_db()
        assert reservation.status == Reservation.Status.CONFIRMED

    def test_cancel_reservation(self, admin_client):
        """Should cancel reservation."""
        reservation = ReservationFactory(status=Reservation.Status.CONFIRMED)

        url = reverse(
            "reservations_admin:reservation-cancel", kwargs={"pk": reservation.id}
        )
        response = admin_client.post(url, {"reason": "Guest request"})

        assert response.status_code == status.HTTP_200_OK

        reservation.refresh_from_db()
        assert reservation.status == Reservation.Status.CANCELLED
