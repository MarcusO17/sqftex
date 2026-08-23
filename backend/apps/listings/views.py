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
