from rest_framework import serializers
from django.db.models import Count

from apps.catalog.models import Category, Product, ProductColorVariant, ProductImage, ProductVariant
from apps.reviews.models import Review


class CategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image", "image_url"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("image", "image_url", "alt_text", "sort_order")

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ProductColorVariantSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductColorVariant
        fields = ("id", "color_name", "color_hex", "stock", "image", "image_url")

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ("id", "sku", "size", "color", "fabric", "price")


class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)
    color_variants = ProductColorVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    price = serializers.DecimalField(source="base_price", max_digits=12, decimal_places=2, read_only=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    sku = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    rating_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "category",
            "price",
            "base_price",
            "is_on_sale",
            "discount_percent",
            "sale_price",
            "effective_price",
            "has_discount",
            "status",
            "stock",
            "sku",
            "is_featured",
            "is_trending",
            "is_new_arrival",
            "show_in_men",
            "show_in_wedding",
            "show_in_fabrics",
            "average_rating",
            "reviews_count",
            "rating_breakdown",
            "variants",
            "color_variants",
            "images",
        )

    def get_sku(self, obj):
        variant = obj.variants.first()
        return variant.sku if variant else ""

    def approved_reviews(self, obj):
        return obj.reviews.filter(is_hidden=False, is_spam=False)

    def get_average_rating(self, obj):
        reviews = self.approved_reviews(obj)
        values = list(reviews.values_list("rating", flat=True))
        if not values:
            return 0
        return round(sum(values) / len(values), 1)

    def get_reviews_count(self, obj):
        return self.approved_reviews(obj).count()

    def get_rating_breakdown(self, obj):
        rows = self.approved_reviews(obj).values("rating").annotate(count=Count("id"))
        counts = {str(score): 0 for score in range(1, 6)}
        for row in rows:
            counts[str(row["rating"])] = row["count"]
        return counts
