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
