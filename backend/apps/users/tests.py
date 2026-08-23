from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

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


class AuthAPITests(APITestCase):
    def test_register_creates_user_and_logs_in(self):
        response = self.client.post(
            reverse("register"),
            {"email": "host@example.com", "username": "host1", "password": "Str0ngPassw0rd!"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="host@example.com").exists())

        me = self.client.get(reverse("me"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["email"], "host@example.com")

    def test_login_with_wrong_password_rejected(self):
        User.objects.create_user(
            email="host@example.com", username="host1", password="Str0ngPassw0rd!"
        )
        response = self.client.post(
            reverse("login"), {"email": "host@example.com", "password": "wrong"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class VerificationUploadAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="host@example.com", username="host1", password="Str0ngPassw0rd!"
        )
        self.client.force_authenticate(user=self.user)

    def _photo(self):
        image = Image.new("RGB", (100, 100), color="red")
        image_bytes = BytesIO()
        image.save(image_bytes, format="JPEG")
        image_bytes.seek(0)
        return SimpleUploadedFile("nric.jpg", image_bytes.getvalue(), content_type="image/jpeg")

    def test_upload_creates_pending_verification(self):
        response = self.client.post(
            reverse("verification-upload"), {"nric_photo": self._photo()}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        verification = IdentityVerification.objects.get(user=self.user)
        self.assertEqual(verification.status, IdentityVerification.Status.PENDING)

    def test_second_upload_blocked_while_pending(self):
        self.client.post(
            reverse("verification-upload"), {"nric_photo": self._photo()}, format="multipart"
        )
        response = self.client.post(
            reverse("verification-upload"), {"nric_photo": self._photo()}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
