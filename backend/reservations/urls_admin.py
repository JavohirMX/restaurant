"""
Admin URL configuration for the reservations app.

Provides CRUD operations for reservation management.
"""

from django.urls import path

from reservations.views_admin import (
    ReservationApproveView,
    ReservationCancelView,
    ReservationDetailView,
    ReservationListView,
    ReservationSettingsView,
)

app_name = "reservations_admin"

urlpatterns = [
    # Settings
    path("settings/", ReservationSettingsView.as_view(), name="settings"),
    # Reservations
    path("", ReservationListView.as_view(), name="reservation-list"),
    path("<uuid:pk>/", ReservationDetailView.as_view(), name="reservation-detail"),
    path(
        "<uuid:pk>/approve/",
        ReservationApproveView.as_view(),
        name="reservation-approve",
    ),
    path(
        "<uuid:pk>/cancel/", ReservationCancelView.as_view(), name="reservation-cancel"
    ),
]
