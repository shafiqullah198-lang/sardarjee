from rest_framework import serializers

from apps.orders.models import Order, OrderItem, OrderStatusEvent


class OrderItemSerializer(serializers.ModelSerializer):
    color_variant_id = serializers.IntegerField(source="color_variant.id", read_only=True, allow_null=True)
    color_variant_name = serializers.CharField(source="color_variant.color_name", read_only=True, allow_null=True)

    class Meta:
        model = OrderItem
        fields = (
            "sku",
            "product_name",
            "color_variant_id",
            "color_variant_name",
            "unit_price",
            "unit_cost",
            "quantity",
            "line_total",
            "variant_color",
            "variant_size",
            "variant_fabric",
            "variant_is_stitched",
            "variant_image_url",
        )


class OrderStatusEventSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.number", read_only=True)

    class Meta:
        model = OrderStatusEvent
        fields = ("order_number", "from_status", "to_status", "note", "created_at")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_events = OrderStatusEventSerializer(many=True, read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    payment_screenshot_url = serializers.SerializerMethodField()
    delivery_status = serializers.CharField(source="status", read_only=True)
    customer = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "number",
            "tracking_id",
            "source",
            "status",
            "payment_status",
            "payment_method",
            "payment_screenshot",
            "payment_screenshot_url",
            "delivery_status",
            "customer",
            "subtotal",
            "discount_total",
            "tax_total",
            "shipping_total",
            "grand_total",
            "inventory_reduced",
            "refunded_at",
            "refunded_amount",
            "refund_reason",
            "created_at",
            "items",
            "status_events",
        )

    def get_payment_screenshot_url(self, obj):
        if not obj.payment_screenshot:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.payment_screenshot.url)
        return obj.payment_screenshot.url

    def get_payment_status(self, obj):
        payments = getattr(obj, "prefetched_payments", None)
        payment = payments[0] if payments else obj.payments.order_by("-created_at").first()
        return payment.status if payment else "pending"

    def get_payment_method(self, obj):
        payments = getattr(obj, "prefetched_payments", None)
        payment = payments[0] if payments else obj.payments.order_by("-created_at").first()
        return payment.provider if payment else "unknown"

    def get_customer(self, obj):
        return {
            "name": obj.shipping_name,
            "phone": obj.shipping_phone,
            "city": obj.shipping_city,
            "country": obj.shipping_country,
        }
