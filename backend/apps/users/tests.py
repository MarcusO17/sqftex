from django.test import TestCase

from .models import User

class UserModelTests(TestCase):
    def test_new_user_defaults_to_unverified(self):
        user = User.objects.create_user(
            email="host@example.com", username="host1", password="Str0ngPassw0rd!"
        )
        self.assertFalse(user.is_verified)
