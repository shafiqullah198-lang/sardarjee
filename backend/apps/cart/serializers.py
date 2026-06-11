from decimal import Decimal
from rest_framework import serializers

from apps.cart.models import Cart, CartItem


def _resolve_image_url(obj, request):
    """Return the best image URL for a cart item's variant, falling back to product images."""
    variant = obj.variant
    product = variant.product

    # 1. Try color variant gallery images
    color_variant = variant.color_variant
    if color_variant:
        cv_img = color_variant.images.order_by("sort_order", "id").first()
        if cv_img and cv_img.image:
            url = cv_img.thumbnail.url if cv_img.thumbnail else cv_img.image.url
            return request.build_absolute_uri(url) if request else url
        # 2. Legacy single image on color variant
        if color_variant.image:
            url = color_variant.image.url
            return request.build_absolute_uri(url) if request else url

    # 3. Product default images
    product_img = product.images.order_by("sort_order", "id").first()
    if product_img and product_img.image:
        url = product_img.thumbnail.url if product_img.thumbnail else product_img.image.url
        return request.build_absolute_uri(url) if request else url

    return None


class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="variant.product.id", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    product_image = serializers.SerializerMethodField()
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    variant_color = serializers.CharField(source="variant.color", read_only=True)
    variant_size = serializers.CharField(source="variant.size", read_only=True)
    variant_fabric = serializers.CharField(source="variant.fabric", read_only=True)
    variant_is_stitched = serializers.BooleanField(source="variant.is_stitched", read_only=True)
    color_variant_id = serializers.IntegerField(source="variant.color_variant.id", read_only=True, allow_null=True)
    color_variant_name = serializers.CharField(source="variant.color_variant.color_name", read_only=True, allow_null=True)
    color_variant_hex = serializers.CharField(source="variant.color_variant.color_hex", read_only=True, allow_null=True)
    unit_price = serializers.DecimalField(source="variant.price", max_digits=12, decimal_places=2, read_only=True)
    sale_price = serializers.DecimalField(source="variant.sale_price", max_digits=12, decimal_places=2, read_only=True, allow_null=True)
    line_total = serializers.SerializerMethodField()
    stock = serializers.IntegerField(source="variant.stock", read_only=True)

    class Meta:
        model = CartItem
        fields = (
            "id",
            "variant",
            "product_id",
            "product_name",
            "product_image",
            "variant_sku",
            "variant_color",
            "variant_size",
            "variant_fabric",
            "variant_is_stitched",
            "color_variant_id",
            "color_variant_name",
            "color_variant_hex",
            "unit_price",
            "sale_price",
            "stock",
            "quantity",
            "line_total",
        )

    def get_product_image(self, obj):
        request = self.context.get("request")
        return _resolve_image_url(obj, request)

    def get_line_total(self, obj):
        return obj.variant.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = (
            "id",
            "guest_token",
            "coupon",
            "tax_amount",
            "shipping_amount",
            "subtotal",
            "total",
            "items",
        )

    def get_items(self, obj):
        active_items_qs = obj.items.filter(variant__product__is_active=True, variant__product__archived_at__isnull=True)
        from apps.catalog.models import Product
        if hasattr(Product, "deleted_at"):
            active_items_qs = active_items_qs.filter(variant__product__deleted_at__isnull=True)
        return CartItemSerializer(active_items_qs, many=True, context=self.context).data

    def get_subtotal(self, obj):
        active_items_qs = obj.items.filter(variant__product__is_active=True, variant__product__archived_at__isnull=True)
        from apps.catalog.models import Product
        if hasattr(Product, "deleted_at"):
            active_items_qs = active_items_qs.filter(variant__product__deleted_at__isnull=True)
        return sum((item.variant.price * item.quantity for item in active_items_qs), Decimal("0.00"))

    def get_total(self, obj):
        return self.get_subtotal(obj) + obj.tax_amount + obj.shipping_amount


class CartItemMutationSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=100)

    def validate_variant_id(self, value):
        from apps.catalog.models import ProductVariant
        try:
            variant = ProductVariant.objects.select_related("product").get(id=value)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Variant does not exist.")
        if not variant.product.is_active or variant.product.archived_at is not None or (hasattr(variant.product, "deleted_at") and variant.product.deleted_at is not None):
            raise serializers.ValidationError("This product is archived and no longer active.")
        return value
