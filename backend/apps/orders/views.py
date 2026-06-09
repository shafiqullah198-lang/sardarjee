from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, F, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Category, Product, ProductColorVariant, ProductImage, ProductVariant
from apps.catalog.serializers import ProductSerializer
from apps.inventory.models import InventoryRecord, StockLedgerEntry
from apps.orders.models import Order, OrderStatusEvent
from apps.orders.serializers import OrderSerializer, OrderStatusEventSerializer
from apps.orders.services import complete_sale, refund_sale
from apps.payments.models import PaymentTransaction
from apps.reviews.models import Review


PAGE_SIZE_OPTIONS = (50, 100, 200)


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


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items", "status_events").order_by("-created_at")


class TrackOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "Order number or phone number is required."}, status=status.HTTP_400_BAD_REQUEST)
        order = (
            Order.objects.filter(Q(tracking_id__iexact=query) | Q(number__iexact=query))
            .prefetch_related("items", "status_events", "payments")
            .first()
            or Order.objects.filter(shipping_phone__icontains=query)
            .prefetch_related("items", "status_events", "payments")
            .order_by("-created_at")
            .first()
        )
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        orders = Order.objects.prefetch_related("items", "status_events", "payments").order_by("-created_at")
        website_orders = orders.filter(source=Order.Source.WEBSITE)
        sales_orders = _completed_sales_orders(orders)
        total_sales = sales_orders.aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
        pos_sales = sales_orders.filter(source=Order.Source.POS).aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
        approved_reviews = Review.objects.filter(status=Review.Status.APPROVED)
        low_stock_records = InventoryRecord.objects.filter(quantity__lte=F("low_stock_threshold")).select_related("variant__product")[:8]
        try:
            chart_days = int(request.query_params.get("days", 7))
        except (TypeError, ValueError):
            chart_days = 7
        chart_days = 30 if chart_days == 30 else 7
        chart = []
        today = timezone.localdate()
        for days_back in range(chart_days - 1, -1, -1):
            day = today - timezone.timedelta(days=days_back)
            total = sales_orders.filter(created_at__date=day).aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
            chart.append({"label": day.strftime("%d %b") if chart_days == 7 else day.strftime("%d"), "total": float(total)})
        return Response({
            "total_sales": float(total_sales),
            "pos_sales": float(pos_sales),
            "total_orders": website_orders.count(),
            "total_products": Product.objects.filter(status=Product.Status.ACTIVE).count(),
            "customers": max(
                get_user_model().objects.filter(orders__source=Order.Source.WEBSITE).distinct().count(),
                website_orders.exclude(shipping_phone="").values("shipping_phone").distinct().count(),
            ),
            "approved_reviews": approved_reviews.count(),
            "average_rating": float(approved_reviews.aggregate(avg=Avg("rating"))["avg"] or 0),
            "low_stock": InventoryRecord.objects.filter(quantity__lte=F("low_stock_threshold")).count(),
            "low_stock_products": [
                {
                    "product": row.variant.product.name,
                    "sku": row.variant.sku,
                    "quantity": row.quantity,
                    "threshold": row.low_stock_threshold,
                }
                for row in low_stock_records
            ],
            "recent_orders": OrderSerializer(website_orders[:6], many=True).data,
            "sales_chart": chart,
        })


class AdminProductView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, pk=None):
        products = Product.objects.select_related("category", "brand").prefetch_related("variants__inventory", "color_variants", "images").order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            products = products.filter(Q(name__icontains=search) | Q(category__name__icontains=search) | Q(variants__sku__icontains=search)).distinct()
        if request.query_params.get("status"):
            products = products.filter(status=request.query_params["status"])
        products = products.order_by(_ordering(request, {"created_at", "name", "base_price", "status"}, "-created_at"))
        return _paginate(request, products, ProductSerializer)

    @transaction.atomic
    def post(self, request):
        return self._save(request)

    @transaction.atomic
    def patch(self, request, pk):
        return self._save(request, pk)

    def delete(self, request, pk):
        Product.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _save(self, request, pk=None):
        data = request.data
        category_name = data.get("category", "General")
        category, _ = Category.objects.get_or_create(name=category_name)
        product = Product.objects.filter(pk=pk).first() if pk else Product()
        product.name = data.get("name", product.name)
        product.description = data.get("description", product.description)
        product.category = category
        product.base_price = data.get("base_price", product.base_price or 0)
        product.is_on_sale = _bool_value(data.get("is_on_sale", False))
        try:
            discount_percent = Decimal(str(data.get("discount_percent", "0") or "0"))
        except Exception:
            return Response({"discount_percent": ["Discount percent must be a valid number."]}, status=status.HTTP_400_BAD_REQUEST)
        if discount_percent < 0 or discount_percent > 100:
            return Response({"discount_percent": ["Discount percent must be between 0 and 100."]}, status=status.HTTP_400_BAD_REQUEST)
        if product.is_on_sale and discount_percent <= 0:
            return Response({"discount_percent": ["Discount percent is required when On Sale is checked."]}, status=status.HTTP_400_BAD_REQUEST)
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
                InventoryRecord.objects.update_or_create(variant=variant, defaults={"quantity": stock_value})
        else:
            stock = data.get("stock")
            if stock is not None:
                stock_value = max(0, int(stock or 0))
                product.stock = stock_value
                product.save(update_fields=["stock", "updated_at"])
                InventoryRecord.objects.update_or_create(variant=variant, defaults={"quantity": stock_value})
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
            product.recalculate_stock()
        return len(kept_ids)


class AdminInventoryView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        records = InventoryRecord.objects.select_related("variant__product").order_by("variant__product__name")
        if search:
            records = records.filter(Q(variant__product__name__icontains=search) | Q(variant__sku__icontains=search))
        records_total = records.count()
        records_page_size = _page_size(request)
        try:
            records_page = max(1, int(request.query_params.get("records_page", 1)))
        except (TypeError, ValueError):
            records_page = 1
        records_start = (records_page - 1) * records_page_size
        record_rows = records[records_start:records_start + records_page_size]
        history = StockLedgerEntry.objects.select_related("variant").order_by("-created_at")
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
        return Response({
            "records": [{
                "id": row.variant_id,
                "product": row.variant.product.name,
                "sku": row.variant.sku,
                "quantity": row.quantity,
                "low_stock_threshold": row.low_stock_threshold,
                "is_low_stock": row.is_low_stock,
            } for row in record_rows],
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
                "movement_type": move.movement_type,
                "quantity": move.quantity,
                "note": move.note,
                "created_at": move.created_at.isoformat(),
            } for move in history_rows],
        })


class AdminInventoryMoveView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def post(self, request):
        variant = ProductVariant.objects.get(pk=request.data.get("variant_id"))
        movement_type = request.data.get("movement_type", StockLedgerEntry.MovementType.IN)
        quantity = int(request.data.get("quantity", 0))
        if quantity <= 0:
            return Response({"detail": "Quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
        record, _ = InventoryRecord.objects.get_or_create(variant=variant)
        if movement_type == StockLedgerEntry.MovementType.IN:
            record.quantity += quantity
        elif movement_type == StockLedgerEntry.MovementType.OUT:
            record.quantity = max(0, record.quantity - quantity)
        else:
            record.quantity = quantity
        record.save()
        StockLedgerEntry.objects.create(variant=variant, movement_type=movement_type, quantity=quantity, note=request.data.get("note", ""))
        return Response({"ok": True})


class AdminOrdersView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk=None):
        orders = Order.objects.filter(source=Order.Source.WEBSITE).prefetch_related("items", "status_events", "payments").order_by("-created_at")
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
        orders = _sales_record_orders(Order.objects.prefetch_related("payments")).order_by("-created_at")
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
            payment = order.payments.order_by("-created_at").first()
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
        orders = Order.objects.prefetch_related("items", "status_events", "payments")
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
