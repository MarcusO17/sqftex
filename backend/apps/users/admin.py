from django.contrib import admin
from django.utils import timezone

from .models import IdentityVerification, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "username", "is_verified", "is_staff")
    search_fields = ("email", "username")


@admin.action(description="Approve selected verifications")
def approve_verifications(modeladmin, request, queryset):
    for verification in queryset.select_related("user"):
        verification.status = IdentityVerification.Status.APPROVED
        verification.reviewed_by = request.user
        verification.reviewed_at = timezone.now()
        verification.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        verification.user.is_verified = True
        verification.user.save(update_fields=["is_verified"])


@admin.action(description="Reject selected verifications")
def reject_verifications(modeladmin, request, queryset):
    queryset.update(
        status=IdentityVerification.Status.REJECTED,
        reviewed_by=request.user,
        reviewed_at=timezone.now(),
    )


@admin.register(IdentityVerification)
class IdentityVerificationAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "reviewed_by", "reviewed_at", "created_at")
    list_filter = ("status",)
    actions = [approve_verifications, reject_verifications]
