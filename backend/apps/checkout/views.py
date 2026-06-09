from uuid import uuid4

from django.db import transaction
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import Cart
from apps.checkout.serializers import CheckoutSerializer
from apps.orders.models import Order
from apps.orders.services import complete_sale
from apps.payments.models import PaymentTransaction


class CheckoutView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @transaction.atomic
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payload_items = serializer.validated_data.get("items")
        cart = None
        if not payload_items and request.user.is_authenticated:
            cart = Cart.objects.filter(user=request.user).prefetch_related("items__variant__product").first()
            payload_items = [
                {"variant_id": item.variant_id, "quantity": item.quantity, "unit_price": item.variant.price}
                for item in cart.items.all()
            ] if cart else []
        if not payload_items:
            return Response({"detail": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        order = complete_sale(
            user=request.user,
            number=f"ORD-{uuid4().hex[:10].upper()}",
            source=Order.Source.WEBSITE,
            status=Order.Status.PLACED,
            customer_name=serializer.validated_data["shipping_name"],
            customer_phone=serializer.validated_data["shipping_phone"],
            shipping_line1=serializer.validated_data["shipping_line1"],
            shipping_city=serializer.validated_data.get("shipping_city") or "Rawalpindi",
            shipping_country=serializer.validated_data["shipping_country"],
            payment_provider=serializer.validated_data["payment_provider"],
            payment_status=PaymentTransaction.Status.PENDING,
            payment_screenshot=serializer.validated_data.get("payment_screenshot"),
            items=payload_items,
        )
        notes = serializer.validated_data.get("notes", "").strip()
        if notes:
            order.status_events.create(from_status=order.status, to_status=order.status, note=f"Order note: {notes}")

        if cart:
            cart.items.all().delete()
        return Response({"order_id": order.id, "order_number": order.number, "tracking_id": order.tracking_id}, status=status.HTTP_201_CREATED)
