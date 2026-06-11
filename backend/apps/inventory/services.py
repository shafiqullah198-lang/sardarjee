from django.db.models import Sum

from apps.catalog.models import Product, ProductColorVariant, ProductVariant
from apps.inventory.models import InventoryRecord, StockLedgerEntry


def sync_product_stock(product: Product) -> int:
    active_variants = product.variants.filter(is_active=True)
    if active_variants.exists():
        total = active_variants.aggregate(total=Sum("stock"))["total"] or 0
    else:
        total = max(0, int(product.stock or 0))
    Product.objects.filter(pk=product.pk).update(stock=total)
    product.stock = total
    return total


def sync_color_variant_stock(color_variant: ProductColorVariant) -> int:
    total = color_variant.variants.filter(is_active=True).aggregate(total=Sum("stock"))["total"]
    if total is None:
        total = max(0, int(color_variant.stock or 0))
    ProductColorVariant.objects.filter(pk=color_variant.pk).update(stock=total)
    color_variant.stock = total
    return total


def sync_variant_inventory_record(variant: ProductVariant, *, low_stock_threshold: int | None = None) -> InventoryRecord:
    defaults = {"quantity": max(0, int(variant.stock or 0))}
    if low_stock_threshold is not None:
        defaults["low_stock_threshold"] = low_stock_threshold
    record, _ = InventoryRecord.objects.update_or_create(variant=variant, defaults=defaults)
    if variant.color_variant_id:
        sync_color_variant_stock(variant.color_variant)
    sync_product_stock(variant.product)
    return record


def set_variant_stock(
    variant: ProductVariant,
    *,
    new_stock: int,
    movement_type: str = StockLedgerEntry.MovementType.ADJUSTMENT,
    note: str = "",
    low_stock_threshold: int | None = None,
) -> tuple[ProductVariant, InventoryRecord]:
    if new_stock < 0:
        raise ValueError("Stock cannot be negative.")

    previous_stock = max(0, int(variant.stock or 0))
    variant.stock = new_stock
    variant.save(update_fields=["stock", "updated_at"])
    record = sync_variant_inventory_record(variant, low_stock_threshold=low_stock_threshold)

    delta = new_stock - previous_stock
    if delta != 0 or movement_type == StockLedgerEntry.MovementType.ADJUSTMENT:
        default_note = f"Adjusted stock from {previous_stock} to {new_stock}"
        StockLedgerEntry.objects.create(
            variant=variant,
            movement_type=movement_type,
            quantity=abs(delta),
            note=note or default_note,
        )
    return variant, record


def adjust_variant_stock(
    variant: ProductVariant,
    *,
    delta: int,
    movement_type: str,
    note: str = "",
    low_stock_threshold: int | None = None,
) -> tuple[ProductVariant, InventoryRecord]:
    previous_stock = max(0, int(variant.stock or 0))
    new_stock = previous_stock + delta
    if new_stock < 0:
        raise ValueError("Stock cannot go below 0.")
    if movement_type == StockLedgerEntry.MovementType.OUT and delta < 0 and abs(delta) > previous_stock:
        raise ValueError("Stock out cannot exceed available stock.")

    variant.stock = new_stock
    variant.save(update_fields=["stock", "updated_at"])
    record = sync_variant_inventory_record(variant, low_stock_threshold=low_stock_threshold)
    StockLedgerEntry.objects.create(
        variant=variant,
        movement_type=movement_type,
        quantity=abs(delta),
        note=note,
    )
    return variant, record
