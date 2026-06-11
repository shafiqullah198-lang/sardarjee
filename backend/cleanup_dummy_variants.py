import os
import django
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db.models import Q
from apps.catalog.models import Product, ProductVariant, ProductColorVariant
from apps.inventory.models import InventoryRecord

def cleanup(dry_run=True):
    print("=" * 60)
    print(f"DATABASE CLEANUP SCRIPT (DRY RUN: {dry_run})")
    print("=" * 60)

    variants_to_delete = []
    variants_to_deactivate = []

    # Process all products
    for product in Product.objects.all():
        print(f"\nAnalyzing Product: ID {product.id} - '{product.name}'")
        color_variants = product.color_variants.all()
        has_colors = color_variants.exists()
        
        # All variants for this product
        all_variants = product.variants.all()
        print(f"  Total current variants in DB: {all_variants.count()}")

        if has_colors:
            print(f"  Has {color_variants.count()} color variants: {list(color_variants.values_list('color_name', flat=True))}")
            # If product has color variants:
            # 1. Any variant with empty size, fabric, and no color_variant is a fake default variant.
            # 2. Any variant with size, fabric, stitching combinations that was auto-generated is dummy.
            # Real variants should only be: one ProductVariant per ProductColorVariant (with empty size/fabric).
            
            # Identify fake default variants
            fake_defaults = all_variants.filter(color="", size="", fabric="", color_variant__isnull=True)
            for fd in fake_defaults:
                if fd.orderitem_set.exists() or fd.cart_items.exists():
                    print(f"  [DEACTIVATE] Fake default variant (linked to orders/cart): ID {fd.id}, SKU {fd.sku}")
                    variants_to_deactivate.append(fd)
                else:
                    print(f"  [DELETE] Fake default variant: ID {fd.id}, SKU {fd.sku}")
                    variants_to_delete.append(fd)

            # Identify auto-generated size/fabric/stitching variants (e.g. from seed_variants.py)
            # These are variants where size, fabric, or stitching is set (not empty/default)
            dummy_combinations = all_variants.filter(
                Q(color_variant__isnull=False) & (~Q(size="") | ~Q(fabric="") | Q(is_stitched=True))
            )
            for dc in dummy_combinations:
                if dc.orderitem_set.exists() or dc.cart_items.exists():
                    print(f"  [DEACTIVATE] Dummy combination (linked to orders/cart): ID {dc.id}, SKU {dc.sku}, Color: {dc.color}, Size: {dc.size}, Fabric: {dc.fabric}")
                    variants_to_deactivate.append(dc)
                else:
                    print(f"  [DELETE] Dummy combination: ID {dc.id}, SKU {dc.sku}, Color: {dc.color}, Size: {dc.size}, Fabric: {dc.fabric}")
                    variants_to_delete.append(dc)
        else:
            print("  Has no color variants. Keeping exactly one default variant.")
            # If product has no color variants:
            # We should keep exactly one default variant. If there are duplicates, we remove duplicates.
            default_variants = list(all_variants.filter(color="", size="", fabric="", color_variant__isnull=True))
            if len(default_variants) > 1:
                # Keep the first one, delete the rest
                for dv in default_variants[1:]:
                    if dv.orderitem_set.exists() or dv.cart_items.exists():
                        print(f"  [DEACTIVATE] Duplicate default variant (linked): ID {dv.id}, SKU {dv.sku}")
                        variants_to_deactivate.append(dv)
                    else:
                        print(f"  [DELETE] Duplicate default variant: ID {dv.id}, SKU {dv.sku}")
                        variants_to_delete.append(dv)

    print("\n" + "=" * 60)
    print("SUMMARY OF ACTIONS")
    print(f"Total variants to DELETE: {len(variants_to_delete)}")
    print(f"Total variants to DEACTIVATE: {len(variants_to_deactivate)}")
    print("=" * 60)

    if dry_run:
        print("\nThis was a DRY RUN. No changes were made.")
        return

    # Apply changes
    print("\nApplying changes...")
    deleted_count = 0
    for v in variants_to_delete:
        # Delete associated inventory record first (cascade should handle it, but let's be safe)
        InventoryRecord.objects.filter(variant=v).delete()
        v.delete()
        deleted_count += 1
    
    deactivated_count = 0
    for v in variants_to_deactivate:
        v.is_active = False
        v.save(update_fields=["is_active", "updated_at"])
        deactivated_count += 1

    print(f"Successfully deleted {deleted_count} variants.")
    print(f"Successfully deactivated {deactivated_count} variants.")

    # Re-calculate/sync product stocks
    print("\nRecalculating stock for all products...")
    for p in Product.objects.all():
        p.recalculate_stock()
        print(f"  Product ID {p.id} - '{p.name}': New stock total = {p.stock}")

    print("\nCleanup successfully completed!")

if __name__ == "__main__":
    dry = True
    if len(sys.argv) > 1 and sys.argv[1] == "--confirm":
        dry = False
    cleanup(dry_run=dry)
