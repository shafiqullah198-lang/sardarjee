from django.db.models import Q, Sum
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.catalog.models import Category, Product
from apps.catalog.querysets import active_product_filter, optimized_product_queryset
from apps.catalog.serializers import CategorySerializer, ProductSerializer
from apps.common.cache import get_public_cached_payload, set_public_cached_payload
from apps.orders.models import Order
from apps.payments.models import PaymentTransaction


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True).order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def list(self, request, *args, **kwargs):
        cached = get_public_cached_payload(request, "categories")
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        set_public_cached_payload(request, "categories", response.data)
        return response

    def retrieve(self, request, *args, **kwargs):
        cached = get_public_cached_payload(request, "categories")
        if cached is not None:
            return Response(cached)
        response = super().retrieve(request, *args, **kwargs)
        set_public_cached_payload(request, "categories", response.data)
        return response


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = optimized_product_queryset(Product.objects.filter(active_product_filter())).order_by("-created_at")
        q = self.request.query_params.get("q")
        category = self.request.query_params.get("category")
        featured = self.request.query_params.get("featured")
        trending = self.request.query_params.get("trending")
        new_arrival = self.request.query_params.get("new_arrival")
        sale = self.request.query_params.get("sale")
        section = self.request.query_params.get("section")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        if category:
            qs = qs.filter(category__slug=category)
        if featured == "true":
            qs = qs.filter(is_featured=True)
        if trending == "true":
            qs = qs.filter(is_trending=True)
        if new_arrival == "true":
            qs = qs.filter(is_new_arrival=True)
        if sale == "true":
            qs = qs.filter(is_on_sale=True, discount_percent__gt=0)
        if section == "men":
            qs = qs.filter(show_in_men=True)
        if section == "wedding":
            qs = qs.filter(show_in_wedding=True)
        if section == "fabrics":
            qs = qs.filter(show_in_fabrics=True)
        return qs

    def list(self, request, *args, **kwargs):
        cached = get_public_cached_payload(request, "products")
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        set_public_cached_payload(request, "products", response.data)
        return response

    def retrieve(self, request, *args, **kwargs):
        cached = get_public_cached_payload(request, "products")
        if cached is not None:
            return Response(cached)
        response = super().retrieve(request, *args, **kwargs)
        set_public_cached_payload(request, "products", response.data)
        return response

    @action(detail=False, methods=["get"], url_path="trending")
    def trending(self, request):
        cached = get_public_cached_payload(request, "products")
        if cached is not None:
            return Response(cached)
        paid_order_ids = PaymentTransaction.objects.filter(status=PaymentTransaction.Status.SUCCESS).values("order_id")
        active_filter = active_product_filter()

        sold_products = (
            optimized_product_queryset(Product.objects.filter(
                active_filter,
                images__isnull=False,
                variants__orderitem__order__in=Order.objects.filter(
                    Q(id__in=paid_order_ids) | Q(status__in=[Order.Status.DELIVERED, Order.Status.SHIPPED])
                ),
            ))
            .annotate(total_sold=Sum("variants__orderitem__quantity"))
            .filter(total_sold__gt=0)
            .order_by("-total_sold", "-created_at")
            .distinct()[:4]
        )
        products = list(sold_products)
        if not products:
            products = list(
                optimized_product_queryset(
                    Product.objects.filter(active_filter, images__isnull=False)
                )
                .filter(Q(is_featured=True) | Q(is_trending=True))
                .order_by("-is_trending", "-is_featured", "-created_at")
                .distinct()[:4]
            )
        serializer = ProductSerializer(products, many=True, context={"request": request})
        payload = serializer.data
        set_public_cached_payload(request, "products", payload)
        return Response(payload)
