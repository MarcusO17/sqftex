from django.contrib import admin
from django.urls import path

urlpatterns = [
    path("admin/", admin.site.urls),
    # apps.users.urls wired in during Task 3
    # apps.listings.urls wired in during Task 6
]
