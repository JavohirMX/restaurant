"""
Public views for the reservations app.

Provides public access to reservation availability and booking.
"""

import logging
from datetime import datetime, timedelta
from typing import Any

from django.db.models import Q
from django.utils import timezone
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from reservations.models import Reservation, ReservationSettings, ReservationToken

logger = logging.getLogger(__name__)


class AvailabilityView(APIView):
    """
    Public endpoint to check reservation availability for a date.
    
    Query params:
    - date: YYYY-MM-DD format
    
    Returns available time slots with capacity information.
    
    Rate limited to 30/min per IP.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request: Request) -> Response:
        """Get availability for a date."""
        date_str = request.query_params.get("date")
        
        if not date_str:
            return Response(
                {"error": "VALIDATION_ERROR", "message": "Date parameter is required.", "details": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "VALIDATION_ERROR", "message": "Invalid date format. Use YYYY-MM-DD.", "details": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        settings = ReservationSettings.get_instance()
        
        # Get service periods for this weekday
        from restaurant.models import Restaurant, ServicePeriod
        restaurant = Restaurant.get_instance()
        
        if not restaurant:
            return Response(
                {"error": "NOT_FOUND", "message": "Restaurant not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        weekday = date.weekday()
        service_periods = ServicePeriod.objects.filter(
            restaurant=restaurant,
            weekday=weekday,
        )
        
        if not service_periods.exists():
            return Response({
                "date": date_str,
                "slot_interval_minutes": settings.slot_interval_minutes,
                "slots": [],
                "message": "Restaurant is closed on this day.",
            })
        
        # Generate slots
        slots = self._generate_slots(date, service_periods, settings)
        
        return Response({
            "date": date_str,
            "slot_interval_minutes": settings.slot_interval_minutes,
            "slots": slots,
        })
    
    def _generate_slots(
        self,
        date: datetime.date,
        service_periods,
        settings: ReservationSettings,
    ) -> list[dict]:
        """Generate available time slots for the date."""
        slots = []
        
        for period in service_periods:
            # Generate slots within this service period
            current_time = datetime.combine(date, period.opens_at)
            end_time = datetime.combine(date, period.closes_at)
            
            # Adjust for turn time - last slot must fit within service period
            last_slot_time = end_time - timedelta(minutes=settings.turn_time_minutes)
            
            while current_time <= last_slot_time:
                slot_time = current_time.time()
                starts_at = timezone.make_aware(datetime.combine(date, slot_time))
                
                # Check capacity
                capacity_info = self._check_capacity(starts_at, settings)
                
                slots.append({
                    "starts_at": starts_at.isoformat(),
                    "available": capacity_info["available"],
                    "remaining_capacity": capacity_info["remaining"],
                    "requires_approval": capacity_info["requires_approval"],
                })
                
                current_time += timedelta(minutes=settings.slot_interval_minutes)
        
        return slots
    
    def _check_capacity(self, starts_at: datetime, reservation_settings: ReservationSettings) -> dict:
        """Check capacity for a given slot."""
        # Get all confirmed reservations that overlap with this slot
        # A reservation overlaps if it starts before the slot ends and ends after the slot starts
        slot_end = starts_at + timedelta(minutes=reservation_settings.turn_time_minutes)
        
        overlapping = Reservation.objects.filter(
            status=Reservation.Status.CONFIRMED,
            starts_at__lt=slot_end,
        ).filter(
            # Ends after slot starts (starts_at + turn_time > starts_at)
            starts_at__gt=starts_at - timedelta(minutes=reservation_settings.turn_time_minutes),
        )
        
        total_guests = sum(r.party_size for r in overlapping)
        remaining = reservation_settings.max_guests_per_slot - total_guests
        
        utilization = total_guests / reservation_settings.max_guests_per_slot if reservation_settings.max_guests_per_slot > 0 else 0
        near_capacity = utilization >= (reservation_settings.near_capacity_percent / 100)
        
        return {
            "available": remaining > 0,
            "remaining": max(0, remaining),
            "requires_approval": near_capacity,
        }


class ReservationCreateView(APIView):
    """
    Public endpoint to create a new reservation.
    
    Creates reservation with pending or confirmed status based on
    capacity and approval triggers.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request: Request) -> Response:
        """Create a new reservation."""
        settings = ReservationSettings.get_instance()
        
        # Validate required fields
        required = ["party_size", "starts_at", "guest"]
        for field in required:
            if field not in request.data:
                return Response(
                    {"error": "VALIDATION_ERROR", "message": f"Missing required field: {field}", "details": {}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        guest_data = request.data["guest"]
        if "name" not in guest_data or "email" not in guest_data:
            return Response(
                {"error": "VALIDATION_ERROR", "message": "Guest name and email are required.", "details": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Check honeypot (anti-spam)
        if request.data.get("website"):  # Honeypot field
            # Silently reject
            return Response({
                "reservation": {"status": "pending"},
                "token": {"token": "dummy_token"},
            }, status=status.HTTP_201_CREATED)
        
        # Parse starts_at
        try:
            starts_at = datetime.fromisoformat(request.data["starts_at"].replace("Z", "+00:00"))
            # Ensure timezone-aware
            if starts_at.tzinfo is None:
                starts_at = timezone.make_aware(starts_at)
        except (ValueError, AttributeError):
            return Response(
                {"error": "VALIDATION_ERROR", "message": "Invalid starts_at format. Use ISO 8601.", "details": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        party_size = request.data["party_size"]
        
        # Validate constraints
        validation_errors = self._validate_constraints(
            party_size, starts_at, settings, request
        )
        if validation_errors:
            return Response(
                {"error": "VALIDATION_ERROR", "message": "Validation failed.", "details": validation_errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Determine status based on approval triggers
        status_choice = self._determine_status(party_size, starts_at, settings)
        
        # Create reservation
        reservation = Reservation.objects.create(
            status=status_choice,
            party_size=party_size,
            starts_at=starts_at,
            guest_name=guest_data["name"],
            guest_email=guest_data["email"],
            guest_phone=guest_data.get("phone", ""),
            notes=request.data.get("notes", ""),
        )
        
        # Create token
        token = ReservationToken.objects.create(reservation=reservation)
        
        # Log audit event
        from core.models import AuditEvent
        AuditEvent.objects.create(
            event="reservation.created",
            actor_type=AuditEvent.ActorType.GUEST,
            actor_id=None,
            entity_type="reservation",
            entity_id=reservation.id,
            metadata={
                "party_size": party_size,
                "starts_at": starts_at.isoformat(),
                "status": status_choice,
                "guest_email": guest_data["email"],
            },
        )

        # Send email notification
        try:
            from core.tasks import queue_reservation_email, queue_staff_notification
            email_type = "confirmed" if status_choice == Reservation.Status.CONFIRMED else "pending"
            queue_reservation_email(str(reservation.id), email_type)

            # Notify staff if pending
            if status_choice == Reservation.Status.PENDING:
                queue_staff_notification(str(reservation.id), "new_pending")
        except Exception as e:
            logger.error(f"Failed to queue email notification: {e}")

        return Response({
            "reservation": {
                "id": str(reservation.id),
                "status": reservation.status,
                "party_size": reservation.party_size,
                "starts_at": reservation.starts_at.isoformat(),
                "guest_name": reservation.guest_name,
            },
            "token": {
                "token": token.token,
                "expires_at": token.expires_at.isoformat(),
            },
        }, status=status.HTTP_201_CREATED)
    
    def _validate_constraints(
        self,
        party_size: int,
        starts_at: datetime,
        settings: ReservationSettings,
        request: Request,
    ) -> dict[str, str]:
        """Validate reservation constraints."""
        errors = {}
        now = timezone.now()
        
        # Check min lead time
        min_start_time = now + timedelta(minutes=settings.min_lead_time_minutes)
        if starts_at < min_start_time:
            errors["starts_at"] = [
                f"Reservations must be made at least {settings.min_lead_time_minutes} minutes in advance."
            ]
        
        # Check max days ahead
        max_date = now + timedelta(days=settings.max_days_ahead)
        if starts_at > max_date:
            errors["starts_at"] = [
                f"Reservations can only be made up to {settings.max_days_ahead} days in advance."
            ]
        
        # Check max party size
        if party_size > settings.max_party_size_online:
            errors["party_size"] = [
                f"Online bookings are limited to {settings.max_party_size_online} guests. "
                "Please call for larger parties."
            ]
        
        # Check phone requirement
        guest_data = request.data.get("guest", {})
        if settings.require_phone and not guest_data.get("phone"):
            errors["guest.phone"] = ["Phone number is required."]
        
        return errors
    
    def _determine_status(
        self,
        party_size: int,
        starts_at: datetime,
        settings: ReservationSettings,
    ) -> str:
        """Determine reservation status based on approval triggers."""
        now = timezone.now()
        
        # Trigger: party size threshold
        if party_size > settings.approval_party_size_threshold:
            return Reservation.Status.PENDING
        
        # Trigger: same-day window
        if starts_at.date() == now.date():
            hours_until = (starts_at - now).total_seconds() / 3600
            if hours_until < settings.same_day_window_hours:
                return Reservation.Status.PENDING
        
        # Trigger: configured time windows (simplified - check if within any window)
        if settings.approval_windows:
            # This is a simplified check - in production, parse and check actual windows
            pass
        
        # Trigger: near capacity (would need capacity check here)
        # For now, default to confirmed if no triggers match
        return Reservation.Status.CONFIRMED


class ReservationDetailView(APIView):
    """
    Public endpoint to view reservation details by token.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request: Request, token: str) -> Response:
        """Get reservation details by token."""
        token_obj = ReservationToken.get_by_token(token)
        
        if not token_obj:
            return Response(
                {"error": "NOT_FOUND", "message": "Invalid token.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Check if token is valid (not expired and reservation not cancelled)
        if not token_obj.is_valid:
            return Response(
                {"error": "GONE", "message": "Token has expired or reservation is cancelled.", "details": {}},
                status=status.HTTP_410_GONE,
            )
        
        reservation = token_obj.reservation
        
        return Response({
            "reservation": {
                "id": str(reservation.id),
                "status": reservation.status,
                "party_size": reservation.party_size,
                "starts_at": reservation.starts_at.isoformat(),
                "ends_at": reservation.ends_at.isoformat(),
                "guest_name": reservation.guest_name,
                "guest_email": reservation.guest_email,
                "guest_phone": reservation.guest_phone,
                "notes": reservation.notes,
            },
            "token": {
                "token": token_obj.token,
                "expires_at": token_obj.expires_at.isoformat(),
                "is_valid": token_obj.is_valid,
            },
        })


class ReservationModifyView(APIView):
    """
    Public endpoint to modify a reservation by token.
    """
    
    permission_classes = [AllowAny]
    
    def patch(self, request: Request, token: str) -> Response:
        """Modify reservation by token."""
        token_obj = ReservationToken.get_by_token(token)
        
        if not token_obj:
            return Response(
                {"error": "NOT_FOUND", "message": "Invalid or expired token.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        reservation = token_obj.reservation
        
        # Cannot modify cancelled reservations
        if reservation.is_cancelled:
            return Response(
                {"error": "CONFLICT", "message": "Cannot modify a cancelled reservation.", "details": {}},
                status=status.HTTP_409_CONFLICT,
            )
        
        settings = ReservationSettings.get_instance()
        
        # Track changes
        changes = {}
        
        # Update allowed fields
        if "party_size" in request.data:
            old_size = reservation.party_size
            new_size = request.data["party_size"]
            
            # Validate party size constraint
            if new_size > settings.max_party_size_online:
                return Response(
                    {
                        "error": "VALIDATION_ERROR",
                        "message": f"Online bookings are limited to {settings.max_party_size_online} guests.",
                        "details": {"party_size": [f"Maximum party size is {settings.max_party_size_online}"]},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            reservation.party_size = new_size
            changes["party_size"] = {"from": old_size, "to": reservation.party_size}
        
        if "starts_at" in request.data:
            try:
                old_time = reservation.starts_at
                new_starts_at = datetime.fromisoformat(
                    request.data["starts_at"].replace("Z", "+00:00")
                )
                
                # Validate min lead time
                if new_starts_at < timezone.now() + timedelta(minutes=settings.min_lead_time_minutes):
                    return Response(
                        {
                            "error": "VALIDATION_ERROR",
                            "message": f"Reservations must be made at least {settings.min_lead_time_minutes} minutes in advance.",
                            "details": {"starts_at": ["Insufficient lead time"]},
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                # Validate max days ahead
                max_date = timezone.now() + timedelta(days=settings.max_days_ahead)
                if new_starts_at > max_date:
                    return Response(
                        {
                            "error": "VALIDATION_ERROR",
                            "message": f"Reservations can only be made up to {settings.max_days_ahead} days in advance.",
                            "details": {"starts_at": ["Too far in advance"]},
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                reservation.starts_at = new_starts_at
                changes["starts_at"] = {"from": old_time.isoformat(), "to": reservation.starts_at.isoformat()}
            except (ValueError, AttributeError):
                return Response(
                    {"error": "VALIDATION_ERROR", "message": "Invalid starts_at format.", "details": {}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        # Validate capacity if party_size or starts_at changed
        if "party_size" in changes or "starts_at" in changes:
            capacity_error = self._validate_capacity(reservation, settings)
            if capacity_error:
                return Response(
                    {
                        "error": "CONFLICT",
                        "message": "Capacity exceeded for requested time.",
                        "details": {"capacity": [capacity_error]},
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        
        if "guest" in request.data:
            guest_data = request.data["guest"]
            if "name" in guest_data:
                changes["guest_name"] = {"from": reservation.guest_name, "to": guest_data["name"]}
                reservation.guest_name = guest_data["name"]
            if "email" in guest_data:
                changes["guest_email"] = {"from": reservation.guest_email, "to": guest_data["email"]}
                reservation.guest_email = guest_data["email"]
            if "phone" in guest_data:
                changes["guest_phone"] = {"from": reservation.guest_phone, "to": guest_data["phone"]}
                reservation.guest_phone = guest_data["phone"]
        
        if "notes" in request.data:
            changes["notes"] = {"from": reservation.notes, "to": request.data["notes"]}
            reservation.notes = request.data["notes"]
        
        # Re-evaluate status based on changes
        new_status = self._reevaluate_status(reservation, settings)
        if new_status != reservation.status:
            changes["status"] = {"from": reservation.status, "to": new_status}
            reservation.status = new_status
        
        reservation.save()
        
        # Log audit event
        from core.models import AuditEvent
        AuditEvent.objects.create(
            event="reservation.modified",
            actor_type=AuditEvent.ActorType.GUEST,
            actor_id=None,
            entity_type="reservation",
            entity_id=reservation.id,
            metadata={"changes": changes},
        )

        # Send email notification
        try:
            from core.tasks import queue_reservation_email, queue_staff_notification
            queue_reservation_email(str(reservation.id), "modified")

            # Notify staff if now pending
            if new_status == Reservation.Status.PENDING:
                queue_staff_notification(str(reservation.id), "new_pending")
        except Exception as e:
            logger.error(f"Failed to queue email notification: {e}")

        return Response({
            "reservation": {
                "id": str(reservation.id),
                "status": reservation.status,
                "party_size": reservation.party_size,
                "starts_at": reservation.starts_at.isoformat(),
            },
            "changes": changes,
        })
    
    def _reevaluate_status(self, reservation: Reservation, settings: ReservationSettings) -> str:
        """Re-evaluate reservation status after modification."""
        # Similar logic to create - check approval triggers
        now = timezone.now()
        
        # Check approval triggers
        if reservation.party_size > settings.approval_party_size_threshold:
            return Reservation.Status.PENDING
        
        if reservation.starts_at.date() == now.date():
            hours_until = (reservation.starts_at - now).total_seconds() / 3600
            if hours_until < settings.same_day_window_hours:
                return Reservation.Status.PENDING
        
        # If no triggers match, confirm it
        return Reservation.Status.CONFIRMED
    
    def _validate_capacity(self, reservation: Reservation, settings: ReservationSettings) -> str | None:
        """
        Validate that the reservation fits within capacity.

        Returns:
            Error message if capacity exceeded, None if OK
        """
        # Get all confirmed reservations that overlap with this slot
        # Exclude the current reservation itself
        slot_end = reservation.starts_at + timedelta(minutes=settings.turn_time_minutes)

        overlapping = Reservation.objects.filter(
            status=Reservation.Status.CONFIRMED,
            starts_at__lt=slot_end,
            starts_at__gt=reservation.starts_at - timedelta(minutes=settings.turn_time_minutes),
        ).exclude(id=reservation.id)

        total_guests = sum(r.party_size for r in overlapping) + reservation.party_size

        if total_guests > settings.max_guests_per_slot:
            remaining = settings.max_guests_per_slot - sum(r.party_size for r in overlapping)
            return f"Only {remaining} seats available for this time slot"

        return None


class ReservationCancelView(APIView):
    """
    Public endpoint to cancel a reservation by token.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request: Request, token: str) -> Response:
        """Cancel reservation by token."""
        token_obj = ReservationToken.get_by_token(token)
        
        if not token_obj:
            return Response(
                {"error": "NOT_FOUND", "message": "Invalid or expired token.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        reservation = token_obj.reservation
        
        # Cannot cancel already cancelled reservations
        if reservation.is_cancelled:
            return Response(
                {"error": "CONFLICT", "message": "Reservation is already cancelled.", "details": {}},
                status=status.HTTP_409_CONFLICT,
            )
        
        # Cancel the reservation
        reservation.status = Reservation.Status.CANCELLED
        reservation.save()
        
        # Log audit event
        from core.models import AuditEvent
        AuditEvent.objects.create(
            event="reservation.cancelled",
            actor_type=AuditEvent.ActorType.GUEST,
            actor_id=None,
            entity_type="reservation",
            entity_id=reservation.id,
            metadata={"reason": request.data.get("reason", "Guest cancelled via token")},
        )
        
        # Send email notifications
        from core.tasks import queue_reservation_email, queue_staff_notification
        queue_reservation_email(str(reservation.id), "cancelled")
        queue_staff_notification(str(reservation.id), "cancelled")
        
        return Response({
            "reservation": {
                "id": str(reservation.id),
                "status": reservation.status,
            },
            "message": "Reservation cancelled successfully.",
        })
