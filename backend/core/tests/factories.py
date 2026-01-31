"""
Factory classes for test data generation.

Uses factory_boy to create test fixtures for all models.
"""

import uuid
from datetime import timedelta

import factory
from django.utils import timezone

from accounts.models import User
from core.models import AuditEvent
from menu.models import MenuCategory, MenuItem, MenuItemVariant
from reservations.models import Reservation, ReservationSettings, ReservationToken
from restaurant.models import (
    BlogPost,
    GalleryImage,
    Restaurant,
    RestaurantSettings,
    ServicePeriod,
    Testimonial,
)


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for User model."""

    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    role = User.Role.ADMIN
    is_active = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password after creation."""
        if not create:
            return
        password = extracted or "testpass123"
        self.set_password(password)
        self.save()


class RestaurantFactory(factory.django.DjangoModelFactory):
    """Factory for Restaurant model."""

    class Meta:
        model = Restaurant

    name = factory.Faker("company")
    tagline = factory.Faker("catch_phrase")
    description = factory.Faker("paragraph")
    phone = factory.Faker("phone_number")
    email = factory.Faker("company_email")
    location = factory.Dict(
        {
            "address": factory.Faker("address"),
            "city": factory.Faker("city"),
            "country": factory.Faker("country"),
        }
    )
    social = factory.Dict(
        {
            "instagram": "https://instagram.com/test",
            "facebook": "https://facebook.com/test",
        }
    )
    branding = factory.Dict({"primary_color": "#FF5733"})


class RestaurantSettingsFactory(factory.django.DjangoModelFactory):
    """Factory for RestaurantSettings model."""

    class Meta:
        model = RestaurantSettings

    restaurant = factory.SubFactory(RestaurantFactory)
    timezone = "UTC"
    ga4_measurement_id = ""


class ServicePeriodFactory(factory.django.DjangoModelFactory):
    """Factory for ServicePeriod model."""

    class Meta:
        model = ServicePeriod

    restaurant = factory.SubFactory(RestaurantFactory)
    weekday = 0  # Monday
    name = "Lunch"
    opens_at = factory.LazyFunction(
        lambda: timezone.make_aware(timezone.datetime(2024, 1, 1, 11, 0))
    )
    closes_at = factory.LazyFunction(
        lambda: timezone.make_aware(timezone.datetime(2024, 1, 1, 15, 0))
    )


class MenuCategoryFactory(factory.django.DjangoModelFactory):
    """Factory for MenuCategory model."""

    class Meta:
        model = MenuCategory

    name = factory.Faker("word")
    sort_order = factory.Sequence(lambda n: n)


class MenuItemFactory(factory.django.DjangoModelFactory):
    """Factory for MenuItem model."""

    class Meta:
        model = MenuItem

    category = factory.SubFactory(MenuCategoryFactory)
    name = factory.Faker("dish")
    description = factory.Faker("sentence")
    tags = factory.List([factory.Faker("word") for _ in range(3)])
    photos = factory.List([])
    sort_order = factory.Sequence(lambda n: n)


class MenuItemVariantFactory(factory.django.DjangoModelFactory):
    """Factory for MenuItemVariant model."""

    class Meta:
        model = MenuItemVariant

    item = factory.SubFactory(MenuItemFactory)
    name = factory.Faker("word")
    price_cents = factory.Faker("random_int", min=500, max=5000)
    sort_order = factory.Sequence(lambda n: n)


class GalleryImageFactory(factory.django.DjangoModelFactory):
    """Factory for GalleryImage model."""

    class Meta:
        model = GalleryImage

    restaurant = factory.SubFactory(RestaurantFactory)
    image = factory.django.ImageField(color="blue")
    alt_text = factory.Faker("sentence")
    sort_order = factory.Sequence(lambda n: n)
    is_published = True


class TestimonialFactory(factory.django.DjangoModelFactory):
    """Factory for Testimonial model."""

    class Meta:
        model = Testimonial

    restaurant = factory.SubFactory(RestaurantFactory)
    name = factory.Faker("name")
    rating = factory.Faker("random_int", min=1, max=5)
    text = factory.Faker("paragraph")
    sort_order = factory.Sequence(lambda n: n)
    is_published = True


class BlogPostFactory(factory.django.DjangoModelFactory):
    """Factory for BlogPost model."""

    class Meta:
        model = BlogPost

    restaurant = factory.SubFactory(RestaurantFactory)
    title = factory.Faker("sentence")
    slug = factory.Sequence(lambda n: f"blog-post-{n}")
    body_json = factory.Dict({"type": "doc", "content": []})
    body_html = factory.Faker("paragraph", nb_sentences=5)
    published_at = factory.LazyFunction(timezone.now)
    seo = factory.Dict({})


class ReservationSettingsFactory(factory.django.DjangoModelFactory):
    """Factory for ReservationSettings model."""

    class Meta:
        model = ReservationSettings

    slot_interval_minutes = 30
    turn_time_minutes = 90
    max_guests_per_slot = 40
    max_party_size_online = 8
    min_lead_time_minutes = 120
    max_days_ahead = 30
    require_phone = True
    approval_party_size_threshold = 6
    same_day_window_hours = 4
    near_capacity_percent = 85
    approval_windows = factory.List([])
    token_expiry_days = 30


class ReservationFactory(factory.django.DjangoModelFactory):
    """Factory for Reservation model."""

    class Meta:
        model = Reservation

    status = Reservation.Status.CONFIRMED
    party_size = factory.Faker("random_int", min=1, max=6)
    starts_at = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=1, hours=12)
    )
    guest_name = factory.Faker("name")
    guest_email = factory.Faker("email")
    guest_phone = factory.Faker("phone_number")
    notes = factory.Faker("sentence")


class ReservationTokenFactory(factory.django.DjangoModelFactory):
    """Factory for ReservationToken model."""

    class Meta:
        model = ReservationToken

    reservation = factory.SubFactory(ReservationFactory)
    token = factory.LazyFunction(lambda: uuid.uuid4().hex)


class AuditEventFactory(factory.django.DjangoModelFactory):
    """Factory for AuditEvent model."""

    class Meta:
        model = AuditEvent

    event = "test.event"
    actor_type = AuditEvent.ActorType.USER
    actor_id = factory.Faker("uuid4")
    entity_type = "test_entity"
    entity_id = factory.Faker("uuid4")
    metadata = factory.Dict({})
    ip_address = factory.Faker("ipv4")
