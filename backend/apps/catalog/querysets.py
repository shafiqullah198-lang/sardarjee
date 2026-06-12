from __future__ import annotations

from django.db.models import Avg, Count, Prefetch, Q, QuerySet

from apps.catalog.models import (
    Product,
    ProductColorVariant,
    ProductColorVariantImage,
    ProductImage,
    ProductVariant,
    ProductVariantImage,
)
from apps.reviews.models import Review


def active_product_filter() -> Q:
    active_filter = Q(
        status=Product.Status.ACTIVE,
        is_active=True,
        archived_at__isnull=True,
    )
    if hasattr(Product, "deleted_at"):
        active_filter &= Q(deleted_at__isnull=True)
    return active_filter


def optimized_product_queryset(queryset: QuerySet[Product] | None = None) -> QuerySet[Product]:
    base_queryset = queryset if queryset is not None else Product.objects.all()

    variant_queryset = (
        ProductVariant.objects.filter(is_active=True)
        .select_related("color_variant", "inventory")
        .prefetch_related(
            Prefetch(
                "images",
                queryset=ProductVariantImage.objects.order_by("sort_order", "id"),
                to_attr="prefetched_images",
            ),
            Prefetch(
                "color_variant__images",
                queryset=ProductColorVariantImage.objects.order_by("sort_order", "id"),
                to_attr="prefetched_images",
            ),
        )
    )

    color_variant_queryset = ProductColorVariant.objects.prefetch_related(
        Prefetch(
            "images",
            queryset=ProductColorVariantImage.objects.order_by("sort_order", "id"),
            to_attr="prefetched_images",
        ),
        Prefetch(
            "variants",
            queryset=ProductVariant.objects.filter(is_active=True)
            .select_related("inventory"),
            to_attr="prefetched_variants",
        ),
    )

    return (
        base_queryset
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
            Prefetch("variants", queryset=variant_queryset, to_attr="prefetched_variants"),
            Prefetch("color_variants", queryset=color_variant_queryset),
            Prefetch(
                "images",
                queryset=ProductImage.objects.order_by("sort_order", "id"),
                to_attr="prefetched_images",
            ),
            Prefetch(
                "reviews",
                queryset=Review.objects.filter(is_hidden=False, is_spam=False).only(
                    "id",
                    "rating",
                    "product_id",
                ),
                to_attr="approved_reviews_prefetched",
            ),
        )
    )
