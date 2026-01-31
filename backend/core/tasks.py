"""
Background tasks for the restaurant backend.

Uses Django-Q for async task processing.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django_q.tasks import async_task, schedule

from core.email.service import send_email, send_staff_email
from reservations.models import Reservation, ReservationToken
from core.models import AuditEvent

logger = logging.getLogger(__name__)


def send_reservation_email(reservation_id: str, email_type: str) -> bool:
    """
    Send reservation-related email to guest.
    
    Args:
        reservation_id: UUID of the reservation
        email_type: Type of email (confirmed, pending, modified, cancelled)
    
    Returns:
        True if email sent successfully
    """
    try:
        reservation = Reservation.objects.get(id=reservation_id)
    except Reservation.DoesNotExist:
        logger.error(f"Reservation {reservation_id} not found for email")
        return False
    
    # Get restaurant info
    from restaurant.models import Restaurant
    restaurant = Restaurant.get_instance()
    restaurant_name = restaurant.name if restaurant else "Our Restaurant"

    # Get reservation token for manage URL
    token = reservation.tokens.first()
    manage_url = f"/reservations/{token.token}" if token else "/reservations"

    # Build context
    context = {
        "guest_name": reservation.guest_name,
        "restaurant_name": restaurant_name,
        "date": reservation.starts_at.strftime("%A, %B %d, %Y"),
        "time": reservation.starts_at.strftime("%I:%M %p"),
        "party_size": reservation.party_size,
        "status": reservation.status,
        "manage_url": manage_url,
        "booking_url": "/reservations",
    }
    
    # Map email type to template
    template_map = {
        "confirmed": "reservation_confirmed",
        "pending": "reservation_pending",
        "modified": "reservation_modified",
        "cancelled": "reservation_cancelled",
        "reminder": "reservation_reminder",
    }
    
    template_name = template_map.get(email_type)
    if not template_name:
        logger.error(f"Unknown email type: {email_type}")
        return False
    
    result = send_email(reservation.guest_email, template_name, context)
    
    # Create audit event for email sent
    if result:
        AuditEvent.objects.create(
            event=f"reservation.email_{email_type}",
            actor_type=AuditEvent.ActorType.SYSTEM,
            actor_id=None,
            entity_type="reservation",
            entity_id=reservation.id,
            metadata={"email_type": email_type},
        )
    
    return result


def send_staff_notification(reservation_id: str, notification_type: str) -> bool:
    """
    Send notification to staff inbox.
    
    Args:
        reservation_id: UUID of the reservation
        notification_type: Type of notification (new_pending, cancelled)
    
    Returns:
        True if notification sent successfully
    """
    if not settings.STAFF_EMAIL:
        logger.warning("STAFF_EMAIL not configured, skipping notification")
        return False
    
    try:
        reservation = Reservation.objects.get(id=reservation_id)
    except Reservation.DoesNotExist:
        logger.error(f"Reservation {reservation_id} not found for staff notification")
        return False
    
    # Build context
    context = {
        "guest_name": reservation.guest_name,
        "guest_email": reservation.guest_email,
        "guest_phone": reservation.guest_phone or "Not provided",
        "date": reservation.starts_at.strftime("%A, %B %d, %Y"),
        "time": reservation.starts_at.strftime("%I:%M %p"),
        "party_size": reservation.party_size,
        "notes": reservation.notes or "None",
        "admin_url": f"/admin/reservations/{reservation.id}",
    }
    
    # Map notification type to template
    template_map = {
        "new_pending": "staff_new_pending",
        "cancelled": "staff_reservation_cancelled",
    }
    
    template_name = template_map.get(notification_type)
    if not template_name:
        logger.error(f"Unknown notification type: {notification_type}")
        return False
    
    return send_staff_email(template_name, context)


def cleanup_expired_tokens() -> int:
    """
    Clean up expired reservation tokens.
    
    Returns:
        Number of tokens deleted
    """
    expired_tokens = ReservationToken.objects.filter(expires_at__lt=timezone.now())
    count = expired_tokens.count()
    expired_tokens.delete()
    
    if count > 0:
        logger.info(f"Cleaned up {count} expired reservation tokens")
    
    return count


def cleanup_old_audit_events(days: int = 90) -> int:
    """
    Archive old audit events.
    
    Args:
        days: Age in days after which to archive events
    
    Returns:
        Number of events archived
    """
    cutoff_date = timezone.now() - timedelta(days=days)
    old_events = AuditEvent.objects.filter(created_at__lt=cutoff_date)
    count = old_events.count()
    
    # In a real implementation, you might archive these to cold storage
    # For now, we just delete them
    old_events.delete()
    
    if count > 0:
        logger.info(f"Cleaned up {count} old audit events")
    
    return count


def send_reservation_reminders() -> int:
    """
    Send reminder emails for upcoming reservations.
    
    Returns:
        Number of reminders sent
    """
    # Find reservations in the next 24 hours that haven't been reminded
    tomorrow = timezone.now() + timedelta(hours=24)
    upcoming = Reservation.objects.filter(
        status=Reservation.Status.CONFIRMED,
        starts_at__lte=tomorrow,
        starts_at__gt=timezone.now(),
    )
    
    count = 0
    for reservation in upcoming:
        # Check if we've already sent a reminder
        reminder_sent = AuditEvent.objects.filter(
            event="reservation.reminder_sent",
            entity_type="reservation",
            entity_id=reservation.id,
        ).exists()
        
        if not reminder_sent:
            # Send reminder email
            if send_reservation_email(str(reservation.id), "reminder"):
                # Log that we sent the reminder
                AuditEvent.objects.create(
                    event="reservation.reminder_sent",
                    actor_type=AuditEvent.ActorType.SYSTEM,
                    actor_id=None,
                    entity_type="reservation",
                    entity_id=reservation.id,
                    metadata={},
                )
                count += 1
    
    if count > 0:
        logger.info(f"Sent {count} reservation reminders")
    
    return count


# Async wrappers for views to use

def queue_reservation_email(reservation_id: str, email_type: str) -> None:
    """Queue a reservation email to be sent asynchronously."""
    async_task(send_reservation_email, reservation_id, email_type)


def queue_staff_notification(reservation_id: str, notification_type: str) -> None:
    """Queue a staff notification to be sent asynchronously."""
    async_task(send_staff_notification, reservation_id, notification_type)


# Scheduled task setup (call these in AppConfig.ready() or management command)

def setup_scheduled_tasks():
    """Set up recurring scheduled tasks."""
    from datetime import datetime, timedelta

    now = timezone.now()

    # Calculate next 3 AM (tomorrow if already past 3 AM today)
    next_3am = now.replace(hour=3, minute=0, second=0, microsecond=0)
    if next_3am <= now:
        next_3am += timedelta(days=1)

    # Clean up expired tokens daily at 3 AM
    schedule(
        "core.tasks.cleanup_expired_tokens",
        schedule_type="D",  # Daily
        repeats=-1,  # Repeat forever
        next_run=next_3am,
    )

    # Calculate next Sunday at 4 AM
    days_until_sunday = (6 - now.weekday()) % 7  # 6 is Sunday
    if days_until_sunday == 0 and now.hour >= 4:
        days_until_sunday = 7
    next_sunday_4am = (now + timedelta(days=days_until_sunday)).replace(
        hour=4, minute=0, second=0, microsecond=0
    )

    # Clean up old audit events weekly on Sunday at 4 AM
    schedule(
        "core.tasks.cleanup_old_audit_events",
        schedule_type="W",  # Weekly
        repeats=-1,
        next_run=next_sunday_4am,
    )
    
    # Send reservation reminders hourly
    schedule(
        "core.tasks.send_reservation_reminders",
        schedule_type="H",  # Hourly
        repeats=-1,
    )
    
    logger.info("Scheduled tasks set up successfully")
