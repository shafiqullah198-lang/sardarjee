from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, DecimalField, ExpressionWrapper, F, Prefetch, Q, Sum, ProtectedError
from django.db.models.functions import TruncDate, TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Category, Product, ProductColorVariant, ProductImage, ProductVariant, ProductVariantImage
from apps.catalog.serializers import ProductSerializer
from apps.cart.models import CartItem
from apps.inventory.models import InventoryRecord, StockLedgerEntry
from apps.inventory.services import adjust_variant_stock, set_variant_stock, sync_product_stock, sync_variant_inventory_record
from apps.orders.models import Order, OrderStatusEvent, OrderItem
from apps.orders.serializers import OrderSerializer, OrderStatusEventSerializer
from apps.orders.services import complete_sale, refund_sale
from apps.payments.models import PaymentTransaction
from apps.reviews.models import Review


PAGE_SIZE_OPTIONS = (20, 50, 100, 200)


def _page_size(request):
    try:
        value = int(request.query_params.get("page_size", 50))
    except (TypeError, ValueError):
        value = 50
    return value if value in PAGE_SIZE_OPTIONS else 50


def _paginate(request, queryset, serializer=None, mapper=None):
    page_size = _page_size(request)
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    total = queryset.count()
    start = (page - 1) * page_size
    rows = queryset[start:start + page_size]
    if serializer:
        results = serializer(rows, many=True).data
    else:
        results = [mapper(row) for row in rows]
    return Response({
        "count": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "results": results,
    })


def _ordering(request, allowed, default):
    requested = request.query_params.get("ordering", default)
    return requested if requested.lstrip("-") in allowed else default


def _bool_value(value):
    return str(value).lower() in ("true", "1", "on", "yes")


def _product_image_url(product):
    image = product.images.order_by("sort_order", "id").first()
    if not image:
        return ""
    if image.thumbnail:
        return image.thumbnail.url
    return image.image.url


def _default_variant_sku(product):
    base = f"SKU-{product.id}"
    if not ProductVariant.objects.filter(sku=base).exists():
        return base
    suffix = 1
    while ProductVariant.objects.filter(sku=f"{base}-DEFAULT-{suffix}").exists():
        suffix += 1
    return f"{base}-DEFAULT-{suffix}"


def _sync_variant_images(variant):
    if variant.color_variant:
        cv_images = variant.color_variant.images.all()
        existing_images = variant.images.all()
        cv_image_paths = sorted([img.image.name for img in cv_images])
        existing_image_paths = sorted([img.image.name for img in existing_images])
        
        if cv_image_paths != existing_image_paths:
            variant.images.all().delete()
            for cv_img in cv_images:
                ProductVariantImage.objects.create(
                    variant=variant,
                    image=cv_img.image,
                    thumbnail=cv_img.thumbnail,
                    alt_text=cv_img.alt_text,
                    sort_order=cv_img.sort_order
                )


def _sync_product_variants(product):
    color_variants = product.color_variants.all()
    if color_variants.exists():
        # Ensure a ProductVariant exists for each ProductColorVariant
        for cv in color_variants:
            variant = product.variants.filter(color_variant=cv).first()
            if not variant:
                variant = ProductVariant.objects.create(
                    product=product,
                    color_variant=cv,
                    color=cv.color_name,
                    sku=f"SKU-{product.id}-{cv.id}",
                    stock=cv.stock,
                )
            fields_to_update = []
            if variant.color != cv.color_name:
                variant.color = cv.color_name
                fields_to_update.append("color")
            if variant.stock != cv.stock:
                variant.stock = cv.stock
                fields_to_update.append("stock")
            if not variant.is_active:
                variant.is_active = True
                fields_to_update.append("is_active")
            if fields_to_update:
                fields_to_update.append("updated_at")
                variant.save(update_fields=fields_to_update)
            sync_variant_inventory_record(variant)
            _sync_variant_images(variant)
        # Deactivate/delete default variants (empty size, color, fabric, and no color_variant)
        default_variants = product.variants.filter(
            color="", size="", fabric="", color_variant__isnull=True
        )
        for dv in default_variants:
            if dv.orderitem_set.exists() or dv.cart_items.exists():
                if dv.is_active:
                    dv.is_active = False
                    dv.save(update_fields=["is_active", "updated_at"])
            else:
                dv.delete()
    else:
        # No color variants. Check if there are other variants
        has_real_variants = product.variants.filter(
            ~Q(color="") | ~Q(size="") | ~Q(fabric="")
        ).exists()
        
        if has_real_variants:
            # Delete/deactivate default variants
            default_variants = product.variants.filter(
                color="", size="", fabric="", color_variant__isnull=True
            )
            for dv in default_variants:
                if dv.orderitem_set.exists() or dv.cart_items.exists():
                    if dv.is_active:
                        dv.is_active = False
                        dv.save(update_fields=["is_active", "updated_at"])
                else:
                    dv.delete()
            # Sync images for manual variants
            for variant in product.variants.all():
                _sync_variant_images(variant)
        else:
            # Truly no variants. Ensure exactly one active default variant.
            default_variants = product.variants.filter(
                color="", size="", fabric="", color_variant__isnull=True
            )
            if not default_variants.exists():
                variant = ProductVariant.objects.create(
                    product=product,
                    sku=_default_variant_sku(product),
                    stock=max(0, product.stock or 0),
                )
                sync_variant_inventory_record(variant)
            else:
                dv = default_variants.first()
                if not dv.is_active:
                    dv.is_active = True
                    dv.save(update_fields=["is_active", "updated_at"])
            # Sync images for the default variant
            for variant in product.variants.all():
                _sync_variant_images(variant)


def _ensure_inventory_variant_records():
    active_products = Product.objects.filter(is_active=True, archived_at__isnull=True)
    if hasattr(Product, "deleted_at"):
        active_products = active_products.filter(deleted_at__isnull=True)
    for product in active_products:
        _sync_product_variants(product)
    
    variant_qs = ProductVariant.objects.select_related("product", "color_variant").filter(
        product__is_active=True,
        product__archived_at__isnull=True,
        inventory__isnull=True
    )
    if hasattr(Product, "deleted_at"):
        variant_qs = variant_qs.filter(product__deleted_at__isnull=True)
        
    for variant in variant_qs:
        sync_variant_inventory_record(variant)


def _completed_sales_orders(queryset=None):
    orders = queryset if queryset is not None else Order.objects.all()
    paid_order_ids = PaymentTransaction.objects.filter(status=PaymentTransaction.Status.SUCCESS).values("order_id")
    return orders.filter(
        Q(id__in=paid_order_ids) | Q(status__in=[Order.Status.DELIVERED, Order.Status.SHIPPED]),
        refunded_at__isnull=True,
    ).exclude(status__in=[Order.Status.CANCELLED, Order.Status.RETURNED]).distinct()


def _sales_record_orders(queryset=None):
    orders = queryset if queryset is not None else Order.objects.all()
    return orders.filter(Q(id__in=_completed_sales_orders().values("id")) | Q(refunded_at__isnull=False)).distinct()


def _admin_order_queryset():
    return Order.objects.select_related("user").prefetch_related(
        Prefetch("payments", queryset=PaymentTransaction.objects.order_by("-created_at"), to_attr="prefetched_payments"),
        Prefetch("items"),
        Prefetch("status_events"),
    )


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return _admin_order_queryset().filter(user=self.request.user).order_by("-created_at")


class TrackOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "Order number or phone number is required."}, status=status.HTTP_400_BAD_REQUEST)
        order = (
            Order.objects.filter(Q(tracking_id__iexact=query) | Q(number__iexact=query))
            .prefetch_related("items", "status_events", Prefetch("payments", queryset=PaymentTransaction.objects.order_by("-created_at"), to_attr="prefetched_payments"))
            .first()
            or Order.objects.filter(shipping_phone__icontains=query)
            .prefetch_related("items", "status_events", Prefetch("payments", queryset=PaymentTransaction.objects.order_by("-created_at"), to_attr="prefetched_payments"))
            .order_by("-created_at")
            .first()
        )
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        website_orders = _admin_order_queryset().filter(source=Order.Source.WEBSITE)
        sales_orders = _completed_sales_orders(Order.objects.all())
        profit_expression = ExpressionWrapper(
            F("line_total") - (F("unit_cost") * F("quantity")),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        sales_totals = sales_orders.aggregate(
            total_sales=Sum("grand_total"),
            pos_sales=Sum("grand_total", filter=Q(source=Order.Source.POS)),
        )
        sales_order_items = OrderItem.objects.filter(order__in=sales_orders)
        profit_totals = sales_order_items.aggregate(
            total_profit=Sum(profit_expression),
            pos_profit=Sum(profit_expression, filter=Q(order__source=Order.Source.POS)),
        )
        review_totals = Review.objects.filter(status=Review.Status.APPROVED).aggregate(
            approved_reviews=Count("id"),
            average_rating=Avg("rating"),
        )
        low_stock_queryset = InventoryRecord.objects.filter(
            quantity__lte=F("low_stock_threshold"),
            variant__product__is_active=True,
            variant__product__archived_at__isnull=True
        ).select_related("variant__product").order_by("quantity", "variant__product__name")
        if hasattr(Product, "deleted_at"):
            low_stock_queryset = low_stock_queryset.filter(variant__product__deleted_at__isnull=True)

        low_stock_records = low_stock_queryset[:8]
        try:
            chart_days = int(request.query_params.get("days", 7))
        except (TypeError, ValueError):
            chart_days = 7
        chart_days = 30 if chart_days == 30 else 7
        start_date = timezone.localdate() - timezone.timedelta(days=chart_days - 1)
        bucket_fn = TruncDate("created_at") if chart_days == 7 else TruncMonth("created_at")
        sales_summary = {
            row["bucket"]: float(row["total"] or 0)
            for row in sales_orders.filter(created_at__date__gte=start_date)
            .annotate(bucket=bucket_fn)
            .values("bucket")
            .annotate(total=Sum("grand_total"))
            .order_by("bucket")
        }
        chart = []
        if chart_days == 7:
            for days_back in range(chart_days - 1, -1, -1):
                day = timezone.localdate() - timezone.timedelta(days=days_back)
                chart.append({"label": day.strftime("%d %b"), "total": sales_summary.get(day, 0)})
        else:
            month_cursor = start_date.replace(day=1)
            current_month = timezone.localdate().replace(day=1)
            while month_cursor <= current_month:
                chart.append({
                    "label": month_cursor.strftime("%b"),
                    "total": sales_summary.get(month_cursor, 0),
                })
                if month_cursor.month == 12:
                    month_cursor = month_cursor.replace(year=month_cursor.year + 1, month=1)
                else:
                    month_cursor = month_cursor.replace(month=month_cursor.month + 1)

        active_products_qs = Product.objects.filter(status=Product.Status.ACTIVE, is_active=True, archived_at__isnull=True)
        if hasattr(Product, "deleted_at"):
            active_products_qs = active_products_qs.filter(deleted_at__isnull=True)

        return Response({
            "total_sales": float(sales_totals["total_sales"] or Decimal("0")),
            "pos_sales": float(sales_totals["pos_sales"] or Decimal("0")),
            "total_profit": float(profit_totals["total_profit"] or Decimal("0")),
            "pos_profit": float(profit_totals["pos_profit"] or Decimal("0")),
            "total_orders": website_orders.count(),
            "total_products": active_products_qs.count(),
            "customers_count": max(
                get_user_model().objects.filter(orders__source=Order.Source.WEBSITE).distinct().count(),
                website_orders.exclude(shipping_phone="").values("shipping_phone").distinct().count(),
            ),
            "approved_reviews": int(review_totals["approved_reviews"] or 0),
            "average_rating": float(review_totals["average_rating"] or 0),
            "low_stock_count": low_stock_queryset.count(),
            "low_stock_products": [
                {
                    "product": row.variant.product.name,
                    "sku": row.variant.sku,
                    "quantity": row.quantity,
                    "threshold": row.low_stock_threshold,
                }
                for row in low_stock_records
            ],
            "recent_orders": OrderSerializer(website_orders.order_by("-created_at")[:5], many=True).data,
            "sales_chart_data": chart,
        })


class AdminProductView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, pk=None):
        if pk:
            product = get_object_or_404(Product, pk=pk)
            return Response(ProductSerializer(product, context={"request": request}).data)
        products = Product.objects.select_related("category", "brand").prefetch_related(
            Prefetch("variants", to_attr="prefetched_variants"),
            Prefetch("images", queryset=ProductImage.objects.order_by("sort_order", "id"), to_attr="prefetched_images"),
            Prefetch("color_variants"),
            Prefetch("reviews", queryset=Review.objects.filter(is_hidden=False, is_spam=False).only("id", "rating", "product_id"), to_attr="approved_reviews_prefetched"),
            "variants__inventory",
        ).annotate(
            average_rating_value=Avg("reviews__rating", filter=Q(reviews__is_hidden=False, reviews__is_spam=False)),
            reviews_count_value=Count("reviews", filter=Q(reviews__is_hidden=False, reviews__is_spam=False), distinct=True),
        ).order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            products = products.filter(Q(name__icontains=search) | Q(category__name__icontains=search) | Q(variants__sku__icontains=search)).distinct()
        status_param = request.query_params.get("status")
        if status_param == "archived":
            products = products.filter(Q(is_active=False) | Q(archived_at__isnull=False))
        elif status_param:
            products = products.filter(status=status_param, is_active=True, archived_at__isnull=True)
            if hasattr(Product, "deleted_at"):
                products = products.filter(deleted_at__isnull=True)
        else:
            products = products.filter(is_active=True, archived_at__isnull=True)
            if hasattr(Product, "deleted_at"):
                products = products.filter(deleted_at__isnull=True)
        products = products.order_by(_ordering(request, {"created_at", "name", "base_price", "cost_price", "status"}, "-created_at"))
        return _paginate(request, products, ProductSerializer)

    @transaction.atomic
    def post(self, request):
        return self._save(request)

    @transaction.atomic
    def patch(self, request, pk):
        return self._save(request, pk)

    def delete(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if product is referenced in OrderItem or CartItem
        has_orders = OrderItem.objects.filter(variant__product=product).exists()
        has_cart = CartItem.objects.filter(variant__product=product).exists()

        if has_orders or has_cart:
            # Soft delete
            product.is_active = False
            product.archived_at = timezone.now()
            product.status = Product.Status.ARCHIVED
            product.save()
            return Response(
                {
                    "success": True,
                    "message": "Product archived because it has order history.",
                    "archived": True
                },
                status=status.HTTP_200_OK
            )
        else:
            # Try hard delete
            try:
                product.delete()
                return Response(
                    {
                        "success": True,
                        "message": "Product permanently deleted.",
                        "archived": False
                    },
                    status=status.HTTP_200_OK
                )
            except ProtectedError:
                product.is_active = False
                product.archived_at = timezone.now()
                product.status = Product.Status.ARCHIVED
                product.save()
                return Response(
                    {
                        "success": True,
                        "message": "Product archived because it has order history.",
                        "archived": True
                    },
                    status=status.HTTP_200_OK
                )

    def _save(self, request, pk=None):
        data = request.data
        category_name = data.get("category", "General")
        category, _ = Category.objects.get_or_create(name=category_name)
        product = Product.objects.filter(pk=pk).first() if pk else Product()
        product.name = data.get("name", product.name)
        product.description = data.get("description", product.description)
        product.category = category
        product.cost_price = data.get("cost_price", product.cost_price or 0)
        product.base_price = data.get("selling_price", data.get("base_price", product.base_price or 0))
        product.is_on_sale = _bool_value(data.get("is_on_sale", False))
        try:
            discount_percent = Decimal(str(data.get("discount_percent", "0") or "0"))
        except Exception:
            return Response({"discount_percent": ["Discount percent must be a valid number."]}, status=status.HTTP_400_BAD_REQUEST)
        if discount_percent < 0 or discount_percent > 100:
            return Response({"discount_percent": ["Discount percent must be between 0 and 100."]}, status=status.HTTP_400_BAD_REQUEST)
        product.discount_percent = discount_percent if product.is_on_sale else Decimal("0")
        product.status = data.get("status", product.status or Product.Status.ACTIVE)
        product.is_featured = _bool_value(data.get("is_featured", False))
        product.is_trending = _bool_value(data.get("is_trending", False))
        product.is_new_arrival = _bool_value(data.get("is_new_arrival", False))
        product.show_in_men = _bool_value(data.get("show_in_men", False))
        product.show_in_wedding = _bool_value(data.get("show_in_wedding", False))
        product.show_in_fabrics = _bool_value(data.get("show_in_fabrics", False))
        product.save()
        variant = product.variants.first()
        if not variant:
            variant = ProductVariant.objects.create(product=product, sku=data.get("sku") or f"SKU-{product.id}")
        elif data.get("sku") and variant.sku != data.get("sku"):
            variant.sku = data.get("sku")
            variant.save(update_fields=["sku", "updated_at"])
        color_variants_raw = data.get("color_variants")
        has_color_variants_payload = color_variants_raw is not None
        if has_color_variants_payload:
            saved_color_count = self._save_color_variants(request, product, color_variants_raw)
            if saved_color_count == 0 and data.get("stock") is not None:
                stock_value = max(0, int(data.get("stock") or 0))
                product.stock = stock_value
                product.save(update_fields=["stock", "updated_at"])
                variant.stock = stock_value
                variant.save(update_fields=["stock", "updated_at"])
                sync_variant_inventory_record(variant)
        else:
            stock = data.get("stock")
            if stock is not None:
                stock_value = max(0, int(stock or 0))
                product.stock = stock_value
                product.save(update_fields=["stock", "updated_at"])
                variant.stock = stock_value
                variant.save(update_fields=["stock", "updated_at"])
                sync_variant_inventory_record(variant)
        image = request.FILES.get("image")
        if image:
            ProductImage.objects.create(product=product, image=image, alt_text=product.name)
        product.refresh_from_db()
        return Response(ProductSerializer(product, context={"request": request}).data, status=status.HTTP_201_CREATED if not pk else status.HTTP_200_OK)

    def _save_color_variants(self, request, product, raw):
        try:
            rows = json.loads(raw) if isinstance(raw, str) else raw
        except (TypeError, ValueError):
            rows = []
        if not isinstance(rows, list):
            rows = []

        kept_ids = []
        for index, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            color_name = str(row.get("color_name", "")).strip()
            if not color_name:
                continue
            variant_id = row.get("id")
            variant = ProductColorVariant.objects.filter(product=product, pk=variant_id).first() if variant_id else ProductColorVariant(product=product)
            variant.color_name = color_name
            variant.color_hex = row.get("color_hex") or None
            variant.stock = max(0, int(row.get("stock") or 0))
            image_field = row.get("image_field") or f"color_variant_image_{index}"
            image = request.FILES.get(image_field)
            if image:
                variant.image = image
            variant.save()
            kept_ids.append(variant.id)

        ProductColorVariant.objects.filter(product=product).exclude(id__in=kept_ids).delete()
        if kept_ids:
            _sync_product_variants(product)
            product.recalculate_stock()
        return len(kept_ids)


class AdminInventoryView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        _ensure_inventory_variant_records()
        search = request.query_params.get("search", "").strip()
        stock_filter = request.query_params.get("stock_filter", "").strip()
        product_filter = request.query_params.get("product", "").strip()
        color_filter = request.query_params.get("color", "").strip()
        size_filter = request.query_params.get("size", "").strip()

        status_filter = request.query_params.get("status", "active").strip().lower()
        if status_filter == "archived":
            archived_filter = Q(is_active=False) | Q(archived_at__isnull=False)
            if hasattr(Product, "deleted_at"):
                archived_filter |= Q(deleted_at__isnull=False)
            products = Product.objects.filter(archived_filter).order_by("name")
        else:
            products = Product.objects.filter(is_active=True, archived_at__isnull=True).order_by("name")
            if hasattr(Product, "deleted_at"):
                products = products.filter(deleted_at__isnull=True)

        if search:
            products = products.filter(
                Q(name__icontains=search)
                | Q(variants__sku__icontains=search)
                | Q(variants__color__icontains=search)
                | Q(variants__size__icontains=search)
                | Q(variants__fabric__icontains=search)
            ).distinct()
        if product_filter:
            products = products.filter(name__icontains=product_filter)
        if color_filter:
            products = products.filter(
                Q(variants__color__iexact=color_filter)
                | Q(variants__color_variant__color_name__iexact=color_filter)
            ).distinct()
        if size_filter:
            products = products.filter(variants__size__iexact=size_filter).distinct()
        if stock_filter == "low_stock":
            products = products.filter(
                variants__is_active=True,
                variants__inventory__quantity__lte=F("variants__inventory__low_stock_threshold"),
                variants__inventory__quantity__gt=0
            ).distinct()
        elif stock_filter == "out_of_stock":
            products = products.filter(
                variants__is_active=True,
                variants__inventory__quantity__lte=0
            ).distinct()

        records_total = products.count()
        records_page_size = _page_size(request)
        try:
            records_page = max(1, int(request.query_params.get("records_page", 1)))
        except (TypeError, ValueError):
            records_page = 1
        records_start = (records_page - 1) * records_page_size
        product_rows = list(products[records_start:records_start + records_page_size])

        records_list = []
        for product in product_rows:
            active_variants = product.variants.filter(is_active=True).select_related("color_variant")
            variant_list = []
            for variant in active_variants:
                record = variant.inventory if hasattr(variant, "inventory") else None
                if not record:
                    record = sync_variant_inventory_record(variant)
                elif record.quantity != variant.stock:
                    sync_variant_inventory_record(variant, low_stock_threshold=record.low_stock_threshold)
                    record.refresh_from_db()
                
                variant_list.append({
                    "id": variant.id,
                    "product_id": product.id,
                    "product": product.name,
                    "product_image": _product_image_url(product),
                    "variant": " / ".join(filter(None, [
                        variant.color or (variant.color_variant.color_name if variant.color_variant_id else ""),
                        variant.size,
                        variant.fabric,
                        "Stitched" if variant.is_stitched else "Unstitched",
                    ])),
                    "color": variant.color or (variant.color_variant.color_name if variant.color_variant_id else ""),
                    "size": variant.size,
                    "fabric": variant.fabric,
                    "stitching": "stitched" if variant.is_stitched else "unstitched",
                    "sku": variant.sku,
                    "quantity": record.quantity,
                    "low_stock_threshold": record.low_stock_threshold,
                    "is_low_stock": record.is_low_stock,
                    "is_out_of_stock": record.quantity <= 0,
                })

            records_list.append({
                "id": product.id,
                "name": product.name,
                "product_image": _product_image_url(product),
                "variants": variant_list,
            })

        history = StockLedgerEntry.objects.select_related("variant__product").order_by("-created_at")
        if status_filter == "archived":
            history_filter = Q(variant__product__is_active=False) | Q(variant__product__archived_at__isnull=False)
            if hasattr(Product, "deleted_at"):
                history_filter |= Q(variant__product__deleted_at__isnull=False)
            history = history.filter(history_filter)
        else:
            history = history.filter(variant__product__is_active=True, variant__product__archived_at__isnull=True)
            if hasattr(Product, "deleted_at"):
                history = history.filter(variant__product__deleted_at__isnull=True)

        history_search = request.query_params.get("history_search", "").strip()
        if history_search:
            history = history.filter(Q(variant__sku__icontains=history_search) | Q(note__icontains=history_search))
        if request.query_params.get("movement_type"):
            history = history.filter(movement_type=request.query_params["movement_type"])
        history = history.order_by(_ordering(request, {"created_at", "quantity", "movement_type"}, "-created_at"))
        page_size = _page_size(request)
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1
        total = history.count()
        start = (page - 1) * page_size
        history_rows = history[start:start + page_size]

        if status_filter == "archived":
            filter_products_qs = Product.objects.filter(Q(is_active=False) | Q(archived_at__isnull=False))
            if hasattr(Product, "deleted_at"):
                filter_products_qs = filter_products_qs.filter(Q(is_active=False) | Q(archived_at__isnull=False) | Q(deleted_at__isnull=False))
            
            filter_variants_qs = ProductVariant.objects.filter(
                Q(product__is_active=False) | Q(product__archived_at__isnull=False)
            )
            if hasattr(Product, "deleted_at"):
                filter_variants_qs = filter_variants_qs.filter(
                    Q(product__is_active=False) | Q(product__archived_at__isnull=False) | Q(product__deleted_at__isnull=False)
                )
        else:
            filter_products_qs = Product.objects.filter(is_active=True, archived_at__isnull=True)
            if hasattr(Product, "deleted_at"):
                filter_products_qs = filter_products_qs.filter(deleted_at__isnull=True)
                
            filter_variants_qs = ProductVariant.objects.filter(is_active=True, product__is_active=True, product__archived_at__isnull=True)
            if hasattr(Product, "deleted_at"):
                filter_variants_qs = filter_variants_qs.filter(product__deleted_at__isnull=True)

        filters = {
            "products": sorted(filter_products_qs.filter(status=Product.Status.ACTIVE).values_list("name", flat=True).distinct()),
            "colors": sorted({
                *(value for value in ProductColorVariant.objects.filter(product__in=filter_products_qs).values_list("color_name", flat=True).distinct() if value),
                *(value for value in filter_variants_qs.values_list("color", flat=True).distinct() if value)
            }),
            "sizes": sorted({value for value in filter_variants_qs.values_list("size", flat=True).distinct() if value}),
        }

        return Response({
            "records": records_list,
            "records_count": records_total,
            "records_page": records_page,
            "records_page_size": records_page_size,
            "records_total_pages": max(1, (records_total + records_page_size - 1) // records_page_size),
            "history_count": total,
            "history_page": page,
            "history_page_size": page_size,
            "history_total_pages": max(1, (total + page_size - 1) // page_size),
            "history": [{
                "id": move.id,
                "sku": move.variant.sku,
                "product": move.variant.product.name,
                "movement_type": move.movement_type,
                "quantity": move.quantity,
                "note": move.note,
                "created_at": move.created_at.isoformat(),
            } for move in history_rows],
            "filters": filters,
        })


class AdminInventoryMoveView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def post(self, request):
        variant = ProductVariant.objects.select_related("product", "color_variant").select_for_update().get(pk=request.data.get("variant_id"))
        movement_type = request.data.get("movement_type", StockLedgerEntry.MovementType.ADJUSTMENT)
        note = str(request.data.get("note", "")).strip()
        threshold_raw = request.data.get("low_stock_threshold")
        low_stock_threshold = int(threshold_raw) if threshold_raw not in (None, "") else None

        try:
            if request.data.get("target_quantity") not in (None, ""):
                target_quantity = int(request.data.get("target_quantity"))
                _, record = set_variant_stock(
                    variant,
                    new_stock=target_quantity,
                    movement_type=StockLedgerEntry.MovementType.ADJUSTMENT,
                    note=note,
                    low_stock_threshold=low_stock_threshold,
                )
            else:
                quantity = int(request.data.get("quantity", 0))
                if quantity <= 0:
                    return Response({"detail": "Quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
                delta = quantity if movement_type == StockLedgerEntry.MovementType.IN else -quantity if movement_type == StockLedgerEntry.MovementType.OUT else 0
                if movement_type == StockLedgerEntry.MovementType.ADJUSTMENT:
                    _, record = set_variant_stock(
                        variant,
                        new_stock=quantity,
                        movement_type=movement_type,
                        note=note,
                        low_stock_threshold=low_stock_threshold,
                    )
                else:
                    _, record = adjust_variant_stock(
                        variant,
                        delta=delta,
                        movement_type=movement_type,
                        note=note,
                        low_stock_threshold=low_stock_threshold,
                    )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sync_product_stock(variant.product)
        return Response({
            "ok": True,
            "variant_id": variant.id,
            "stock": variant.stock,
            "inventory_quantity": record.quantity,
        })


class InventoryItemStockView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def patch(self, request, pk):
        variant = get_object_or_404(ProductVariant.objects.select_related("product", "color_variant").select_for_update(), pk=pk)
        record, _ = InventoryRecord.objects.select_for_update().get_or_create(variant=variant)

        has_stock = "stock" in request.data
        has_delta = "delta" in request.data
        if has_stock == has_delta:
            return Response({"detail": "Send either stock or delta."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if has_stock:
                next_stock = int(request.data.get("stock"))
                _, record = set_variant_stock(
                    variant,
                    new_stock=next_stock,
                    movement_type=StockLedgerEntry.MovementType.ADJUSTMENT,
                    note="Instant inventory stock update",
                    low_stock_threshold=record.low_stock_threshold,
                )
            else:
                delta = int(request.data.get("delta"))
                if delta == 0:
                    sync_variant_inventory_record(variant, low_stock_threshold=record.low_stock_threshold)
                else:
                    movement_type = StockLedgerEntry.MovementType.IN if delta > 0 else StockLedgerEntry.MovementType.OUT
                    _, record = adjust_variant_stock(
                        variant,
                        delta=delta,
                        movement_type=movement_type,
                        note="Instant inventory stock update",
                        low_stock_threshold=record.low_stock_threshold,
                    )
        except (TypeError, ValueError) as exc:
            return Response({"detail": str(exc) or "Stock must be a valid number."}, status=status.HTTP_400_BAD_REQUEST)

        variant.refresh_from_db()
        record.refresh_from_db()
        return Response({
            "id": variant.id,
            "stock": variant.stock,
            "status": "out_of_stock" if variant.stock <= 0 else "low_stock" if record.is_low_stock else "healthy",
            "low_stock_status": record.is_low_stock,
            "is_low_stock": record.is_low_stock,
            "is_out_of_stock": variant.stock <= 0,
        })


class AdminOrdersView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk=None):
        orders = _admin_order_queryset().filter(source=Order.Source.WEBSITE).order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            orders = orders.filter(Q(number__icontains=search) | Q(tracking_id__icontains=search) | Q(shipping_name__icontains=search) | Q(shipping_phone__icontains=search))
        if request.query_params.get("status"):
            orders = orders.filter(status=request.query_params["status"])
        if request.query_params.get("date"):
            orders = orders.filter(created_at__date=request.query_params["date"])
        if request.query_params.get("payment"):
            payment_ids = PaymentTransaction.objects.filter(status__icontains=request.query_params["payment"]).values("order_id")
            orders = orders.filter(id__in=payment_ids)
        orders = orders.order_by(_ordering(request, {"created_at", "number", "grand_total", "status"}, "-created_at"))
        return _paginate(request, orders, OrderSerializer)

    def patch(self, request, pk):
        order = Order.objects.get(pk=pk, source=Order.Source.WEBSITE)
        old_status = order.status
        next_status = request.data.get("status")
        if next_status in [Order.Status.CANCELLED, Order.Status.RETURNED, Order.Status.REFUNDED]:
            order, refunded = refund_sale(order, reason=request.data.get("note", "Admin refund"), status=next_status)
            return Response({
                **OrderSerializer(order, context={"request": request}).data,
                "refund_applied": refunded,
            })
        for field in ("status", "shipping_name", "shipping_phone", "shipping_city"):
            if request.data.get(field):
                setattr(order, field, request.data[field])
        order.save()
        if request.data.get("payment_status"):
            payment = order.payments.order_by("-created_at").first()
            if payment:
                payment.status = request.data["payment_status"]
                payment.save()
            else:
                PaymentTransaction.objects.create(order=order, provider=PaymentTransaction.Provider.CASH, status=request.data["payment_status"], amount=order.grand_total)
        order.status_events.create(from_status=old_status, to_status=order.status, note=request.data.get("note", "Admin update"))
        return Response(OrderSerializer(order, context={"request": request}).data)


class AdminPosSaleView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def post(self, request):
        items = request.data.get("items", [])
        if not items:
            return Response({"detail": "At least one item is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate items' variants in POS
        for item in items:
            variant_id = item.get("variant_id")
            if variant_id:
                try:
                    variant = ProductVariant.objects.select_related("product").get(id=variant_id)
                except ProductVariant.DoesNotExist:
                    return Response({"detail": f"Variant {variant_id} does not exist."}, status=status.HTTP_400_BAD_REQUEST)
                product = variant.product
            else:
                product_id = item.get("product_id")
                product = Product.objects.filter(id=product_id).first()
                if not product:
                    return Response({"detail": f"Product {product_id} does not exist."}, status=status.HTTP_400_BAD_REQUEST)
            if not product.is_active or product.archived_at is not None or (hasattr(product, "deleted_at") and product.deleted_at is not None):
                return Response({"detail": f"Product '{product.name}' is archived and cannot be sold."}, status=status.HTTP_400_BAD_REQUEST)
        provider = request.data.get("payment_method") or PaymentTransaction.Provider.CASH
        order = complete_sale(
            user=request.user,
            number=f"POS-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            source=Order.Source.POS,
            status=Order.Status.DELIVERED,
            customer_name=request.data.get("customer_name", "Walk-in Customer"),
            customer_phone=request.data.get("customer_phone", ""),
            shipping_line1="Physical shop POS",
            shipping_city="Store",
            payment_provider=provider,
            payment_status=PaymentTransaction.Status.SUCCESS,
            payment_reference="POS",
            items=items,
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class AdminSalesView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        orders = _sales_record_orders(_admin_order_queryset()).order_by("-created_at")
        if request.query_params.get("date"):
            orders = orders.filter(created_at__date=request.query_params["date"])
        source = request.query_params.get("source")
        if source == Order.Source.POS:
            orders = orders.filter(source=Order.Source.POS)
        elif source in (Order.Source.WEBSITE, "online"):
            orders = orders.filter(source=Order.Source.WEBSITE)
        if request.query_params.get("search"):
            search = request.query_params["search"]
            orders = orders.filter(Q(number__icontains=search) | Q(shipping_name__icontains=search) | Q(shipping_phone__icontains=search))
        orders = orders.order_by(_ordering(request, {"created_at", "number", "grand_total"}, "-created_at"))
        rows = []
        for order in orders:
            payment = order.prefetched_payments[0] if getattr(order, "prefetched_payments", None) else None
            payment_status = payment.status if payment else "pending"
            if request.query_params.get("payment") and request.query_params["payment"].lower() not in payment_status.lower():
                continue
            is_refunded = bool(order.refunded_at) or order.status in [Order.Status.CANCELLED, Order.Status.RETURNED]
            rows.append({
                "id": order.id,
                "number": order.number,
                "source": order.source,
                "customer": order.shipping_name,
                "payment_status": payment_status,
                "payment_method": payment.provider if payment else "unknown",
                "grand_total": str(Decimal("0") if is_refunded else order.grand_total),
                "original_total": str(order.grand_total),
                "refunded_amount": str(order.refunded_amount),
                "refunded_at": order.refunded_at.isoformat() if order.refunded_at else None,
                "status": order.status,
                "created_at": order.created_at.isoformat(),
            })
        page_size = _page_size(request)
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1
        total = len(rows)
        start = (page - 1) * page_size
        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
            "results": rows[start:start + page_size],
        })

    def post(self, request, pk=None):
        order = Order.objects.filter(pk=pk).first()
        if not order:
            return Response({"detail": "Sale not found."}, status=status.HTTP_404_NOT_FOUND)
        order, refunded = refund_sale(order, reason=request.data.get("reason", "Admin refund"), status=request.data.get("status", Order.Status.RETURNED))
        return Response({
            "refunded": refunded,
            "order": OrderSerializer(order).data,
        })


class AdminSalesInvoiceView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk=None, number=None):
        orders = _admin_order_queryset()
        order = orders.filter(pk=pk).first() if pk is not None else orders.filter(number=number).first()
        if not order:
            return Response({"detail": "Sale invoice not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)


class AdminOrderEventsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        events = OrderStatusEvent.objects.select_related("order").order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            events = events.filter(Q(order__number__icontains=search) | Q(note__icontains=search) | Q(to_status__icontains=search))
        events = events.order_by(_ordering(request, {"created_at", "to_status"}, "-created_at"))
        return _paginate(request, events, OrderStatusEventSerializer)
