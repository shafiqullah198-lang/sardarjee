from django.core.management.base import BaseCommand
from apps.catalog.models import Product
from apps.orders.models import OrderItem
from apps.cart.models import CartItem

class Command(BaseCommand):
    help = "Permanently hard-delete archived/soft-deleted products that have no order history or cart records"

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("CLEAN TEST DATA - PERMANENT PRODUCT DELETION")
        self.stdout.write("=" * 80)

        # Get all soft-deleted/archived products
        products = Product.objects.filter(is_active=False)
        deleted_count = 0
        archived_retained = 0

        for product in products:
            # Check references
            has_orders = OrderItem.objects.filter(variant__product=product).exists()
            has_cart = CartItem.objects.filter(variant__product=product).exists()

            if has_orders or has_cart:
                self.stdout.write(f"Skipping Product ID {product.id} ('{product.name}') - Has active orders/cart items.")
                archived_retained += 1
            else:
                self.stdout.write(f"Hard deleting Product ID {product.id} ('{product.name}') - No active orders/cart items.")
                product.delete()
                deleted_count += 1

        self.stdout.write("-" * 80)
        self.stdout.write(f"Successfully deleted: {deleted_count} products.")
        self.stdout.write(f"Retained (protected by orders/carts): {archived_retained} products.")
        self.stdout.write("=" * 80)
