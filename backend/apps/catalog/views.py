from django.db.models import Avg, Count, Prefetch, Q, Sum
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.catalog.models import Category, Product, ProductColorVariant, ProductColorVariantImage, ProductImage, ProductVariant, ProductVariantImage
from apps.reviews.models import Review
from apps.catalog.serializers import CategorySerializer, ProductSerializer
from apps.orders.models import Order
from apps.payments.models import PaymentTransaction


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True).order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        active_filter = Q(status=Product.Status.ACTIVE, is_active=True, archived_at__isnull=True)
        if hasattr(Product, "deleted_at"):
            active_filter &= Q(deleted_at__isnull=True)

        qs = (
            Product.objects.filter(active_filter)
            .select_related("category", "brand")
            .annotate(
                average_rating_value=Avg(
                    "reviews__rating",
                    filter=Q(reviews__is_hidden=False, reviews__is_spam=False),
                ),
                reviews_count_value=Count(
                    "reviews",
                    filter=Q(reviews__is_hidden=False, reviews__is_spam=False),
                    distinct=True,
                ),
            )
            .prefetch_related(
                Prefetch(
                    "variants",
                    queryset=ProductVariant.objects.filter(is_active=True).select_related("color_variant").prefetch_related(
                        Prefetch("images", queryset=ProductVariantImage.objects.order_by("sort_order", "id"), to_attr="prefetched_images"),
                        Prefetch(
                            "color_variant__images",
                            queryset=ProductColorVariantImage.objects.order_by("sort_order", "id"),
                            to_attr="prefetched_images",
                        ),
                    ),
                    to_attr="prefetched_variants",
                ),
                Prefetch(
                    "color_variants",
                    queryset=ProductColorVariant.objects.prefetch_related(
                        Prefetch("images", queryset=ProductColorVariantImage.objects.order_by("sort_order", "id"), to_attr="prefetched_images"),
                        Prefetch("variants", queryset=ProductVariant.objects.filter(is_active=True).only("id", "stock", "color_variant_id"), to_attr="prefetched_variants"),
                    ),
                ),
            )
            .order_by("-created_at")
        )
        qs = qs.prefetch_related(
            Prefetch("images", queryset=ProductImage.objects.order_by("sort_order", "id"), to_attr="prefetched_images"),
            Prefetch(
                "reviews",
                queryset=Review.objects.filter(is_hidden=False, is_spam=False).only("id", "rating", "product_id"),
                to_attr="approved_reviews_prefetched",
            ),
        )
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

    @action(detail=False, methods=["get"], url_path="trending")
    def trending(self, request):
        paid_order_ids = PaymentTransaction.objects.filter(status=PaymentTransaction.Status.SUCCESS).values("order_id")
        active_filter = Q(status=Product.Status.ACTIVE, is_active=True, archived_at__isnull=True)
        if hasattr(Product, "deleted_at"):
            active_filter &= Q(deleted_at__isnull=True)

        sold_products = (
            Product.objects.filter(
                active_filter,
                images__isnull=False,
                variants__orderitem__order__in=Order.objects.filter(
                    Q(id__in=paid_order_ids) | Q(status__in=[Order.Status.DELIVERED, Order.Status.SHIPPED])
                ),
            )
                .select_related("category", "brand")
                .prefetch_related(
                    Prefetch("variants", queryset=ProductVariant.objects.filter(is_active=True).select_related("color_variant"), to_attr="prefetched_variants"),
                    "color_variants",
                    "images"
                )
                .annotate(total_sold=Sum("variants__orderitem__quantity"))
            .filter(total_sold__gt=0)
            .order_by("-total_sold", "-created_at")
            .distinct()[:4]
        )
        products = list(sold_products)
        if not products:
            products = list(
                Product.objects.filter(active_filter, images__isnull=False)
                .filter(Q(is_featured=True) | Q(is_trending=True))
                .select_related("category", "brand")
                .prefetch_related(
                    Prefetch("variants", queryset=ProductVariant.objects.filter(is_active=True).select_related("color_variant"), to_attr="prefetched_variants"),
                    "color_variants",
                    "images"
                )
                .order_by("-is_trending", "-is_featured", "-created_at")
                .distinct()[:4]
            )
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return Response(serializer.data)
