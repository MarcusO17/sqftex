from django.contrib import admin

from .models import Listing, ListingPhoto


class ListingPhotoInline(admin.TabularInline):
    model = ListingPhoto
    extra = 1


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "category", "status", "price_cents", "price_unit")
    list_filter = ("status", "category")
    inlines = [ListingPhotoInline]
