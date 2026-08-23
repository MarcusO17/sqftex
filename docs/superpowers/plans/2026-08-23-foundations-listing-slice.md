# v1 Foundations + Listing Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the buildable skeleton of the platform (repo scaffolding, core data models, auth/verification, deployment shape) and prove it end-to-end with one real slice: a host signs up, gets ID-verified, and creates a listing; anyone can view it publicly.

**Architecture:** Django + DRF backend (`backend/apps/users`, `backend/apps/listings`) behind session-cookie auth, Postgres+PostGIS for storage, Cloudflare R2 for media. Next.js App Router frontend consuming the API with cookie-forwarded requests. Backend runs inside Docker for local dev (see Environment Note below) — Postgres/Redis/Django all as docker-compose services.

**Tech Stack:** Django 5.0, DRF 3.15, django-allauth (pinned pre-0.63 settings API), django-storages + boto3 (R2), psycopg2, GeoDjango/PostGIS, Next.js 14 (App Router, TypeScript, no Tailwind), Docker/docker-compose, Railway (deploy target).

**Spec:** `docs/superpowers/specs/2026-08-23-foundations-listing-slice-design.md`

## Environment Note (read before Task 1)

This machine is Windows (win32). GeoDjango's `PointField` requires native GEOS/GDAL bindings that are painful to install natively on Windows. To avoid that entirely, the Django backend runs **inside Docker** for local dev, not just Postgres — every backend command in this plan is run via `docker-compose run --rm web <command>`. Docker Desktop (with Linux containers) must be installed and running before starting Task 1.

## Global Constraints

- Money is always integer cents (MYR sen), never floats (`CLAUDE.md`).
- The verification gate (`is_verified`) is checked explicitly in application code, never relied on implicitly — matches the existing rule for bookings in `booking-payment-flow`, applied here to listings (spec §4).
- No delivery/logistics features; no booking/payment/escrow/messaging/dashboard/reviews — explicitly out of scope for this slice (spec §1, §9).
- Auth is session-cookie based, not JWT (spec §4) — this drives explicit CSRF handling in the frontend API client.
- A `Listing` cannot move `draft` → `active` without at least one `ListingPhoto` (spec §5).
- Backend apps created this slice: `users`, `listings` only. `bookings`/`payments`/`reviews` are not scaffolded yet (spec §2, YAGNI).

---

## Task 1: Backend Scaffolding, Docker, and Custom User Model

**Files:**

- Create: `docker-compose.yml` (repo root)
- Create: `.gitignore` (repo root)
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `backend/runtime.txt`
- Create: `backend/.env.example`
- Create: `backend/manage.py`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/config/storage_backends.py`
- Create: `backend/apps/__init__.py`
- Create: `backend/apps/users/__init__.py`
- Create: `backend/apps/users/apps.py`
- Create: `backend/apps/users/models.py`
- Create: `backend/apps/users/migrations/__init__.py`
- Test: `backend/apps/users/tests.py`

**Interfaces:**

- Produces: `apps.users.models.User` — extends `AbstractUser`, adds `is_verified: BooleanField(default=False)`. `AUTH_USER_MODEL = "users.User"`.
- Produces: `config.storage_backends.public_storage()` and `config.storage_backends.private_storage()` — zero-arg callables returning a `Storage` instance (R2-backed in normal runs, local `FileSystemStorage` under `manage.py test`). Later tasks pass these callables (not instances) as `storage=` on `ImageField`s.
- Produces: docker-compose services `db` (Postgres+PostGIS, host `db` inside the network), `redis` (host `redis`), `web` (Django, port 8000). All later backend commands run as `docker-compose run --rm web <command>`.

- [ ] **Step 1: Create `.gitignore`**

```gitignore
# Python
__pycache__/
*.pyc
backend/staticfiles/
backend/test-media/
backend/.env

# Node
frontend/node_modules/
frontend/.next/
frontend/out/

# OS
.DS_Store
```

- [ ] **Step 2: Create `backend/requirements.txt`**

```text
Django>=5.0,<5.1
djangorestframework>=3.15,<3.16
django-allauth>=0.57,<0.63
django-cors-headers>=4.4,<4.5
django-environ>=0.11,<0.12
django-storages[s3]>=1.14,<1.15
psycopg2-binary>=2.9,<3.0
Pillow>=10.4,<10.5
boto3>=1.34,<2.0
gunicorn>=22.0,<23.0
whitenoise>=6.7,<6.8
```

Note: `django-allauth` is pinned below 0.63, which renamed `ACCOUNT_AUTHENTICATION_METHOD`/`ACCOUNT_EMAIL_REQUIRED`/`ACCOUNT_USERNAME_REQUIRED` to `ACCOUNT_LOGIN_METHODS`/`ACCOUNT_SIGNUP_FIELDS`. If upgrading past 0.63 later, migrate those settings names in `config/settings.py` (Task 3) accordingly.

- [ ] **Step 3: Create `backend/runtime.txt`**

```text
python-3.12.6
```

- [ ] **Step 4: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gdal-bin \
        libgdal-dev \
        libgeos-dev \
        libproj-dev \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

- [ ] **Step 5: Create `docker-compose.yml` at repo root**

```yaml
version: "3.9"
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: sqftex
      POSTGRES_USER: sqftex
      POSTGRES_PASSWORD: sqftex
    ports:
      - "5432:5432"
    volumes:
      - sqftex_pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  web:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - db
      - redis
volumes:
  sqftex_pgdata:
```

- [ ] **Step 6: Create `backend/.env.example`**

```text
DEBUG=True
SECRET_KEY=dev-only-secret-change-me
DATABASE_URL=postgis://sqftex:sqftex@db:5432/sqftex
REDIS_URL=redis://redis:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=sqftex-media
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=
```

- [ ] **Step 7: Copy it to a real local `.env`**

```bash
cp backend/.env.example backend/.env
```

`backend/.env` is gitignored (Step 1). The placeholder R2 values are fine for local dev — Task 1's tests never touch real storage (see `storage_backends.py` below).

- [ ] **Step 8: Create `backend/manage.py`**

```python
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
```

- [ ] **Step 9: Create empty `backend/config/__init__.py`**

- [ ] **Step 10: Create `backend/config/storage_backends.py`**

```python
import sys

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage

TESTING = "test" in sys.argv

class PublicMediaStorage(S3Boto3Storage):
    location = "public"
    default_acl = "public-read"
    file_overwrite = False
    querystring_auth = False

class PrivateMediaStorage(S3Boto3Storage):
    location = "private"
    default_acl = "private"
    file_overwrite = False
    querystring_auth = True

def public_storage():
    if TESTING:
        return FileSystemStorage(location=str(settings.BASE_DIR / "test-media" / "public"))
    return PublicMediaStorage()

def private_storage():
    if TESTING:
        return FileSystemStorage(location=str(settings.BASE_DIR / "test-media" / "private"))
    return PrivateMediaStorage()
```

Fields pass `storage=public_storage` or `storage=private_storage` (the function itself, not called) — Django evaluates a `storage=` callable lazily each time it's needed, which is what makes the `TESTING` branch take effect during `manage.py test`.

- [ ] **Step 11: Create `backend/config/settings.py`**

```python
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.contrib.gis",
    "rest_framework",
    "corsheaders",
    "allauth",
    "allauth.account",
    "apps.users.apps.UsersConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": env.db("DATABASE_URL")}

AUTH_USER_MODEL = "users.User"

AUTHENTICATION_BACKENDS = [
    "allauth.account.auth_backends.AuthenticationBackend",
    "django.contrib.auth.backends.ModelBackend",
]

SITE_ID = 1
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kuala_Lumpur"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Cloudflare R2 (S3-compatible) — used by config.storage_backends
AWS_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("R2_BUCKET_NAME", default="")
AWS_S3_ENDPOINT_URL = env("R2_ENDPOINT_URL", default="")
AWS_S3_REGION_NAME = "auto"
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "virtual"
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
_r2_public_base = env("R2_PUBLIC_BASE_URL", default="")
AWS_S3_CUSTOM_DOMAIN = (
    _r2_public_base.replace("https://", "").replace("http://", "") or None
)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

- [ ] **Step 12: Create `backend/config/urls.py`**

```python
from django.contrib import admin
from django.urls import path

urlpatterns = [
    path("admin/", admin.site.urls),
    # apps.users.urls wired in during Task 3
    # apps.listings.urls wired in during Task 6
]
```

- [ ] **Step 13: Create `backend/config/wsgi.py`**

```python
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
```

- [ ] **Step 14: Create empty `backend/apps/__init__.py`**

- [ ] **Step 15: Create empty `backend/apps/users/__init__.py`**

- [ ] **Step 16: Create `backend/apps/users/apps.py`**

```python
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    label = "users"
```

- [ ] **Step 17: Write the failing test for the User model**

Create `backend/apps/users/tests.py`:

```python
from django.test import TestCase

from .models import User

class UserModelTests(TestCase):
    def test_new_user_defaults_to_unverified(self):
        user = User.objects.create_user(
            email="host@example.com", username="host1", password="Str0ngPassw0rd!"
        )
        self.assertFalse(user.is_verified)
```

- [ ] **Step 18: Build the Docker image and run the test to verify it fails**

```bash
docker-compose build web
docker-compose run --rm web python manage.py test apps.users
```

Expected: FAIL — `apps.users.models` has no `User` yet (or `AUTH_USER_MODEL` app isn't installed / no such module).

- [ ] **Step 19: Create `backend/apps/users/models.py`**

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.email or self.username
```

- [ ] **Step 20: Create empty `backend/apps/users/migrations/__init__.py`**

- [ ] **Step 21: Generate and apply the migration, then run the test to verify it passes**

```bash
docker-compose run --rm web python manage.py makemigrations users --name initial
docker-compose run --rm web python manage.py migrate
docker-compose run --rm web python manage.py test apps.users
```

Expected: PASS. Also confirm `docker-compose run --rm web python manage.py check` reports no issues.

- [ ] **Step 22: Commit**

```bash
git add .gitignore docker-compose.yml backend/
git commit -m "Scaffold Django backend, Docker dev environment, and custom User model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: IdentityVerification Model + Admin Approve/Reject

**Files:**

- Create: `backend/apps/users/models.py` (append `IdentityVerification`)
- Create: `backend/apps/users/admin.py`
- Modify: `backend/apps/users/tests.py` (append)

**Interfaces:**

- Consumes: `apps.users.models.User` (Task 1), `config.storage_backends.private_storage` (Task 1).
- Produces: `apps.users.models.IdentityVerification` with fields `user` (FK to `User`), `nric_photo` (`ImageField`), `status` (`IdentityVerification.Status`: `PENDING` / `APPROVED` / `REJECTED`), `reviewed_by`, `reviewed_at`, `notes`, `created_at`.
- Produces: `apps.users.admin.approve_verifications(modeladmin, request, queryset)` — sets each verification to `APPROVED`, stamps `reviewed_by`/`reviewed_at`, and flips the related `User.is_verified` to `True`. Task 4's `VerificationUploadView` and Task 5/6's listing-creation gate both depend on `User.is_verified` being set this way.

- [ ] **Step 1: Write the failing test**

Append to `backend/apps/users/tests.py`:

```python
from django.utils import timezone

from .admin import approve_verifications
from .models import IdentityVerification

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
```

`User` and `TestCase` are already imported at the top of `tests.py` from Task 1 — add `from django.utils import timezone` and the two new imports shown above alongside them.

- [ ] **Step 2: Run the test to verify it fails**

```bash
docker-compose run --rm web python manage.py test apps.users.tests.IdentityVerificationAdminTests
```

Expected: FAIL — no `IdentityVerification` model / no `admin.py` yet.

- [ ] **Step 3: Append `IdentityVerification` to `backend/apps/users/models.py`**

```python
from config.storage_backends import private_storage

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
```

Add the `from config.storage_backends import private_storage` import at the top of the file, next to the existing `django.db.models` import.

- [ ] **Step 4: Create `backend/apps/users/admin.py`**

```python
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
```

- [ ] **Step 5: Generate and apply the migration, then run the test to verify it passes**

```bash
docker-compose run --rm web python manage.py makemigrations users --name identity_verification
docker-compose run --rm web python manage.py migrate
docker-compose run --rm web python manage.py test apps.users
```

Expected: PASS (both `UserModelTests` and `IdentityVerificationAdminTests`).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/users/
git commit -m "Add IdentityVerification model and admin approve/reject actions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Auth API (register, login, logout, me, CSRF)

**Files:**

- Create: `backend/apps/users/serializers.py`
- Create: `backend/apps/users/views.py`
- Create: `backend/apps/users/urls.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/apps/users/tests.py` (append)

**Interfaces:**

- Consumes: `apps.users.models.User` (Task 1).
- Produces: `apps.users.serializers.UserSerializer` (fields `id`, `email`, `username`, `is_verified`), `RegisterSerializer`, `LoginSerializer`.
- Produces: URL names `csrf`, `register`, `login`, `logout`, `me` under `/api/v1/users/auth/...` and `/api/v1/users/me/`. Task 4's `VerificationUploadView` is added to this same `urls.py`. Task 8 (frontend) calls `GET /api/v1/users/auth/csrf/`, `POST /api/v1/users/auth/login/`, `GET /api/v1/users/me/` by these exact paths.

- [ ] **Step 1: Write the failing tests**

Append to `backend/apps/users/tests.py`:

```python
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
docker-compose run --rm web python manage.py test apps.users.tests.AuthAPITests
```

Expected: FAIL — no `register`/`login`/`me` URL names exist yet.

- [ ] **Step 3: Create `backend/apps/users/serializers.py`**

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "is_verified"]
        read_only_fields = ["id", "is_verified"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["email", "username", "password"]

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
        )

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
```

- [ ] **Step 4: Create `backend/apps/users/views.py`**

```python
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

class CSRFView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user, backend="allauth.account.auth_backends.AuthenticationBackend")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        return Response(UserSerializer(user).data)

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
```

- [ ] **Step 5: Create `backend/apps/users/urls.py`**

```python
from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf/", views.CSRFView.as_view(), name="csrf"),
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
]
```

- [ ] **Step 6: Wire the users app into `backend/config/urls.py`**

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/users/", include("apps.users.urls")),
    # apps.listings.urls wired in during Task 6
]
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
docker-compose run --rm web python manage.py test apps.users
```

Expected: PASS — all of `UserModelTests`, `IdentityVerificationAdminTests`, `AuthAPITests`.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/users/ backend/config/urls.py
git commit -m "Add auth API: register, login, logout, me, CSRF

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: NRIC Verification Upload API

**Files:**

- Modify: `backend/apps/users/serializers.py` (append)
- Modify: `backend/apps/users/views.py` (append)
- Modify: `backend/apps/users/urls.py` (append)
- Modify: `backend/apps/users/tests.py` (append)

**Interfaces:**

- Consumes: `apps.users.models.IdentityVerification` (Task 2).
- Produces: `POST /api/v1/users/verification/` (URL name `verification-upload`) — authenticated multipart upload, creates a `pending` `IdentityVerification` for `request.user`, rejects with 400 if one is already pending. Task 8 (frontend) is not built against this endpoint this slice (the manual e2e check in Task 8 uses Django admin for approval, not a frontend upload UI), but the endpoint is exercised directly by tests here.

- [ ] **Step 1: Write the failing tests**

Append to `backend/apps/users/tests.py`:

```python
from django.core.files.uploadedfile import SimpleUploadedFile

class VerificationUploadAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="host@example.com", username="host1", password="Str0ngPassw0rd!"
        )
        self.client.force_authenticate(user=self.user)

    def _photo(self):
        return SimpleUploadedFile("nric.jpg", b"fake-image-bytes", content_type="image/jpeg")

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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
docker-compose run --rm web python manage.py test apps.users.tests.VerificationUploadAPITests
```

Expected: FAIL — no `verification-upload` URL name yet.

- [ ] **Step 3: Append to `backend/apps/users/serializers.py`**

```python
from .models import IdentityVerification

class IdentityVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentityVerification
        fields = ["id", "nric_photo", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]
```

- [ ] **Step 4: Append to `backend/apps/users/views.py`**

```python
from rest_framework.parsers import MultiPartParser

from .models import IdentityVerification
from .serializers import IdentityVerificationSerializer

class VerificationUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if IdentityVerification.objects.filter(
            user=request.user, status=IdentityVerification.Status.PENDING
        ).exists():
            return Response(
                {"detail": "A verification request is already pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = IdentityVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

- [ ] **Step 5: Append to `backend/apps/users/urls.py`**

```python
    path("verification/", views.VerificationUploadView.as_view(), name="verification-upload"),
```

Add this line inside the existing `urlpatterns` list.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
docker-compose run --rm web python manage.py test apps.users
```

Expected: PASS — full `apps.users` test suite green.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/users/
git commit -m "Add NRIC verification upload API

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Listing + ListingPhoto Models

**Files:**

- Modify: `backend/config/settings.py` (add `apps.listings` to `INSTALLED_APPS`)
- Create: `backend/apps/listings/__init__.py`
- Create: `backend/apps/listings/apps.py`
- Create: `backend/apps/listings/models.py`
- Create: `backend/apps/listings/admin.py`
- Create: `backend/apps/listings/migrations/__init__.py`
- Test: `backend/apps/listings/tests.py`

**Interfaces:**

- Consumes: `apps.users.models.User` (Task 1, via `settings.AUTH_USER_MODEL`), `config.storage_backends.public_storage` (Task 1).
- Produces: `apps.listings.models.Listing` — `owner` (FK to `User`), `title`, `description`, `category` (`Listing.Category`), `size_sqft`, `price_cents` (int, MYR sen), `price_unit` (`Listing.PriceUnit`: `DAILY`/`MONTHLY`), `location` (`PointField`, geography), `address`, `access_rules`, `prohibited_items`, `status` (`Listing.Status`: `DRAFT`/`ACTIVE`), `created_at`, `updated_at`, and property `has_photos: bool`.
- Produces: `apps.listings.models.ListingPhoto` — `listing` (FK to `Listing`, `related_name="photos"`), `image`, `order`.
- Task 6 imports `Listing` and `ListingPhoto` directly.

- [ ] **Step 1: Add the listings app to `INSTALLED_APPS`**

In `backend/config/settings.py`, change:

```python
    "apps.users.apps.UsersConfig",
]
```

to:

```python
    "apps.users.apps.UsersConfig",
    "apps.listings.apps.ListingsConfig",
]
```

- [ ] **Step 2: Create empty `backend/apps/listings/__init__.py`**

- [ ] **Step 3: Create `backend/apps/listings/apps.py`**

```python
from django.apps import AppConfig

class ListingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.listings"
    label = "listings"
```

- [ ] **Step 4: Write the failing test**

Create `backend/apps/listings/tests.py`:

```python
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
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
docker-compose run --rm web python manage.py test apps.listings
```

Expected: FAIL — `apps.listings` has no models yet (or the app isn't installed).

- [ ] **Step 6: Create `backend/apps/listings/models.py`**

```python
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
```

- [ ] **Step 7: Create `backend/apps/listings/admin.py`**

```python
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
```

- [ ] **Step 8: Create empty `backend/apps/listings/migrations/__init__.py`**

- [ ] **Step 9: Generate and apply the migration, then run the test to verify it passes**

```bash
docker-compose run --rm web python manage.py makemigrations listings --name initial
docker-compose run --rm web python manage.py migrate
docker-compose run --rm web python manage.py test apps.listings
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/config/settings.py backend/apps/listings/
git commit -m "Add Listing and ListingPhoto models

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Listings API (create, list, retrieve, publish, photo upload)

**Files:**

- Create: `backend/apps/listings/serializers.py`
- Create: `backend/apps/listings/views.py`
- Create: `backend/apps/listings/urls.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/apps/listings/tests.py` (append)

**Interfaces:**

- Consumes: `apps.listings.models.Listing`, `apps.listings.models.ListingPhoto` (Task 5); `request.user.is_verified` (Task 1/2).
- Produces: `apps.listings.serializers.ListingSerializer`, `ListingPhotoSerializer`.
- Produces: `/api/v1/listings/` (DRF router, `basename="listing"`) — `GET` list/retrieve public for active listings (plus the owner's own drafts when authenticated), `POST` create (verified owners only), `POST /api/v1/listings/{id}/photos/` add a photo, `POST /api/v1/listings/{id}/publish/` move `draft` → `active` (requires ≥1 photo). Task 8 (frontend) calls these four exact paths/methods.

- [ ] **Step 1: Write the failing tests**

Append to `backend/apps/listings/tests.py`:

```python
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

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

        photo = SimpleUploadedFile("room.jpg", b"fake-bytes", content_type="image/jpeg")
        self.client.post(
            f"/api/v1/listings/{listing_id}/photos/", {"image": photo}, format="multipart"
        )
        publish_response = self.client.post(f"/api/v1/listings/{listing_id}/publish/")
        self.assertEqual(publish_response.status_code, 200)
        self.assertEqual(publish_response.data["status"], Listing.Status.ACTIVE)
```

`Point`, `Listing`, and `User` are already imported at the top of `tests.py` from Task 5 (`User` via `from apps.users.models import User` — this import already exists there too since Task 5's test used it indirectly through `self.owner`; if it's not already a top-level import, add `from apps.users.models import User` alongside the existing imports).

- [ ] **Step 2: Run the tests to verify they fail**

```bash
docker-compose run --rm web python manage.py test apps.listings.tests.ListingAPITests
```

Expected: FAIL — `/api/v1/listings/` doesn't exist yet.

- [ ] **Step 3: Create `backend/apps/listings/serializers.py`**

```python
from django.contrib.gis.geos import Point
from rest_framework import serializers

from .models import Listing, ListingPhoto

class ListingPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingPhoto
        fields = ["id", "image", "order"]

class ListingSerializer(serializers.ModelSerializer):
    photos = ListingPhotoSerializer(many=True, read_only=True)
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    latitude = serializers.FloatField(write_only=True, min_value=-90, max_value=90)
    longitude = serializers.FloatField(write_only=True, min_value=-180, max_value=180)
    location_lat = serializers.SerializerMethodField()
    location_lng = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id", "owner", "title", "description", "category", "size_sqft",
            "price_cents", "price_unit", "address", "access_rules",
            "prohibited_items", "status", "photos",
            "latitude", "longitude", "location_lat", "location_lng",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "status", "photos", "created_at", "updated_at"]

    def get_location_lat(self, obj):
        return obj.location.y

    def get_location_lng(self, obj):
        return obj.location.x

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance is None and not request.user.is_verified:
            raise serializers.ValidationError(
                "Only ID-verified hosts can create a listing."
            )
        return attrs

    def create(self, validated_data):
        lat = validated_data.pop("latitude")
        lng = validated_data.pop("longitude")
        validated_data["location"] = Point(lng, lat)
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)
```

- [ ] **Step 4: Create `backend/apps/listings/views.py`**

```python
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Listing
from .serializers import ListingPhotoSerializer, ListingSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner_id == request.user.id

class ListingViewSet(viewsets.ModelViewSet):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        base = Listing.objects.select_related("owner").prefetch_related("photos")
        if self.action in ("list", "retrieve"):
            if self.request.user.is_authenticated:
                return base.filter(Q(status=Listing.Status.ACTIVE) | Q(owner=self.request.user))
            return base.filter(status=Listing.Status.ACTIVE)
        return base.filter(owner=self.request.user)

    @action(detail=True, methods=["post"], url_path="photos")
    def add_photo(self, request, pk=None):
        listing = self.get_object()
        serializer = ListingPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(listing=listing, order=listing.photos.count())
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        listing = self.get_object()
        if not listing.has_photos:
            return Response(
                {"detail": "Add at least one photo before publishing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        listing.status = Listing.Status.ACTIVE
        listing.save(update_fields=["status"])
        return Response(ListingSerializer(listing, context={"request": request}).data)
```

- [ ] **Step 5: Create `backend/apps/listings/urls.py`**

```python
from rest_framework.routers import DefaultRouter

from .views import ListingViewSet

router = DefaultRouter()
router.register("", ListingViewSet, basename="listing")

urlpatterns = router.urls
```

- [ ] **Step 6: Wire the listings app into `backend/config/urls.py`**

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/listings/", include("apps.listings.urls")),
]
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
docker-compose run --rm web python manage.py test apps.listings
docker-compose run --rm web python manage.py test apps.users
```

Expected: PASS — full backend test suite green.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/listings/ backend/config/urls.py
git commit -m "Add Listings API: create, list, retrieve, publish, photo upload

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Frontend Scaffolding + Typed API Client

**Files:**

- Create: `frontend/` (via `create-next-app`)
- Create: `frontend/lib/api/client.ts`
- Create: `frontend/lib/api/users.ts`
- Create: `frontend/lib/api/listings.ts`

**Interfaces:**

- Produces: `apiFetch<T>(path, options)` and `ensureCsrfCookie()` in `lib/api/client.ts` — every other frontend API call goes through `apiFetch`.
- Produces: `getMe()`, `login(email, password)` in `lib/api/users.ts`; `User` type (`id`, `email`, `username`, `is_verified`).
- Produces: `listListings()`, `getListing(id)`, `createListing(input)`, `addListingPhoto(listingId, file)`, `publishListing(listingId)` in `lib/api/listings.ts`; `Listing`, `ListingPhoto`, `CreateListingInput` types. Task 8's pages and components import these directly.
- Consumes: the exact endpoint paths produced by Tasks 3 and 6 (`/api/v1/users/auth/*`, `/api/v1/users/me/`, `/api/v1/listings/...`).

- [ ] **Step 1: Scaffold the Next.js app**

```bash
npx create-next-app@14 frontend --typescript --eslint --app --src-dir=false --import-alias "@/*" --no-tailwind --use-npm
```

- [ ] **Step 2: Add the backend base URL env var**

Create `frontend/.env.local`:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

- [ ] **Step 3: Create `frontend/lib/api/client.ts`**

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = readCookie("csrftoken");
    if (csrfToken) headers.set("X-CSRFToken", csrfToken);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function ensureCsrfCookie(): Promise<void> {
  await apiFetch("/api/v1/users/auth/csrf/");
}
```

- [ ] **Step 4: Create `frontend/lib/api/users.ts`**

```typescript
import { apiFetch } from "./client";

export interface User {
  id: number;
  email: string;
  username: string;
  is_verified: boolean;
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/api/v1/users/me/");
}

export async function login(email: string, password: string): Promise<User> {
  return apiFetch<User>("/api/v1/users/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
```

- [ ] **Step 5: Create `frontend/lib/api/listings.ts`**

```typescript
import { apiFetch } from "./client";

export interface ListingPhoto {
  id: number;
  image: string;
  order: number;
}

export interface Listing {
  id: number;
  owner: number;
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number;
  price_unit: "daily" | "monthly";
  address: string;
  access_rules: string;
  prohibited_items: string;
  status: "draft" | "active";
  photos: ListingPhoto[];
  location_lat: number;
  location_lng: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  size_sqft: number;
  price_cents: number;
  price_unit: "daily" | "monthly";
  address: string;
  access_rules: string;
  prohibited_items: string;
  latitude: number;
  longitude: number;
}

export async function listListings(): Promise<Listing[]> {
  return apiFetch<Listing[]>("/api/v1/listings/");
}

export async function getListing(id: number): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${id}/`);
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  return apiFetch<Listing>("/api/v1/listings/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function addListingPhoto(listingId: number, file: File): Promise<ListingPhoto> {
  const formData = new FormData();
  formData.append("image", file);
  return apiFetch<ListingPhoto>(`/api/v1/listings/${listingId}/photos/`, {
    method: "POST",
    body: formData,
  });
}

export async function publishListing(listingId: number): Promise<Listing> {
  return apiFetch<Listing>(`/api/v1/listings/${listingId}/publish/`, {
    method: "POST",
  });
}
```

- [ ] **Step 6: Verify the scaffold builds and type-checks**

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all three succeed with no errors (no automated frontend tests are introduced this slice, per spec §8 — type-check + lint + build stand in as this task's verification gate).

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "Scaffold Next.js frontend and typed API client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Frontend Pages — Login, Listing Create, Public Listing View

**Files:**

- Create: `frontend/components/listings/ListingCard.tsx`
- Create: `frontend/components/listings/ListingForm.tsx`
- Create: `frontend/app/listings/page.tsx`
- Create: `frontend/app/listings/[id]/page.tsx`
- Create: `frontend/app/listings/new/page.tsx`
- Create: `frontend/app/login/page.tsx`

**Interfaces:**

- Consumes: everything produced in Task 7 (`apiFetch`, `ensureCsrfCookie`, `getMe`, `login`, `listListings`, `getListing`, `createListing`, `addListingPhoto`, `publishListing`, and the `User`/`Listing`/`ListingPhoto`/`CreateListingInput` types).

**Scope note:** no `/register` page is built this slice — a tester creates an account through DRF's browsable API at `http://localhost:8000/api/v1/users/auth/register/` (it renders an HTML form automatically), then verification is approved via `http://localhost:8000/admin/`. This keeps the frontend scope to what actually proves the slice (login → create listing → view it publicly) without duplicating registration UI that has no other consumer yet.

- [ ] **Step 1: Create `frontend/components/listings/ListingCard.tsx`**

```typescript
import Link from "next/link";
import type { Listing } from "@/lib/api/listings";

function formatPrice(listing: Listing): string {
  const ringgit = (listing.price_cents / 100).toFixed(2);
  const unit = listing.price_unit === "daily" ? "/day" : "/month";
  return `RM ${ringgit}${unit}`;
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <h3>{listing.title}</h3>
      <p>{listing.address}</p>
      <p>
        {listing.size_sqft} sqft &middot; {formatPrice(listing)}
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Create `frontend/app/listings/page.tsx`**

```typescript
import { listListings } from "@/lib/api/listings";
import { ListingCard } from "@/components/listings/ListingCard";

export default async function ListingsPage() {
  const listings = await listListings();

  return (
    <main>
      <h1>Available space</h1>
      {listings.length === 0 ? (
        <p>No listings yet.</p>
      ) : (
        <div>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Create `frontend/app/listings/[id]/page.tsx`**

```typescript
import { getListing } from "@/lib/api/listings";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await getListing(Number(params.id));

  return (
    <main>
      <h1>{listing.title}</h1>
      <p>{listing.address}</p>
      <p>
        {listing.size_sqft} sqft &middot; RM {(listing.price_cents / 100).toFixed(2)}{" "}
        {listing.price_unit === "daily" ? "/day" : "/month"}
      </p>
      <p>{listing.description}</p>
      <div>
        {listing.photos.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={photo.id} src={photo.image} alt={listing.title} />
        ))}
      </div>
      <section>
        <h2>Access rules</h2>
        <p>{listing.access_rules || "Coordinate access directly with the host."}</p>
      </section>
      <section>
        <h2>Prohibited items</h2>
        <p>{listing.prohibited_items || "None specified."}</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Create `frontend/components/listings/ListingForm.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addListingPhoto, createListing, publishListing } from "@/lib/api/listings";
import { ensureCsrfCookie } from "@/lib/api/client";

export function ListingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ensureCsrfCookie();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const photoFile = data.get("photo") as File;

    try {
      const listing = await createListing({
        title: String(data.get("title")),
        description: String(data.get("description")),
        category: String(data.get("category")),
        size_sqft: Number(data.get("size_sqft")),
        price_cents: Math.round(Number(data.get("price_myr")) * 100),
        price_unit: data.get("price_unit") as "daily" | "monthly",
        address: String(data.get("address")),
        access_rules: String(data.get("access_rules") ?? ""),
        prohibited_items: String(data.get("prohibited_items") ?? ""),
        latitude: Number(data.get("latitude")),
        longitude: Number(data.get("longitude")),
      });

      if (photoFile && photoFile.size > 0) {
        await addListingPhoto(listing.id, photoFile);
      }

      await publishListing(listing.id);
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong creating the listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}
      <label>
        Title
        <input name="title" required />
      </label>
      <label>
        Description
        <textarea name="description" required />
      </label>
      <label>
        Category
        <select name="category" required>
          <option value="spare_room">Spare room</option>
          <option value="garage">Garage</option>
          <option value="shoplot_back_room">Shoplot back room</option>
          <option value="warehouse_bay">Warehouse bay</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Size (sqft)
        <input name="size_sqft" type="number" min="1" required />
      </label>
      <label>
        Price (MYR)
        <input name="price_myr" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Price unit
        <select name="price_unit" required>
          <option value="monthly">Monthly</option>
          <option value="daily">Daily</option>
        </select>
      </label>
      <label>
        Address
        <input name="address" required />
      </label>
      <label>
        Latitude
        <input name="latitude" type="number" step="any" required />
      </label>
      <label>
        Longitude
        <input name="longitude" type="number" step="any" required />
      </label>
      <label>
        Access rules
        <textarea name="access_rules" />
      </label>
      <label>
        Prohibited items
        <textarea name="prohibited_items" />
      </label>
      <label>
        Photo
        <input name="photo" type="file" accept="image/*" />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create listing"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create `frontend/app/listings/new/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ListingForm } from "@/components/listings/ListingForm";
import type { User } from "@/lib/api/users";

async function fetchMe(): Promise<User | null> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/v1/users/me/`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as User) : null;
  } catch {
    return null;
  }
}

export default async function NewListingPage() {
  const me = await fetchMe();

  if (!me) {
    redirect("/login?next=/listings/new");
  }

  if (!me.is_verified) {
    return (
      <main>
        <h1>Verification required</h1>
        <p>
          You need to complete ID verification before you can create a listing. Upload your NRIC
          and wait for approval.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Create a listing</h1>
      <ListingForm />
    </main>
  );
}
```

`fetchMe` duplicates `getMe()`'s endpoint (`/api/v1/users/me/`) rather than calling it directly, because `getMe`/`apiFetch` read `document.cookie`, which doesn't exist in a Server Component — the session cookie has to be forwarded explicitly via `next/headers`' `cookies()` instead.

- [ ] **Step 6: Create `frontend/app/login/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/users";
import { ensureCsrfCookie } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureCsrfCookie();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      await login(String(data.get("email")), String(data.get("password")));
      router.push("/listings/new");
    } catch {
      setError("Invalid email or password.");
    }
  }

  return (
    <main>
      <h1>Log in</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <button type="submit">Log in</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Type-check, lint, and build**

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all three succeed with no errors.

- [ ] **Step 8: Manual end-to-end verification**

With `docker-compose up` running (backend on :8000) and `npm run dev` running in `frontend/` (:3000):

1. Create a superuser for admin access: `docker-compose run --rm web python manage.py createsuperuser`.
2. In a browser, go to `http://localhost:8000/api/v1/users/auth/register/` and use the browsable API form to register a test host account.
3. Log in at `http://localhost:8000/admin/` as the superuser, open the new `IdentityVerification`... — actually there won't be one yet, since no upload UI exists; instead go to the `User` in `/admin/`, and manually tick `is_verified` and save (this is a legitimate admin-only stand-in for the review step, since the upload endpoint from Task 4 has no frontend UI this slice).
4. Go to `http://localhost:3000/login`, log in with the test host account.
5. Get redirected to `/listings/new`, fill in the form (including a photo), submit.
6. Confirm redirect to `/listings/{id}` shows the new listing with its photo.
7. Go to `http://localhost:3000/listings` in a private/incognito window (no session) and confirm the listing is publicly visible.

Expected: all seven steps succeed, proving the slice end-to-end.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "Add login, listing creation, and public listing view pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Deployment Config (Railway) + Env Var Documentation

**Files:**

- Create: `backend/Procfile`
- Modify: `README.md`

**Interfaces:**

- Consumes: `backend/config/settings.py` (Task 1) — `Procfile` runs the same app that setting file configures; no new settings introduced.

- [ ] **Step 1: Create `backend/Procfile`**

```text
web: python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn config.wsgi --bind 0.0.0.0:$PORT --log-file -
```

Railway auto-detects this via Nixpacks for the backend service. The frontend service needs no `Procfile` — Railway's Nixpacks detects `next build`/`next start` from `frontend/package.json` automatically.

- [ ] **Step 2: Verify the deploy-mode settings check passes**

```bash
docker-compose run --rm -e DEBUG=False web python manage.py check --deploy
```

Expected: it may list warnings (e.g. about `SECURE_*` headers) since local `.env` uses dev-only values — that's expected at this stage; confirm it does not report any *errors* (only warnings), and read through the warnings once to confirm none are surprising.

- [ ] **Step 3: Document deployment env vars in `README.md`**

Replace the current `README.md` content:

````markdown
# sqftex

Microwarehousing marketplace — Malaysia launch. See `docs/PRD.md` for the
product spec and `CLAUDE.md` for stack/conventions.

## Local development

Requires Docker Desktop (the backend runs containerized — see
`docs/superpowers/plans/2026-08-23-foundations-listing-slice.md` for why).

```bash
cp backend/.env.example backend/.env   # fill in local values
docker-compose up
```

Backend: <http://localhost:8000>. Frontend (run separately):

```bash
cd frontend
npm install
npm run dev
```

Frontend: <http://localhost:3000>.

## Deployment (Railway)

Two Railway services, deployed from this repo:

- **Backend** (`backend/`): Django + gunicorn, via `backend/Procfile`.
  Needs a managed Postgres instance with the PostGIS extension enabled.
- **Frontend** (`frontend/`): Next.js, auto-detected by Nixpacks.

### Backend environment variables

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key (generate a real one for production, never reuse the local dev value) |
| `DEBUG` | Must be `False` in production |
| `DATABASE_URL` | `postgis://user:pass@host:5432/dbname` — Railway's managed Postgres, PostGIS extension enabled |
| `ALLOWED_HOSTS` | Backend's public Railway domain |
| `CORS_ALLOWED_ORIGINS` | Frontend's public Railway domain (with scheme, no trailing slash) |
| `CSRF_TRUSTED_ORIGINS` | Same as `CORS_ALLOWED_ORIGINS` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API credentials |
| `R2_BUCKET_NAME` | R2 bucket for listing photos + NRIC uploads |
| `R2_ENDPOINT_URL` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | Public CDN domain for the `public/` prefix (listing photos only — NRIC uploads stay private, never expose this for the `private/` prefix) |

### Frontend environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend's public Railway domain |
````

- [ ] **Step 4: Commit**

```bash
git add backend/Procfile README.md
git commit -m "Add Railway deployment config and document env vars

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

