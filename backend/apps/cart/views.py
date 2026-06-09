from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.cart.models import Cart, CartItem
from apps.cart.serializers import CartItemMutationSerializer, CartSerializer


class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    def _get_cart(self, request):
        guest_token = request.headers.get("X-Guest-Token", "")
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
            if guest_token:
                Cart.objects.filter(guest_token=guest_token).exclude(id=cart.id).delete()
            return cart
        cart, _ = Cart.objects.get_or_create(user=None, guest_token=guest_token or "anonymous")
        return cart

    def list(self, request):
        cart = self._get_cart(request)
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def add(self, request):
        cart = self._get_cart(request)
        serializer = CartItemMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variant_id = serializer.validated_data["variant_id"]
        quantity = serializer.validated_data["quantity"]
        item, created = CartItem.objects.get_or_create(cart=cart, variant_id=variant_id, defaults={"quantity": quantity})
        if not created:
            item.quantity += quantity
            item.save(update_fields=["quantity", "updated_at"])
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def update_item(self, request):
        cart = self._get_cart(request)
        serializer = CartItemMutationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        CartItem.objects.filter(cart=cart, variant_id=serializer.validated_data["variant_id"]).update(
            quantity=serializer.validated_data["quantity"]
        )
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def remove(self, request):
        cart = self._get_cart(request)
        variant_id = request.data.get("variant_id")
        CartItem.objects.filter(cart=cart, variant_id=variant_id).delete()
        return Response(CartSerializer(cart).data)
