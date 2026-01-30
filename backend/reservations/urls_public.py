"""
Public URL configuration for the reservations app.

Provides public access to reservation availability and booking.
"""

from django.urls import path

from reservations.views_public import (
    AvailabilityView,
    ReservationCancelView,
    ReservationCreateView,
    ReservationDetailView,
    ReservationModifyView,
)

app_name = "reservations_public"

urlpatterns = [
    # Availability
    path("availability/", AvailabilityView.as_view(), name="availability"),
    
    # Reservations
    path("", ReservationCreateView.as_view(), name="reservation-create"),
    path("<str:token>/", ReservationDetailView.as_view(), name="reservation-detail"),
    path("<str:token>/modify/", ReservationModifyView.as_view(), name="reservation-modify"),
    path("<str:token>/cancel/", ReservationCancelView.as_view(), name="reservation-cancel"),
]
