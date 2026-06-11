from rest_framework import serializers
from django.db.models import Count

from apps.catalog.models import (
    Category,
    Product,
    ProductColorVariant,
    ProductColorVariantImage,
    ProductImage,
    ProductVariant,
    ProductVariantImage,
)
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
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("image", "image_url", "thumbnail", "thumbnail_url", "alt_text", "sort_order")

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return self.get_image_url(obj)
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url


class ProductColorVariantImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductColorVariantImage
        fields = ("id", "image", "image_url", "thumbnail", "thumbnail_url", "alt_text", "sort_order")

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return self.get_image_url(obj)
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url


class ProductColorVariantSerializer(serializers.ModelSerializer):
    stock = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = ProductColorVariantImageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductColorVariant
        fields = ("id", "color_name", "color_hex", "stock", "image", "image_url", "images")

    def get_stock(self, obj):
        variants = getattr(obj, "prefetched_variants", None)
        if variants is None:
            variants = list(obj.variants.filter(is_active=True).only("stock"))
        if variants:
            return sum(max(0, variant.stock or 0) for variant in variants)
        return max(0, obj.stock or 0)

    def get_image_url(self, obj):
        prefetched_images = getattr(obj, "prefetched_images", None)
        if prefetched_images:
            first_image = prefetched_images[0]
            request = self.context.get("request")
            image_url = first_image.thumbnail.url if first_image.thumbnail else first_image.image.url
            return request.build_absolute_uri(image_url) if request else image_url
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ProductVariantImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariantImage
        fields = ("id", "image", "image_url", "thumbnail", "thumbnail_url", "alt_text", "sort_order")

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return self.get_image_url(obj)
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url


class ProductVariantSerializer(serializers.ModelSerializer):
    regular_price = serializers.SerializerMethodField()
    final_price = serializers.DecimalField(source="effective_price", max_digits=12, decimal_places=2, read_only=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    stitching = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "sku",
            "size",
            "color",
            "fabric",
            "is_stitched",
            "stitching",
            "stock",
            "cost_price",
            "regular_price",
            "final_price",
            "price",
            "price_override",
            "sale_price",
            "sale_price_override",
            "effective_price",
            "color_variant",
            "images",
            "is_active",
        )

    def get_stitching(self, obj):
        return "stitched" if obj.is_stitched else "unstitched"

    def get_regular_price(self, obj):
        return obj.price_override if obj.price_override is not None else obj.product.selling_price

    def get_stock(self, obj):
        if hasattr(obj, "inventory"):
            return max(0, obj.inventory.quantity)
        return max(0, obj.stock or 0)

    def get_images(self, obj):
        prefetched_images = getattr(obj, "prefetched_images", None)
        if prefetched_images is not None:
            images = prefetched_images
        elif obj.color_variant_id and hasattr(obj.color_variant, "prefetched_images"):
            images = obj.color_variant.prefetched_images
        elif obj.color_variant_id:
            images = obj.color_variant.images.order_by("sort_order", "id")
        else:
            images = ProductVariantImage.objects.filter(variant=obj).order_by("sort_order", "id")
        serializer = ProductVariantImageSerializer(images, many=True, context=self.context)
        return serializer.data


class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)
    color_variants = ProductColorVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    product_images = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    product_id = serializers.IntegerField(source="id", read_only=True)
    product_name = serializers.CharField(source="name", read_only=True)
    cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    regular_price = serializers.DecimalField(source="selling_price", max_digits=12, decimal_places=2, read_only=True)
    selling_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    final_price = serializers.DecimalField(source="effective_price", max_digits=12, decimal_places=2, read_only=True)
    price = serializers.DecimalField(source="base_price", max_digits=12, decimal_places=2, read_only=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    main_image = serializers.SerializerMethodField()
    default_image = serializers.SerializerMethodField()
    sku = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    is_in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    rating_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "product_id",
            "name",
            "product_name",
            "slug",
            "description",
            "category",
            "cost_price",
            "regular_price",
            "selling_price",
            "final_price",
            "price",
            "base_price",
            "main_image",
            "default_image",
            "is_on_sale",
            "discount_percent",
            "sale_price",
            "effective_price",
            "has_discount",
            "status",
            "stock",
            "sku",
            "total_stock",
            "is_in_stock",
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
            "product_images",
        )

    def get_sku(self, obj):
        variants = getattr(obj, "prefetched_variants", None)
        variant = variants[0] if variants else obj.variants.first()
        return variant.sku if variant else ""

    def _variant_queryset(self, obj):
        return getattr(obj, "prefetched_variants", None) or list(obj.variants.filter(is_active=True))

    def get_stock(self, obj):
        return self.get_total_stock(obj)

    def get_total_stock(self, obj):
        variants = self._variant_queryset(obj)
        if variants:
            total = 0
            for v in variants:
                if hasattr(v, "inventory"):
                    total += max(0, v.inventory.quantity)
                else:
                    total += max(0, v.stock or 0)
            return total
        return max(0, obj.stock or 0)

    def get_is_in_stock(self, obj):
        return self.get_total_stock(obj) > 0

    def approved_reviews(self, obj):
        return getattr(obj, "approved_reviews_prefetched", None) or obj.reviews.filter(is_hidden=False, is_spam=False)

    def get_main_image(self, obj):
        prefetched_images = getattr(obj, "prefetched_images", None)
        first_image = prefetched_images[0] if prefetched_images else ProductImage.objects.filter(product_id=obj.id).order_by("sort_order", "id").first()
        if not first_image:
            return None
        if first_image.thumbnail:
            return first_image.thumbnail.url
        return first_image.image.url

    def get_default_image(self, obj):
        return self.get_main_image(obj)

    def get_product_images(self, obj):
        images = getattr(obj, "prefetched_images", None) or ProductImage.objects.filter(product_id=obj.id).order_by("sort_order", "id")
        serializer = ProductImageSerializer(images, many=True, context=self.context)
        return serializer.data

    def get_average_rating(self, obj):
        annotated = getattr(obj, "average_rating_value", None)
        if annotated is not None:
            return round(float(annotated), 1)
        reviews = self.approved_reviews(obj)
        values = [review.rating for review in reviews]
        if not values:
            return 0
        return round(sum(values) / len(values), 1)

    def get_reviews_count(self, obj):
        annotated = getattr(obj, "reviews_count_value", None)
        if annotated is not None:
            return int(annotated)
        return len(self.approved_reviews(obj))

    def get_rating_breakdown(self, obj):
        counts = {str(score): 0 for score in range(1, 6)}
        reviews = self.approved_reviews(obj)
        if isinstance(reviews, list):
            for review in reviews:
                counts[str(review.rating)] = counts.get(str(review.rating), 0) + 1
            return counts
        rows = reviews.values("rating").annotate(count=Count("id"))
        for row in rows:
            counts[str(row["rating"])] = row["count"]
        return counts
