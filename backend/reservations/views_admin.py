"""
Admin views for the reservations app.

Provides CRUD operations for reservation management.
"""

import logging
from datetime import datetime
from typing import Any

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import CursorPagination
from core.permissions import CanManageRestaurant, IsHost, IsManager
from reservations.models import Reservation, ReservationSettings, ReservationToken

logger = logging.getLogger(__name__)


class ReservationSettingsView(APIView):
    """
    Admin endpoint to manage reservation settings.
    """
    
    permission_classes = [IsAuthenticated, CanManageRestaurant]
    
    def get(self, request: Request) -> Response:
        """Get reservation settings."""
        settings = ReservationSettings.get_instance()
        
        data = {
            "slot_interval_minutes": settings.slot_interval_minutes,
            "turn_time_minutes": settings.turn_time_minutes,
            "max_guests_per_slot": settings.max_guests_per_slot,
            "max_party_size_online": settings.max_party_size_online,
            "min_lead_time_minutes": settings.min_lead_time_minutes,
            "max_days_ahead": settings.max_days_ahead,
            "require_phone": settings.require_phone,
            "approval_party_size_threshold": settings.approval_party_size_threshold,
            "same_day_window_hours": settings.same_day_window_hours,
            "near_capacity_percent": settings.near_capacity_percent,
            "approval_windows": settings.approval_windows,
            "token_expiry_days": settings.token_expiry_days,
        }
        return Response(data)
    
    def patch(self, request: Request) -> Response:
        """Update reservation settings."""
        settings = ReservationSettings.get_instance()
        
        # Track changes for audit log
        changes = {}
        
        allowed_fields = [
            "slot_interval_minutes",
            "turn_time_minutes",
            "max_guests_per_slot",
            "max_party_size_online",
            "min_lead_time_minutes",
            "max_days_ahead",
            "require_phone",
            "approval_party_size_threshold",
            "same_day_window_hours",
            "near_capacity_percent",
            "approval_windows",
            "token_expiry_days",
        ]
        
        for field in allowed_fields:
            if field in request.data:
                old_value = getattr(settings, field)
                new_value = request.data[field]
                if old_value != new_value:
                    changes[field] = {"from": old_value, "to": new_value}
                    setattr(settings, field, new_value)
        
        settings.save()
        
        # Log audit event if changes were made
        if changes:
            from core.models import AuditEvent
            AuditEvent.objects.create(
                event="reservation.settings_changed",
                actor_type=AuditEvent.ActorType.USER,
                actor_id=request.user.id,
                entity_type="reservation_settings",
                entity_id=settings.id,
                metadata={"changes": changes},
            )
        
        return Response({"message": "Settings updated successfully.", "changes": changes})


class ReservationListView(generics.ListAPIView):
    """
    List all reservations with filtering.
    
    Query params:
    - status: pending, confirmed, cancelled (comma-separated for multiple)
    - from: start date (YYYY-MM-DD)
    - to: end date (YYYY-MM-DD)
    - q: search query (name, email, phone)
    """
    
    permission_classes = [IsAuthenticated, IsHost]
    pagination_class = CursorPagination
    
    def get_queryset(self):
        """Get filtered queryset."""
        queryset = Reservation.objects.all()
        
        # Filter by status
        status_param = self.request.query_params.get("status")
        if status_param:
            statuses = status_param.split(",")
            queryset = queryset.filter(status__in=statuses)
        
        # Filter by date range
        from_date = self.request.query_params.get("from")
        if from_date:
            try:
                from_datetime = datetime.strptime(from_date, "%Y-%m-%d")
                queryset = queryset.filter(starts_at__date__gte=from_datetime)
            except ValueError:
                pass
        
        to_date = self.request.query_params.get("to")
        if to_date:
            try:
                to_datetime = datetime.strptime(to_date, "%Y-%m-%d")
                queryset = queryset.filter(starts_at__date__lte=to_datetime)
            except ValueError:
                pass
        
        # Search by guest info
        q = self.request.query_params.get("q")
        if q:
            queryset = queryset.filter(
                guest_name__icontains=q
            ) | queryset.filter(
                guest_email__icontains=q
            ) | queryset.filter(
                guest_phone__icontains=q
            )
        
        return queryset.order_by("-starts_at")
    
    def list(self, request: Request, *args, **kwargs):
        """List reservations with pagination."""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            data = self._serialize_reservations(page)
            return self.get_paginated_response(data)
        
        data = self._serialize_reservations(queryset)
        return Response({"reservations": data})
    
    def _serialize_reservations(self, reservations):
        """Serialize reservations for list view."""
        result = []
        for r in reservations:
            result.append({
                "id": str(r.id),
                "status": r.status,
                "party_size": r.party_size,
                "starts_at": r.starts_at.isoformat() if r.starts_at else None,
                "guest_name": r.guest_name,
                "guest_email": r.guest_email,
                "guest_phone": r.guest_phone,
                "created_at": r.created_at.isoformat(),
            })
        return result


class ReservationDetailView(APIView):
    """
    Retrieve, update or delete a reservation.
    """
    
    permission_classes = [IsAuthenticated, IsHost]
    
    def get_object(self, pk: str) -> Reservation | None:
        try:
            return Reservation.objects.get(pk=pk)
        except Reservation.DoesNotExist:
            return None
    
    def get(self, request: Request, pk: str) -> Response:
        """Get reservation details."""
        reservation = self.get_object(pk)
        if not reservation:
            return Response(
                {"error": "NOT_FOUND", "message": "Reservation not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Get token info if available
        token_data = {}
        if hasattr(reservation, "token"):
            token = reservation.token
            token_data = {
                "token": token.token,
                "expires_at": token.expires_at.isoformat(),
                "is_valid": token.is_valid,
            }
        
        data = {
            "id": str(reservation.id),
            "status": reservation.status,
            "party_size": reservation.party_size,
            "starts_at": reservation.starts_at.isoformat() if reservation.starts_at else None,
            "ends_at": reservation.ends_at.isoformat() if reservation.starts_at else None,
            "guest_name": reservation.guest_name,
            "guest_email": reservation.guest_email,
            "guest_phone": reservation.guest_phone,
            "notes": reservation.notes,
            "created_at": reservation.created_at.isoformat(),
            "updated_at": reservation.updated_at.isoformat(),
            "token": token_data,
        }
        return Response(data)
    
    def patch(self, request: Request, pk: str) -> Response:
        """Update reservation."""
        reservation = self.get_object(pk)
        if not reservation:
            return Response(
                {"error": "NOT_FOUND", "message": "Reservation not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Track changes for audit log
        changes = {}
        
        allowed_fields = ["party_size", "guest_name", "guest_email", "guest_phone", "notes"]
        for field in allowed_fields:
            if field in request.data:
                old_value = getattr(reservation, field)
                new_value = request.data[field]
                if old_value != new_value:
                    changes[field] = {"from": old_value, "to": new_value}
                    setattr(reservation, field, new_value)
        
        # Handle starts_at separately (datetime parsing)
        if "starts_at" in request.data:
            try:
                old_time = reservation.starts_at
                new_time = datetime.fromisoformat(request.data["starts_at"].replace("Z", "+00:00"))
                
                # Validate timezone-aware
                if new_time.tzinfo is None:
                    return Response(
                        {"error": "VALIDATION_ERROR", "message": "Datetime must include timezone.", "details": {}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                # Validate datetime is in the future
                if new_time < timezone.now():
                    return Response(
                        {"error": "VALIDATION_ERROR", "message": "Reservation time must be in the future.", "details": {}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                if old_time != new_time:
                    changes["starts_at"] = {"from": old_time.isoformat() if old_time else None, "to": new_time.isoformat()}
                    reservation.starts_at = new_time
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid datetime format: {e}")
                return Response(
                    {"error": "VALIDATION_ERROR", "message": "Invalid starts_at format. Use ISO 8601 format.", "details": {}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        reservation.save()
        
        # Log audit event if changes were made
        if changes:
            from core.models import AuditEvent
            AuditEvent.objects.create(
                event="reservation.modified",
                actor_type=AuditEvent.ActorType.USER,
                actor_id=request.user.id,
                entity_type="reservation",
                entity_id=reservation.id,
                metadata={"changes": changes},
            )
        
        return Response({"message": "Reservation updated successfully.", "changes": changes})
    
    def delete(self, request: Request, pk: str) -> Response:
        """Delete reservation (admin only)."""
        # Only admins/managers can delete reservations
        if not request.user.is_manager:
            return Response(
                {"error": "FORBIDDEN", "message": "Only managers can delete reservations.", "details": {}},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        reservation = self.get_object(pk)
        if not reservation:
            return Response(
                {"error": "NOT_FOUND", "message": "Reservation not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        reservation_id = reservation.id
        reservation.delete()
        
        # Log audit event
        from core.models import AuditEvent
        AuditEvent.objects.create(
            event="reservation.deleted",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="reservation",
            entity_id=reservation_id,
            metadata={},
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReservationApproveView(APIView):
    """
    Approve a pending reservation.
    """
    
    permission_classes = [IsAuthenticated, IsHost]
    
    def post(self, request: Request, pk: str) -> Response:
        """Approve a pending reservation."""
        try:
            reservation = Reservation.objects.get(pk=pk)
        except Reservation.DoesNotExist:
            return Response(
                {"error": "NOT_FOUND", "message": "Reservation not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Can only approve pending reservations
        if reservation.status != Reservation.Status.PENDING:
            return Response(
                {"error": "CONFLICT", "message": "Only pending reservations can be approved.", "details": {}},
                status=status.HTTP_409_CONFLICT,
            )
        
        old_status = reservation.status
        reservation.status = Reservation.Status.CONFIRMED
        reservation.save()
        
        # Log audit event
        from core.models import AuditEvent
        AuditEvent.objects.create(
            event="reservation.approved",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="reservation",
            entity_id=reservation.id,
            metadata={"from_status": old_status, "to_status": reservation.status},
        )
        
        return Response({
            "reservation": {
                "id": str(reservation.id),
                "status": reservation.status,
            },
            "message": "Reservation approved successfully.",
        })


class ReservationCancelView(APIView):
    """
    Cancel a reservation.
    """
    
    permission_classes = [IsAuthenticated, IsHost]
    
    def post(self, request: Request, pk: str) -> Response:
        """Cancel a reservation."""
        try:
            reservation = Reservation.objects.get(pk=pk)
        except Reservation.DoesNotExist:
            return Response(
                {"error": "NOT_FOUND", "message": "Reservation not found.", "details": {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Cannot cancel already cancelled reservations
        if reservation.status == Reservation.Status.CANCELLED:
            return Response(
                {"error": "CONFLICT", "message": "Reservation is already cancelled.", "details": {}},
                status=status.HTTP_409_CONFLICT,
            )
        
        old_status = reservation.status
        reservation.status = Reservation.Status.CANCELLED
        reservation.save()
        
        reason = request.data.get("reason", "Cancelled by staff")
        
        # Log audit event
        from core.models import AuditEvent
        AuditEvent.objects.create(
            event="reservation.cancelled",
            actor_type=AuditEvent.ActorType.USER,
            actor_id=request.user.id,
            entity_type="reservation",
            entity_id=reservation.id,
            metadata={"from_status": old_status, "reason": reason},
        )
        
        return Response({
            "reservation": {
                "id": str(reservation.id),
                "status": reservation.status,
            },
            "message": "Reservation cancelled successfully.",
        })
