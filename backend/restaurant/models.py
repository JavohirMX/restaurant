"""
Restaurant profile, settings, hours, and CMS models (gallery, testimonials, blog).
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

from core.models import BaseModel


class Restaurant(BaseModel):
    """
    Restaurant profile information. Singleton pattern - only one instance allowed.
    """

    name = models.CharField(max_length=200)
    tagline = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)

    # Stored as JSON for flexibility
    location = models.JSONField(
        default=dict,
        blank=True,
        help_text="address, city, region, postalCode, country, geo (lat/lng), googleMapsEmbedUrl",
    )
    social = models.JSONField(
        default=dict,
        blank=True,
        help_text="instagram, facebook, tiktok, x, youtube, website URLs",
    )
    branding = models.JSONField(
        default=dict,
        blank=True,
        help_text="logoFile, primaryColorHex, secondaryColorHex",
    )

    class Meta:
        verbose_name = "Restaurant"
        verbose_name_plural = "Restaurant"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Enforce singleton pattern
        if not self.pk and Restaurant.objects.exists():
            raise ValidationError("Only one Restaurant instance is allowed.")
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        """Get the singleton Restaurant instance, or None if not created."""
        return cls.objects.first()


class RestaurantSettings(BaseModel):
    """
    Restaurant operational settings. One-to-one with Restaurant.
    """

    restaurant = models.OneToOneField(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    timezone = models.CharField(
        max_length=50,
        default="America/New_York",
        help_text="IANA timezone identifier",
    )
    staff_inbox_email = models.EmailField(
        blank=True,
        help_text="Email address for staff notifications",
    )
    ga4_measurement_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Google Analytics 4 measurement ID",
    )

    class Meta:
        verbose_name = "Restaurant Settings"
        verbose_name_plural = "Restaurant Settings"

    def __str__(self):
        return f"Settings for {self.restaurant.name}"


class ServicePeriod(BaseModel):
    """
    Opening hours / service periods. Multiple periods per day supported.
    """

    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="service_periods",
    )
    name = models.CharField(
        max_length=100,
        help_text="e.g., Lunch, Dinner, Brunch",
    )
    weekday = models.IntegerField(choices=Weekday.choices)
    opens_at = models.TimeField()
    closes_at = models.TimeField()

    class Meta:
        ordering = ["weekday", "opens_at"]
        indexes = [
            models.Index(
                fields=["restaurant", "weekday"], name="svc_period_restaurant_day_idx"
            ),
        ]

    def __str__(self):
        return f"{self.name} - {self.get_weekday_display()} {self.opens_at}-{self.closes_at}"

    def clean(self):
        if self.opens_at and self.closes_at and self.opens_at >= self.closes_at:
            raise ValidationError("Opening time must be before closing time.")


class GalleryImage(BaseModel):
    """
    Gallery images with required alt text for accessibility.
    """

    image = models.ImageField(upload_to="gallery/")
    alt_text = models.CharField(
        max_length=300,
        help_text="Required for accessibility",
    )
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.alt_text[:50]

    def clean(self):
        if not self.alt_text or not self.alt_text.strip():
            raise ValidationError(
                {"alt_text": "Alt text is required for accessibility."}
            )


class Testimonial(BaseModel):
    """
    Customer testimonials/reviews.
    """

    name = models.CharField(max_length=200)
    rating = models.PositiveSmallIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text="Rating from 1 to 5",
    )
    text = models.TextField()
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.name} - {self.rating} stars"


class BlogPost(BaseModel):
    """
    Blog posts with TipTap JSON body and pre-rendered HTML.
    """

    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, blank=True)
    body_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="TipTap JSON content for editing",
    )
    body_html = models.TextField(
        blank=True,
        help_text="Pre-rendered HTML for display",
    )
    cover_image = models.ImageField(
        upload_to="blog/",
        blank=True,
        null=True,
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Set to publish; null means draft",
    )
    seo = models.JSONField(
        default=dict,
        blank=True,
        help_text="metaTitle, metaDescription",
    )

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["slug"], name="blog_post_slug_idx"),
            models.Index(fields=["published_at"], name="blog_post_published_idx"),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
            # Ensure unique slug
            original_slug = self.slug
            counter = 1
            while BlogPost.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    @property
    def is_published(self):
        from django.utils import timezone

        return self.published_at is not None and self.published_at <= timezone.now()
