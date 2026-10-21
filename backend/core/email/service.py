"""
Email service abstraction layer.

Provides a unified interface for sending transactional emails
with support for multiple backends (console, SMTP).
"""

import logging
import threading
from abc import ABC, abstractmethod
from typing import Any

from django.conf import settings
from django.core.mail import EmailMessage, get_connection

logger = logging.getLogger(__name__)


class EmailBackend(ABC):
    """Abstract base class for email backends."""

    @abstractmethod
    def send(
        self, to: list[str], subject: str, body: str, html_body: str | None = None
    ) -> bool:
        """Send an email."""
        pass


class ConsoleEmailBackend(EmailBackend):
    """Backend that logs emails to console."""

    def send(
        self, to: list[str], subject: str, body: str, html_body: str | None = None
    ) -> bool:
        """Log email to console."""
        logger.info("=" * 60)
        logger.info("EMAIL")
        logger.info("=" * 60)
        logger.info(f"To: {', '.join(to)}")
        logger.info(f"Subject: {subject}")
        logger.info("-" * 60)
        logger.info(body)
        if html_body:
            logger.info("-" * 60)
            logger.info("HTML Body:")
            logger.info(html_body[:500] + "..." if len(html_body) > 500 else html_body)
        logger.info("=" * 60)
        return True


class SmtpEmailBackend(EmailBackend):
    """Backend that sends emails via SMTP."""

    def send(
        self, to: list[str], subject: str, body: str, html_body: str | None = None
    ) -> bool:
        """Send email via SMTP."""
        try:
            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=to,
                connection=get_connection(),
            )

            if html_body:
                email.content_subtype = "html"
                email.body = html_body

            email.send()
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False


class EmailService:
    """Service for sending transactional emails."""

    _instance = None
    _backend = None
    _lock = threading.Lock()

    def __new__(cls):
        """Thread-safe singleton pattern."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize_backend()
        return cls._instance

    def _initialize_backend(self) -> None:
        """Initialize the email backend based on settings."""
        backend_type = getattr(settings, "EMAIL_BACKEND_TYPE", "console")

        if backend_type == "smtp":
            self._backend = SmtpEmailBackend()
        else:
            self._backend = ConsoleEmailBackend()

    def send(
        self,
        to: str | list[str],
        template_name: str,
        context: dict[str, Any],
    ) -> bool:
        """
        Send an email using a template.

        Args:
            to: Recipient email address(es)
            template_name: Name of the email template
            context: Context data for template rendering

        Returns:
            True if email was sent successfully, False otherwise
        """
        if isinstance(to, str):
            to = [to]

        try:
            # Load template
            template = EmailTemplate.get_template(template_name)

            # Render subject and body
            subject = template.render_subject(context)
            body = template.render_body(context)
            html_body = template.render_html(context) if template.has_html else None

            # Send via backend
            return self._backend.send(to, subject, body, html_body)
        except Exception as e:
            logger.error(f"Failed to send email with template '{template_name}': {e}")
            return False

    def send_to_staff(
        self,
        template_name: str,
        context: dict[str, Any],
    ) -> bool:
        """
        Send an email to the staff inbox.

        Args:
            template_name: Name of the email template
            context: Context data for template rendering

        Returns:
            True if email was sent successfully, False otherwise
        """
        staff_email = getattr(settings, "STAFF_EMAIL", None)
        if not staff_email:
            logger.warning("STAFF_EMAIL not configured, skipping staff notification")
            return False

        return self.send(staff_email, template_name, context)


class EmailTemplate:
    """Email template with text and HTML versions."""

    TEMPLATES: dict[str, "EmailTemplate"] = {}

    def __init__(
        self,
        name: str,
        subject_template: str,
        body_template: str,
        html_template: str | None = None,
    ):
        self.name = name
        self.subject_template = subject_template
        self.body_template = body_template
        self.html_template = html_template

    @property
    def has_html(self) -> bool:
        """Check if template has HTML version."""
        return self.html_template is not None

    def render_subject(self, context: dict[str, Any]) -> str:
        """Render email subject."""
        from django.template import Context, Template

        template = Template(self.subject_template)
        return template.render(Context(context))

    def render_body(self, context: dict[str, Any]) -> str:
        """Render email body."""
        from django.template import Context, Template

        template = Template(self.body_template)
        return template.render(Context(context))

    def render_html(self, context: dict[str, Any]) -> str | None:
        """Render HTML email body."""
        if not self.html_template:
            return None
        from django.template import Context, Template

        template = Template(self.html_template)
        return template.render(Context(context))

    @classmethod
    def register(cls, template: "EmailTemplate") -> None:
        """Register a template."""
        cls.TEMPLATES[template.name] = template

    @classmethod
    def get_template(cls, name: str) -> "EmailTemplate":
        """Get a template by name."""
        if name not in cls.TEMPLATES:
            raise ValueError(f"Email template '{name}' not found")
        return cls.TEMPLATES[name]


# Register email templates
EmailTemplate.register(
    EmailTemplate(
        name="reservation_confirmed",
        subject_template="Your reservation at {{ restaurant_name }} is confirmed",
        body_template="""Dear {{ guest_name }},

Your reservation at {{ restaurant_name }} is confirmed.

Details:
- Date: {{ date }}
- Time: {{ time }}
- Party size: {{ party_size }} guests

If you need to modify or cancel your reservation, please use this link:
{{ manage_url }}

We look forward to seeing you!

{{ restaurant_name }}
""",
        html_template=None,  # Could add HTML version
    )
)

EmailTemplate.register(
    EmailTemplate(
        name="reservation_pending",
        subject_template="Your reservation request at {{ restaurant_name }}",
        body_template="""Dear {{ guest_name }},

Thank you for your reservation request at {{ restaurant_name }}.

Details:
- Date: {{ date }}
- Time: {{ time }}
- Party size: {{ party_size }} guests

Your reservation is pending approval. We will contact you shortly to confirm.

You can check the status of your reservation here:
{{ manage_url }}

{{ restaurant_name }}
""",
    )
)

EmailTemplate.register(
    EmailTemplate(
        name="reservation_modified",
        subject_template="Your reservation has been updated",
        body_template="""Dear {{ guest_name }},

Your reservation at {{ restaurant_name }} has been updated.

Updated details:
- Date: {{ date }}
- Time: {{ time }}
- Party size: {{ party_size }} guests
- Status: {{ status }}

Manage your reservation:
{{ manage_url }}

{{ restaurant_name }}
""",
    )
)

EmailTemplate.register(
    EmailTemplate(
        name="reservation_cancelled",
        subject_template="Your reservation has been cancelled",
        body_template="""Dear {{ guest_name }},

Your reservation at {{ restaurant_name }} has been cancelled.

Cancelled reservation details:
- Date: {{ date }}
- Time: {{ time }}
- Party size: {{ party_size }} guests

If you would like to make a new reservation, please visit:
{{ booking_url }}

{{ restaurant_name }}
""",
    )
)

EmailTemplate.register(
    EmailTemplate(
        name="reservation_reminder",
        subject_template="Reminder: Your reservation at {{ restaurant_name }} tomorrow",
        body_template="""Dear {{ guest_name }},

This is a reminder of your upcoming reservation at {{ restaurant_name }}.

Details:
- Date: {{ date }}
- Time: {{ time }}
- Party size: {{ party_size }} guests

We look forward to seeing you!

{{ restaurant_name }}
""",
    )
)

EmailTemplate.register(
    EmailTemplate(
        name="staff_new_pending",
        subject_template="New pending reservation requires approval",
        body_template="""New pending reservation requires your approval.

Guest: {{ guest_name }}
Email: {{ guest_email }}
Phone: {{ guest_phone }}

Reservation details:
- Date: {{ date }}
- Time: {{ time }}
- Party size: {{ party_size }} guests
- Notes: {{ notes }}

Approve or manage this reservation:
{{ admin_url }}
""",
    )
)

EmailTemplate.register(
    EmailTemplate(
        name="staff_reservation_cancelled",
        subject_template="Guest cancelled reservation",
        body_template="""A guest has cancelled their reservation.

Guest: {{ guest_name }}
Email: {{ guest_email }}

Cancelled reservation details:
- Date: {{ date }}
- Time: {{ time }}
- Party size: {{ party_size }} guests
- Reason: {{ cancellation_reason|default:"Not provided" }}

View in admin:
{{ admin_url }}
""",
    )
)


# Convenience function for sending emails
def send_email(
    to: str | list[str],
    template_name: str,
    context: dict[str, Any],
) -> bool:
    """
    Send an email using the email service.

    Args:
        to: Recipient email address(es)
        template_name: Name of the email template
        context: Context data for template rendering

    Returns:
        True if email was sent successfully, False otherwise
    """
    service = EmailService()
    return service.send(to, template_name, context)


def send_staff_email(
    template_name: str,
    context: dict[str, Any],
) -> bool:
    """
    Send an email to the staff inbox.

    Args:
        template_name: Name of the email template
        context: Context data for template rendering

    Returns:
        True if email was sent successfully, False otherwise
    """
    service = EmailService()
    return service.send_to_staff(template_name, context)
