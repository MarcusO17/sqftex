from django.contrib.auth.models import AbstractUser
from django.db import models

from config.storage_backends import private_storage


class User(AbstractUser):
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.email or self.username


class IdentityVerification(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verifications")
    nric_photo = models.ImageField(upload_to="verification/", storage=private_storage)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_verifications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.status}"
