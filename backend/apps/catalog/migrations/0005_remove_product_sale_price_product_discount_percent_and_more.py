from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


def backfill_sale_discounts(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    for product in Product.objects.exclude(sale_price__isnull=True):
        if product.base_price and product.sale_price < product.base_price:
            product.is_on_sale = True
            product.discount_percent = round(((product.base_price - product.sale_price) / product.base_price) * 100, 2)
            product.save(update_fields=["is_on_sale", "discount_percent"])


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0004_product_stock_color_variants"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="discount_percent",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=5,
                validators=[MinValueValidator(0), MaxValueValidator(100)],
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="is_on_sale",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_sale_discounts, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="product",
            name="sale_price",
        ),
    ]
