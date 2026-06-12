from django.contrib.auth import get_user_model
from django.db.models import Avg, F, Q, Sum
from django.utils import timezone
from django.utils.text import get_valid_filename
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Category, Product
from apps.catalog.querysets import active_product_filter, optimized_product_queryset
from apps.catalog.serializers import CategorySerializer, ProductSerializer
from apps.common.cache import get_public_cached_payload, set_public_cached_payload
from apps.cms.models import CareerOpportunity, HomepageBanner, HomepageDisplaySettings, HomepageStat, HomepageStory
from apps.cms.serializers import (
    CareerOpportunitySerializer,
    HomepageBannerSerializer,
    HomepageDisplaySettingsSerializer,
    HomepageStatSerializer,
    HomepageStorySerializer,
)
from apps.reviews.models import Review
from apps.reviews.serializers import ReviewSerializer
from apps.inventory.models import InventoryRecord
from apps.orders.models import Order
from apps.payments.models import PaymentTransaction


PAGE_SIZE_OPTIONS = (50, 100, 200)
BUSINESS_START_YEAR = 2016


def _page_size(request):
    try:
        value = int(request.query_params.get("page_size", 50))
    except (TypeError, ValueError):
        value = 50
    return value if value in PAGE_SIZE_OPTIONS else 50


def _paginate(request, queryset, serializer):
    page_size = _page_size(request)
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    total = queryset.count()
    start = (page - 1) * page_size
    return Response({
        "count": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "results": serializer(queryset[start:start + page_size], many=True).data,
    })


def _format_money(value):
    return f"PKR {int(value or 0):,}"


def calculate_live_stats():
    paid_order_ids = PaymentTransaction.objects.filter(status=PaymentTransaction.Status.SUCCESS).values("order_id")
    total_sales = (
        Order.objects.filter(Q(id__in=paid_order_ids) | Q(status__in=[Order.Status.DELIVERED, Order.Status.SHIPPED]))
        .exclude(status__in=[Order.Status.CANCELLED, Order.Status.RETURNED])
        .filter(refunded_at__isnull=True)
        .distinct()
        .aggregate(total=Sum("grand_total"))["total"]
        or 0
    )
    approved_reviews = Review.objects.filter(is_hidden=False, is_spam=False)
    average_rating = approved_reviews.aggregate(avg=Avg("rating"))["avg"] or 0
    customer_users = get_user_model().objects.filter(orders__isnull=False).distinct().count()
    customer_phones = Order.objects.exclude(shipping_phone="").values("shipping_phone").distinct().count()
    prod_qs = Product.objects.filter(status=Product.Status.ACTIVE, is_active=True, archived_at__isnull=True)
    if hasattr(Product, "deleted_at"):
        prod_qs = prod_qs.filter(deleted_at__isnull=True)
        
    low_stock_qs = InventoryRecord.objects.filter(
        quantity__lte=F("low_stock_threshold"), 
        variant__product__is_active=True, 
        variant__product__archived_at__isnull=True
    )
    if hasattr(Product, "deleted_at"):
        low_stock_qs = low_stock_qs.filter(variant__product__deleted_at__isnull=True)

    return {
        HomepageStat.StatType.TOTAL_PRODUCTS: prod_qs.count(),
        HomepageStat.StatType.TOTAL_ORDERS: Order.objects.count(),
        HomepageStat.StatType.TOTAL_SALES: _format_money(total_sales),
        HomepageStat.StatType.TOTAL_CUSTOMERS: max(customer_users, customer_phones),
        HomepageStat.StatType.TOTAL_REVIEWS: approved_reviews.count(),
        HomepageStat.StatType.AVERAGE_RATING: f"{average_rating:.1f}",
        HomepageStat.StatType.LOW_STOCK: low_stock_qs.count(),
    }


def calculate_homepage_summary_stats():
    current_year = timezone.localdate().year
    completed_orders = Order.objects.filter(status=Order.Status.DELIVERED, refunded_at__isnull=True)
    customer_users = completed_orders.values("user_id").distinct().count()
    customer_phones = completed_orders.exclude(shipping_phone="").values("shipping_phone").distinct().count()
    if not customer_users and not customer_phones:
        customer_users = get_user_model().objects.filter(role="customer").count()
        customer_phones = Order.objects.exclude(shipping_phone="").values("shipping_phone").distinct().count()

    average_rating = (
        Review.objects.filter(is_hidden=False, is_spam=False)
        .aggregate(avg=Avg("rating"))["avg"]
        or 0
    )

    premium_fabrics_qs = Product.objects.filter(status=Product.Status.ACTIVE, is_active=True, archived_at__isnull=True)
    if hasattr(Product, "deleted_at"):
        premium_fabrics_qs = premium_fabrics_qs.filter(deleted_at__isnull=True)

    return {
        "years_of_trust": max(0, current_year - BUSINESS_START_YEAR),
        "premium_fabrics": premium_fabrics_qs.count(),
        "happy_customers": max(customer_users, customer_phones),
        "average_rating": round(float(average_rating), 1),
    }


def serialize_homepage_summary_stats():
    stats = calculate_homepage_summary_stats()
    return [
        {
            "id": "years_of_trust",
            "stat_type": "years_of_trust",
            "title": "Years of Trust",
            "number": stats["years_of_trust"],
            "value": stats["years_of_trust"],
            "label": "Years of Trust",
            "icon": "",
            "is_active": True,
            "sort_order": 0,
        },
        {
            "id": "premium_fabrics",
            "stat_type": "premium_fabrics",
            "title": "Premium Fabrics",
            "number": stats["premium_fabrics"],
            "value": stats["premium_fabrics"],
            "label": "Premium Fabrics",
            "icon": "",
            "is_active": True,
            "sort_order": 1,
        },
        {
            "id": "happy_customers",
            "stat_type": "happy_customers",
            "title": "Happy Customers",
            "number": stats["happy_customers"],
            "value": stats["happy_customers"],
            "label": "Happy Customers",
            "icon": "",
            "is_active": True,
            "sort_order": 2,
        },
        {
            "id": "average_rating",
            "stat_type": "average_rating",
            "title": "Average Rating",
            "number": stats["average_rating"],
            "value": stats["average_rating"],
            "label": "Average Rating",
            "icon": "",
            "is_active": True,
            "sort_order": 3,
        },
    ]


def serialize_live_stats(stats_qs):
    values = calculate_live_stats()
    rows = []
    for stat in stats_qs:
        data = HomepageStatSerializer(stat).data
        data["value"] = str(values.get(stat.stat_type, 0))
        data["number"] = data["value"]
        rows.append(data)
    return rows


class HomeContentView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cached = get_public_cached_payload(request, "home-content")
        if cached is not None:
            return Response(cached)
        banners = HomepageBanner.objects.filter(is_active=True).order_by("sort_order")
        story = HomepageStory.objects.filter(is_active=True).order_by("-updated_at").first()
        settings = HomepageDisplaySettings.objects.order_by("-updated_at").first()
        display = settings or HomepageDisplaySettings()
        testimonials = (
            Review.objects.filter(is_hidden=False, is_spam=False)
            .select_related("user", "product")
            .order_by("-is_featured", "-created_at")[:6]
        )
        featured_products = optimized_product_queryset(
            Product.objects.filter(active_product_filter(), is_featured=True)
        )[:8]

        lookbook_products = optimized_product_queryset(
            Product.objects.filter(active_product_filter())
        ).order_by("-created_at")[: display.lookbook_limit]
        categories = Category.objects.filter(is_active=True, parent__isnull=True)[:10]
        payload = {
            "banners": HomepageBannerSerializer(banners, many=True, context={"request": request}).data,
            "stats": serialize_homepage_summary_stats(),
            "home_stats": calculate_homepage_summary_stats(),
            "story": HomepageStorySerializer(story).data if story else None,
            "display_settings": HomepageDisplaySettingsSerializer(display).data,
            "testimonials": ReviewSerializer(testimonials, many=True, context={"request": request}).data,
            "featured_products": ProductSerializer(featured_products, many=True, context={"request": request}).data,
            "lookbook_products": ProductSerializer(lookbook_products, many=True, context={"request": request}).data,
            "categories": CategorySerializer(categories, many=True, context={"request": request}).data,
        }
        set_public_cached_payload(request, "home-content", payload)
        return Response(payload)


class HomeStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cached = get_public_cached_payload(request, "home-stats")
        if cached is not None:
            return Response(cached)
        payload = calculate_homepage_summary_stats()
        set_public_cached_payload(request, "home-stats", payload)
        return Response(payload)


class AdminHomepageView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        return Response(
            {
                "hero": HomepageBannerSerializer(HomepageBanner.objects.order_by("sort_order").first(), context={"request": request}).data
                if HomepageBanner.objects.exists()
                else None,
                "stats": serialize_live_stats(HomepageStat.objects.order_by("sort_order")),
                "story": HomepageStorySerializer(HomepageStory.objects.order_by("-updated_at").first()).data
                if HomepageStory.objects.exists()
                else None,
                "display_settings": HomepageDisplaySettingsSerializer(
                    HomepageDisplaySettings.objects.order_by("-updated_at").first() or HomepageDisplaySettings()
                ).data,
                "reviews": ReviewSerializer(Review.objects.select_related("user", "product").order_by("-created_at")[:50], many=True).data,
            }
        )


class AdminHeroSettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        hero = HomepageBanner.objects.order_by("sort_order").first() or HomepageBanner()
        uploaded = request.FILES.get("hero_media") or request.FILES.get("image")
        if not uploaded:
            return Response(HomepageBannerSerializer(hero, context={"request": request}).data)

        content_type = getattr(uploaded, "content_type", "").lower()
        uploaded.name = get_valid_filename(uploaded.name).replace(" ", "-").lower()
        filename = uploaded.name.lower()
        hero.hero_media = uploaded
        update_fields = ["hero_media", "updated_at"]

        if not hero.pk:
            hero.title = "Premium Fabric & Timeless Style"
            hero.subtitle = "Pakistan's No.1 Men's Fabric House"
            hero.cta_text = "Men's Collection"
            hero.cta_url = "/shop/men"
            hero.secondary_cta_text = "Shop Now"
            hero.secondary_cta_url = "/shop"

        if content_type in ("video/mp4", "video/webm") or filename.endswith((".mp4", ".webm")):
            hero.media_type = HomepageBanner.MediaType.VIDEO
            update_fields.append("media_type")
        elif content_type.startswith("image/") or filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
            hero.media_type = HomepageBanner.MediaType.IMAGE
            hero.image = uploaded
            update_fields.extend(["media_type", "image"])

        if hero.pk:
            hero.save(update_fields=update_fields)
        else:
            hero.save()
        return Response(HomepageBannerSerializer(hero, context={"request": request}).data)


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = HomepageStatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, pk):
        stat = HomepageStat.objects.get(pk=pk)
        serializer = HomepageStatSerializer(stat, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        HomepageStat.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LiveHomepageStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = get_public_cached_payload(request, "live-home-stats")
        if cached is not None:
            return Response(cached)
        stats = HomepageStat.objects.filter(is_active=True).order_by("sort_order")
        payload = serialize_live_stats(stats)
        set_public_cached_payload(request, "live-home-stats", payload)
        return Response(payload)


class CareersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        jobs = CareerOpportunity.objects.filter(is_active=True).order_by("-created_at")
        return Response(CareerOpportunitySerializer(jobs, many=True).data)


class AdminCareerOpportunityView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        jobs = CareerOpportunity.objects.order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            jobs = jobs.filter(Q(title__icontains=search) | Q(department__icontains=search) | Q(location__icontains=search) | Q(job_type__icontains=search))
        status_filter = request.query_params.get("status", "")
        if status_filter == "active":
            jobs = jobs.filter(is_active=True)
        elif status_filter == "inactive":
            jobs = jobs.filter(is_active=False)
        return _paginate(request, jobs, CareerOpportunitySerializer)

    def post(self, request):
        serializer = CareerOpportunitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, pk):
        job = CareerOpportunity.objects.get(pk=pk)
        serializer = CareerOpportunitySerializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        CareerOpportunity.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminDashboardStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return Response(calculate_live_stats())


class AdminStorySettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        story = HomepageStory.objects.order_by("-updated_at").first() or HomepageStory()
        serializer = HomepageStorySerializer(story, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminDisplaySettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        settings = HomepageDisplaySettings.objects.order_by("-updated_at").first() or HomepageDisplaySettings()
        serializer = HomepageDisplaySettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminReviewModerationView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        reviews = Review.objects.select_related("user", "product").order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            reviews = reviews.filter(Q(user__email__icontains=search) | Q(title__icontains=search) | Q(comment__icontains=search) | Q(product__name__icontains=search))
        if request.query_params.get("status"):
            reviews = reviews.filter(status=request.query_params["status"])
        ordering = request.query_params.get("ordering", "-created_at")
        if ordering.lstrip("-") not in {"created_at", "rating", "status"}:
            ordering = "-created_at"
        reviews = reviews.order_by(ordering)
        return _paginate(request, reviews, ReviewSerializer)

    def patch(self, request, pk):
        review = Review.objects.get(pk=pk)
        review.is_approved = True
        review.status = Review.Status.APPROVED
        if request.data.get("hide_spam") is not None:
            hide_spam = str(request.data.get("hide_spam")).lower() in ("true", "1", "yes", "on")
            review.is_hidden = hide_spam
            review.is_spam = hide_spam
            review.status = Review.Status.HIDDEN if hide_spam else Review.Status.APPROVED
        if request.data.get("is_featured") is not None:
            review.is_featured = str(request.data.get("is_featured")).lower() in ("true", "1", "yes", "on")
        review.save()
        return Response(ReviewSerializer(review).data)

    def delete(self, request, pk):
        Review.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
