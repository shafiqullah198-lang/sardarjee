from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Product, ProductColorVariant, ProductVariant
from apps.inventory.models import InventoryRecord, StockLedgerEntry
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
        return ProductVariant.objects.select_related("product").select_for_update().get(pk=variant_id)
    product = Product.objects.select_for_update().get(pk=product_id)
    return product.variants.select_for_update().first() or ProductVariant.objects.create(product=product, sku=f"SKU-{product.id}")


def _line_color_variant(line, product):
    color_variant_id = line.get("color_variant_id")
    if color_variant_id:
        return ProductColorVariant.objects.select_for_update().get(pk=color_variant_id, product=product)
    return ProductColorVariant.objects.select_for_update().filter(product=product).order_by("id").first()


def _reduce_inventory(order, line, quantity, note):
    variant = line["variant"]
    product = variant.product
    color_variant = line.get("color_variant")

    if color_variant:
        color_variant.stock = max(0, color_variant.stock - quantity)
        color_variant.save(update_fields=["stock", "updated_at"])
    else:
        product.stock = max(0, product.stock - quantity)
        product.save(update_fields=["stock", "updated_at"])

    record, _ = InventoryRecord.objects.get_or_create(variant=variant)
    record.quantity = max(0, record.quantity - quantity)
    record.save(update_fields=["quantity", "updated_at"])
    StockLedgerEntry.objects.create(variant=variant, movement_type=StockLedgerEntry.MovementType.OUT, quantity=quantity, note=note)


def _restore_inventory(order, item):
    variant = ProductVariant.objects.select_related("product").select_for_update().get(pk=item.variant_id)
    product = variant.product

    if item.color_variant_id:
        color_variant = ProductColorVariant.objects.select_for_update().get(pk=item.color_variant_id)
        color_variant.stock += item.quantity
        color_variant.save(update_fields=["stock", "updated_at"])
    else:
        product.stock += item.quantity
        product.save(update_fields=["stock", "updated_at"])

    record, _ = InventoryRecord.objects.get_or_create(variant=variant)
    record.quantity += item.quantity
    record.save(update_fields=["quantity", "updated_at"])
    StockLedgerEntry.objects.create(
        variant=variant,
        movement_type=StockLedgerEntry.MovementType.IN,
        quantity=item.quantity,
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
        color_variant = _line_color_variant(raw_line, product)
        quantity = int(raw_line.get("quantity", 1))
        if quantity <= 0:
            raise ValueError("Item quantity must be greater than zero.")
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
        order.items.create(
            variant=variant,
            color_variant=line.get("color_variant"),
            product_name=variant.product.name,
            sku=variant.sku,
            unit_price=line["unit_price"],
            quantity=line["quantity"],
            line_total=line["line_total"],
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
