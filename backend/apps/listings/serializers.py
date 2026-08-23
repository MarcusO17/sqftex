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
