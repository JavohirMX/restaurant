"""
Custom pagination classes for the API.
"""

from rest_framework.pagination import CursorPagination as DRF_CursorPagination
from rest_framework.response import Response


class CursorPagination(DRF_CursorPagination):
    """
    Cursor-based pagination for large datasets.

    Provides consistent ordering and prevents duplicate/missed items
    when the underlying data changes during pagination.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-id"  # Use -id as a safer default since all models have it

    def get_paginated_response(self, data):
        """Return paginated response with metadata."""
        return Response(
            {
                "data": data,
                "pagination": {
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                },
            }
        )


class PageNumberPagination:
    """
    Placeholder for potential future page-number based pagination.

    Currently using cursor pagination as default for better performance
    with large datasets.
    """

    pass
