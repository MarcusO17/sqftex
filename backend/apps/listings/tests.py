from io import BytesIO

from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image
from rest_framework.test import APITestCase

from apps.users.models import User

from .models import Listing


class ListingModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="host@example.com", username="host1", password="pw", is_verified=True
        )

    def _listing(self, **overrides):
        defaults = dict(
            owner=self.owner,
            title="Spare room in PJ",
            description="Dry, secure spare room.",
            category=Listing.Category.SPARE_ROOM,
            size_sqft=100,
            price_cents=15000,
            price_unit=Listing.PriceUnit.MONTHLY,
            location=Point(101.6, 3.1),
            address="Petaling Jaya, Selangor",
        )
        defaults.update(overrides)
        return Listing.objects.create(**defaults)

    def test_has_photos_false_without_photos(self):
        listing = self._listing()
        self.assertFalse(listing.has_photos)

    def test_has_photos_true_with_photo(self):
        listing = self._listing()
        listing.photos.create(image="listings/test.jpg")
        self.assertTrue(listing.has_photos)


class ListingAPITests(APITestCase):
    def setUp(self):
        self.verified_host = User.objects.create_user(
            email="verified@example.com", username="verified", password="pw", is_verified=True
        )
        self.unverified_host = User.objects.create_user(
            email="unverified@example.com", username="unverified", password="pw"
        )

    def _payload(self, **overrides):
        payload = dict(
            title="Spare room in PJ",
            description="Dry, secure spare room.",
            category=Listing.Category.SPARE_ROOM,
            size_sqft=100,
            price_cents=15000,
            price_unit=Listing.PriceUnit.MONTHLY,
            address="Petaling Jaya, Selangor",
            latitude=3.1,
            longitude=101.6,
        )
        payload.update(overrides)
        return payload

    def test_unverified_host_cannot_create_listing(self):
        self.client.force_authenticate(user=self.unverified_host)
        response = self.client.post("/api/v1/listings/", self._payload())
        self.assertEqual(response.status_code, 400)

    def test_verified_host_can_create_listing(self):
        self.client.force_authenticate(user=self.verified_host)
        response = self.client.post("/api/v1/listings/", self._payload())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], Listing.Status.DRAFT)

    def test_public_can_list_and_retrieve_active_listings(self):
        Listing.objects.create(
            owner=self.verified_host,
            title="Warehouse bay",
            description="Secure bay near Shah Alam.",
            category=Listing.Category.WAREHOUSE_BAY,
            size_sqft=500,
            price_cents=50000,
            price_unit=Listing.PriceUnit.MONTHLY,
            location=Point(101.6, 3.1),
            address="Shah Alam",
            status=Listing.Status.ACTIVE,
        )
        response = self.client.get("/api/v1/listings/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_publish_requires_at_least_one_photo(self):
        self.client.force_authenticate(user=self.verified_host)
        create_response = self.client.post("/api/v1/listings/", self._payload())
        listing_id = create_response.data["id"]

        publish_response = self.client.post(f"/api/v1/listings/{listing_id}/publish/")
        self.assertEqual(publish_response.status_code, 400)

        image = Image.new("RGB", (100, 100), color="red")
        image_bytes = BytesIO()
        image.save(image_bytes, format="JPEG")
        photo = SimpleUploadedFile("room.jpg", image_bytes.getvalue(), content_type="image/jpeg")
        self.client.post(
            f"/api/v1/listings/{listing_id}/photos/", {"image": photo}, format="multipart"
        )
        publish_response = self.client.post(f"/api/v1/listings/{listing_id}/publish/")
        self.assertEqual(publish_response.status_code, 200)
        self.assertEqual(publish_response.data["status"], Listing.Status.ACTIVE)
