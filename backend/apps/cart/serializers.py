from decimal import Decimal
from rest_framework import serializers

from apps.cart.models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    unit_price = serializers.DecimalField(source="variant.price", max_digits=12, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "variant", "variant_sku", "quantity", "unit_price", "line_total")

    def get_line_total(self, obj):
        return obj.variant.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
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

    def get_subtotal(self, obj):
        return sum((item.variant.price * item.quantity for item in obj.items.all()), Decimal("0.00"))

    def get_total(self, obj):
        return self.get_subtotal(obj) + obj.tax_amount + obj.shipping_amount


class CartItemMutationSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=100)
