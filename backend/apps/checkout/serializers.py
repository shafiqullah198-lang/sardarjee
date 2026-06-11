from rest_framework import serializers


class CheckoutSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=120)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_line1 = serializers.CharField(max_length=255)
    shipping_city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Rawalpindi")
    shipping_country = serializers.CharField(max_length=100, default="Pakistan")
    payment_provider = serializers.ChoiceField(
        choices=["cash", "easypaisa", "jazzcash", "bank_transfer"], default="cash"
    )
    items = serializers.JSONField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    payment_screenshot = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        provider = attrs.get("payment_provider", "cash")
        if provider in {"easypaisa", "jazzcash", "bank_transfer"} and not attrs.get("payment_screenshot"):
            raise serializers.ValidationError({"payment_screenshot": "Payment screenshot is required for this payment method."})
        items = attrs.get("items")
        if not isinstance(items, list) or not items:
            raise serializers.ValidationError({"items": "Cart items are required."})

        from apps.catalog.models import ProductVariant
        for item in items:
            variant_id = item.get("variant_id")
            try:
                variant = ProductVariant.objects.select_related("product").get(id=variant_id)
            except ProductVariant.DoesNotExist:
                raise serializers.ValidationError({"items": f"Variant {variant_id} does not exist."})
            if not variant.product.is_active or variant.product.archived_at is not None or (hasattr(variant.product, "deleted_at") and variant.product.deleted_at is not None):
                raise serializers.ValidationError({"items": f"Product '{variant.product.name}' is archived and no longer active."})
        return attrs
