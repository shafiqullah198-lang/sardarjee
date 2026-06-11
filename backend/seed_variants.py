import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Product, ProductColorVariant, ProductColorVariantImage, ProductVariant

def seed():
    try:
        p = Product.objects.get(id=7)
    except Product.DoesNotExist:
        print("Product 7 not found!")
        return

    print("Found product:", p.name)

    # 1. Update/Add color variants images (legacy + gallery)
    color_images = {
        "White": ["products/whitecloth.png", "products/image_1.jpeg"],
        "Navy Blue": ["products/image_2.jpeg", "products/image_3.jpeg"],
        "Black": ["products/image_4.jpeg", "products/image_5.jpeg"],
        "Sky Blue": ["products/image_1.jpeg", "products/image_2.jpeg"]
    }

    # Ensure product color variants link to these
    cvs = p.color_variants.all()
    for cv in cvs:
        name = cv.color_name
        if name in color_images:
            imgs = color_images[name]
            cv.image = imgs[0]
            cv.save()
            print(f"Updated legacy image for color {name} to {imgs[0]}")

            # Clear old gallery images
            cv.images.all().delete()

            # Create new gallery images
            for idx, img_path in enumerate(imgs):
                ProductColorVariantImage.objects.create(
                    color_variant=cv,
                    image=img_path,
                    alt_text=f"{p.name} in {name} - Image {idx + 1}",
                    sort_order=idx
                )
            print(f"Added {len(imgs)} gallery images for {name}")

    # 2. Deleting variants that are NOT linked to order items
    # For variants linked to order items, we just mark them active and keep them.
    unlinked_variants = p.variants.filter(orderitem__isnull=True)
    unlinked_variants.delete()
    print("Deleted unlinked variants")

    import random
    sku_counter = 100
    for cv in cvs:
        sku = f"OG-{cv.color_name[:2].upper()}-{sku_counter}"
        sku_counter += 1
        stock = random.randint(5, 15)
        price_override = p.base_price
        sale_override = p.sale_price

        # Check if a variant with these attributes already exists (e.g. linked to order)
        existing = p.variants.filter(
            size="",
            color=cv.color_name,
            fabric="",
            is_stitched=False
        ).first()

        if existing:
            existing.color_variant = cv
            existing.stock = stock
            existing.price_override = price_override
            existing.sale_price_override = sale_override
            existing.sku = sku
            existing.is_active = True
            existing.save()
            print(f"Updated existing variant: {sku}")
        else:
            v = ProductVariant.objects.create(
                product=p,
                color_variant=cv,
                sku=sku,
                size="",
                color=cv.color_name,
                fabric="",
                is_stitched=False,
                stock=stock,
                price_override=price_override,
                sale_price_override=sale_override,
                is_active=True
            )
            print(f"Created variant: {sku} | {v.color} | stock: {stock} | price: {v.price}")

    print("Recalculating stock...")
    p.recalculate_stock()
    print("Finished seeding successfully! Total stock:", p.stock)

if __name__ == "__main__":
    seed()
