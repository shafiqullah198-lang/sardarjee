from django.core.management.base import BaseCommand
from apps.catalog.models import Product, ProductImage, ProductVariant, ProductVariantImage

class Command(BaseCommand):
    help = "Audit product and variant media links and stock source of truth"

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("PRODUCT MEDIA AND STOCK AUDIT")
        self.stdout.write("=" * 80)

        for product in Product.objects.all().order_by("id"):
            self.stdout.write(f"\nProduct: ID {product.id} | Name: '{product.name}' | Base Stock: {product.stock}")
            
            # Product Images
            images = ProductImage.objects.filter(product=product).order_by("id")
            if images.exists():
                self.stdout.write("  Product Images:")
                for img in images:
                    self.stdout.write(f"    - Image ID {img.id}: {img.image.name}")
            else:
                self.stdout.write("  Product Images: None")

            # Variants
            variants = ProductVariant.objects.filter(product=product).order_by("id")
            if variants.exists():
                self.stdout.write("  Variants:")
                for v in variants:
                    # Stock
                    stock_source = "stock"
                    qty = v.stock
                    if hasattr(v, "inventory"):
                        stock_source = "inventory record"
                        qty = v.inventory.quantity
                    
                    variant_desc = " / ".join(filter(None, [v.color, v.size, v.fabric])) or "Default Variant"
                    self.stdout.write(f"    - Variant ID {v.id} | SKU: {v.sku} | {variant_desc} | Active: {v.is_active} | Stock ({stock_source}): {qty}")
                    
                    # Variant Images
                    var_images = ProductVariantImage.objects.filter(variant=v).order_by("id")
                    if var_images.exists():
                        self.stdout.write("      Variant Images:")
                        for vi in var_images:
                            self.stdout.write(f"        * Image ID {vi.id}: {vi.image.name}")
                    else:
                        self.stdout.write("      Variant Images: None")
            else:
                self.stdout.write("  Variants: None")

        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("AUDIT COMPLETE")
        self.stdout.write("=" * 80)
