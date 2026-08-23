from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.db import models

from config.storage_backends import public_storage


class Listing(models.Model):
    class Category(models.TextChoices):
        SPARE_ROOM = "spare_room", "Spare room"
        GARAGE = "garage", "Garage"
        SHOPLOT_BACK_ROOM = "shoplot_back_room", "Shoplot back room"
        WAREHOUSE_BAY = "warehouse_bay", "Warehouse bay"
        OTHER = "other", "Other"

    class PriceUnit(models.TextChoices):
        DAILY = "daily", "Daily"
        MONTHLY = "monthly", "Monthly"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listings"
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=Category.choices)
    size_sqft = models.PositiveIntegerField()
    price_cents = models.PositiveIntegerField(help_text="Price in MYR sen (integer cents).")
    price_unit = models.CharField(max_length=10, choices=PriceUnit.choices)
    location = gis_models.PointField(geography=True)
    address = models.TextField()
    access_rules = models.TextField(blank=True)
    prohibited_items = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    @property
    def has_photos(self):
        return self.photos.exists()


class ListingPhoto(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="listings/", storage=public_storage)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"Photo {self.order} for {self.listing_id}"
