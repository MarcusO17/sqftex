from django.contrib.gis.geos import Point
from django.test import TestCase

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
