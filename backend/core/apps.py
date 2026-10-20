import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    name = "core"

    def ready(self):
        """Initialize scheduled tasks when app is ready."""
        # Skip during tests to avoid database errors and warnings
        import os

        if os.environ.get("PYTEST_CURRENT_TEST"):
            return

        # Defer task setup to avoid database access during app initialization
        # Import setup function but don't call it here
        # The setup will be called by a management command or on first request
        # For now, we skip it to avoid RuntimeWarning
        # In production, use: python manage.py qcluster
        pass


def setup_tasks_on_startup():
    """Call this from management commands or after server startup."""
    from core.tasks import setup_scheduled_tasks

    try:
        setup_scheduled_tasks()
    except Exception as e:
        logger.warning(f"Failed to setup scheduled tasks: {e}")
        # Silently fail if database is not ready yet
        pass
