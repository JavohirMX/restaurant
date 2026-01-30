"""
Menu models: categories, items, and variants.
"""

from django.db import models

from core.models import BaseModel


class MenuCategory(BaseModel):
    """
    Menu category (e.g., Starters, Mains, Desserts).
    """

    name = models.CharField(max_length=200)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["sort_order"]
        verbose_name_plural = "Menu Categories"

    def __str__(self):
        return self.name


class MenuItem(BaseModel):
    """
    Menu item belonging to a category.
    """

    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.CASCADE,
        related_name="items",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="e.g., ['vegetarian', 'gluten-free', 'spicy']",
    )
    photos = models.JSONField(
        default=list,
        blank=True,
        help_text="List of photo URLs/filenames",
    )
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class MenuItemVariant(BaseModel):
    """
    Variant of a menu item (e.g., size, portion).
    Items can have 0+ variants. If no variants, item has a single default price.
    """

    item = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    name = models.CharField(
        max_length=200,
        help_text="e.g., Regular, Large, Half Portion",
    )
    price_cents = models.PositiveIntegerField(
        help_text="Price in cents (e.g., 1250 = $12.50)",
    )
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.item.name} - {self.name} (${self.price_cents / 100:.2f})"

    @property
    def price_display(self):
        """Return formatted price string."""
        return f"${self.price_cents / 100:.2f}"
