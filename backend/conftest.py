import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache():
    """Rate-limit counters live in the cache; reset them so tests do not
    trip each other's per-IP limits (e.g. login is 5/min)."""
    cache.clear()
    yield
    cache.clear()
