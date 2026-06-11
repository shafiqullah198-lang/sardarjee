from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Product, ProductColorVariant, ProductVariant
from apps.inventory.models import StockLedgerEntry
from apps.inventory.services import adjust_variant_stock
from apps.orders.models import Order
from apps.payments.models import PaymentTransaction


REFUND_STATUSES = {Order.Status.CANCELLED, Order.Status.RETURNED}


def _fallback_user():
    return get_user_model().objects.filter(is_superuser=True).first() or get_user_model().objects.filter(is_staff=True).first()


def _decimal(value, default="0"):
    try:
        return Decimal(str(value if value is not None else default))
    except Exception:
        return Decimal(default)


def _line_variant(line):
    variant_id = line.get("variant_id")
    product_id = line.get("product_id")
    if variant_id:
        return ProductVariant.objects.select_related("product", "color_variant").select_for_update().get(pk=variant_id)
    product = Product.objects.select_for_update().get(pk=product_id)
    fallback_variant = product.variants.select_for_update().first()
    if fallback_variant:
        return fallback_variant
    return ProductVariant.objects.create(
        product=product,
        sku=f"SKU-{product.id}",
        stock=max(0, int(product.stock or 0)),
        is_active=True,
    )


def _line_color_variant(line, variant):
    color_variant_id = line.get("color_variant_id")
    if color_variant_id:
        return ProductColorVariant.objects.select_for_update().get(pk=color_variant_id, product=variant.product)
    if variant.color_variant_id:
        return variant.color_variant
    return ProductColorVariant.objects.select_for_update().filter(product=variant.product).order_by("id").first()


def _reduce_inventory(order, line, quantity, note):
    variant = line["variant"]
    adjust_variant_stock(
        variant,
        delta=-quantity,
        movement_type=StockLedgerEntry.MovementType.OUT,
        note=note,
    )


def _restore_inventory(order, item):
    variant = ProductVariant.objects.select_related("product").select_for_update().get(pk=item.variant_id)
    adjust_variant_stock(
        variant,
        delta=item.quantity,
        movement_type=StockLedgerEntry.MovementType.IN,
        note=f"Refund/restock {order.number}",
    )


@transaction.atomic
def complete_sale(
    *,
    user=None,
    number,
    source,
    status,
    customer_name,
    customer_phone="",
    shipping_line1="",
    shipping_city="",
    shipping_country="Pakistan",
    payment_provider=PaymentTransaction.Provider.CASH,
    payment_status=PaymentTransaction.Status.PENDING,
    payment_reference="",
    payment_screenshot=None,
    items,
    tax_total=Decimal("0"),
    shipping_total=Decimal("0"),
):
    user = user if getattr(user, "is_authenticated", False) else _fallback_user()
    subtotal = Decimal("0")
    discount_total = Decimal("0")
    prepared = []

    for raw_line in items:
        variant = _line_variant(raw_line)
        product = variant.product
        color_variant = _line_color_variant(raw_line, variant)
        quantity = int(raw_line.get("quantity", 1))
        if quantity <= 0:
            raise ValueError("Item quantity must be greater than zero.")
        available_stock = max(0, int(variant.stock or 0))
        if (
            available_stock <= 0
            and color_variant is not None
            and not variant.size
            and not variant.fabric
        ):
            available_stock = max(available_stock, int(color_variant.stock or 0))
            if available_stock and variant.stock != available_stock:
                variant.stock = available_stock
                variant.save(update_fields=["stock", "updated_at"])
        if quantity > available_stock:
            raise ValueError(f"Only {available_stock} unit(s) available for {variant.sku}.")
        unit_price = _decimal(raw_line.get("unit_price"), variant.price)
        line_subtotal = unit_price * quantity
        discount = min(max(_decimal(raw_line.get("discount")), Decimal("0")), line_subtotal)
        line_total = line_subtotal - discount
        subtotal += line_total
        discount_total += discount
        prepared.append({
            "variant": variant,
            "color_variant": color_variant,
            "quantity": quantity,
            "unit_price": unit_price,
            "unit_cost": _decimal(raw_line.get("unit_cost"), getattr(variant, "cost_price", product.cost_price)),
            "line_total": line_total,
        })

    order = Order.objects.create(
        user=user,
        number=number,
        source=source,
        status=status,
        subtotal=subtotal + discount_total,
        discount_total=discount_total,
        tax_total=tax_total,
        shipping_total=shipping_total,
        grand_total=subtotal + tax_total + shipping_total,
        shipping_name=customer_name or "Walk-in Customer",
        shipping_phone=customer_phone,
        shipping_line1=shipping_line1,
        shipping_city=shipping_city,
        shipping_country=shipping_country,
        payment_screenshot=payment_screenshot,
        inventory_reduced=True,
    )

    for line in prepared:
        variant = line["variant"]
        color_variant = line.get("color_variant")

        # Build a snapshot image URL from color variant gallery or legacy image
        variant_image_url = ""
        if color_variant:
            cv_img = color_variant.images.order_by("sort_order", "id").first()
            if cv_img and cv_img.image:
                variant_image_url = cv_img.thumbnail.url if cv_img.thumbnail else cv_img.image.url
            elif color_variant.image:
                variant_image_url = color_variant.image.url
        if not variant_image_url:
            prod_img = variant.product.images.order_by("sort_order", "id").first()
            if prod_img and prod_img.image:
                variant_image_url = prod_img.thumbnail.url if prod_img.thumbnail else prod_img.image.url

        order.items.create(
            variant=variant,
            color_variant=color_variant,
            product_name=variant.product.name,
            sku=variant.sku,
            unit_price=line["unit_price"],
            unit_cost=line["unit_cost"],
            quantity=line["quantity"],
            line_total=line["line_total"],
            # Snapshots
            variant_color=variant.color or (color_variant.color_name if color_variant else ""),
            variant_size=variant.size,
            variant_fabric=variant.fabric,
            variant_is_stitched=variant.is_stitched,
            variant_image_url=variant_image_url,
        )
        _reduce_inventory(order, line, line["quantity"], f"{source.upper()} sale {order.number}")
    order.status_events.create(to_status=order.status, note=f"{source.upper()} sale completed")
    PaymentTransaction.objects.create(
        order=order,
        provider=payment_provider,
        status=payment_status,
        amount=order.grand_total,
        provider_reference=payment_reference,
    )
    return order


@transaction.atomic
def refund_sale(order, *, reason="", status=Order.Status.RETURNED):
    order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)
    if order.refunded_at:
        return order, False

    if order.inventory_reduced:
        for item in order.items.all():
            _restore_inventory(order, item)
        order.inventory_reduced = False

    old_status = order.status
    order.status = status
    order.refunded_at = timezone.now()
    order.refunded_amount = order.grand_total
    order.refund_reason = reason
    order.save(update_fields=["status", "inventory_reduced", "refunded_at", "refunded_amount", "refund_reason", "updated_at"])

    payment_status = PaymentTransaction.Status.CANCELLED if status == Order.Status.CANCELLED else PaymentTransaction.Status.REFUNDED
    payment = order.payments.order_by("-created_at").first()
    if payment:
        payment.status = payment_status
        payment.save(update_fields=["status", "updated_at"])
    else:
        PaymentTransaction.objects.create(order=order, provider=PaymentTransaction.Provider.CASH, status=payment_status, amount=order.refunded_amount)
    order.status_events.create(from_status=old_status, to_status=order.status, note=reason or "Sale refunded and inventory restored")
    return order, True
