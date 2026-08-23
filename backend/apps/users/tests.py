from django.test import TestCase
from django.utils import timezone

from .admin import approve_verifications
from .models import IdentityVerification, User

class UserModelTests(TestCase):
    def test_new_user_defaults_to_unverified(self):
        user = User.objects.create_user(
            email="host@example.com", username="host1", password="Str0ngPassw0rd!"
        )
        self.assertFalse(user.is_verified)


class IdentityVerificationAdminTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@example.com", username="staff1", password="pw", is_staff=True
        )
        self.host = User.objects.create_user(
            email="host@example.com", username="host1", password="pw"
        )
        self.verification = IdentityVerification.objects.create(
            user=self.host, nric_photo="verification/test.jpg"
        )

    def test_approve_action_marks_user_verified(self):
        request = type("Request", (), {"user": self.staff})()
        approve_verifications(
            None, request, IdentityVerification.objects.filter(pk=self.verification.pk)
        )
        self.host.refresh_from_db()
        self.verification.refresh_from_db()
        self.assertTrue(self.host.is_verified)
        self.assertEqual(self.verification.status, IdentityVerification.Status.APPROVED)
        self.assertEqual(self.verification.reviewed_by, self.staff)
