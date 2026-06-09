import django.db.models.deletion
from django.db import migrations, models


def backfill_product_stock(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    InventoryRecord = apps.get_model("inventory", "InventoryRecord")
    for product in Product.objects.all():
        total = (
            InventoryRecord.objects.filter(variant__product=product)
            .aggregate(total=models.Sum("quantity"))["total"]
            or 0
        )
        product.stock = max(0, total)
        product.save(update_fields=["stock"])


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0003_alter_category_image"),
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="stock",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="ProductColorVariant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("color_name", models.CharField(max_length=80)),
                ("color_hex", models.CharField(blank=True, max_length=20, null=True)),
                ("stock", models.PositiveIntegerField(default=0)),
                ("image", models.ImageField(blank=True, null=True, upload_to="product-colors/")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="color_variants", to="catalog.product")),
            ],
            options={
                "ordering": ("id",),
            },
        ),
        migrations.RunPython(backfill_product_stock, migrations.RunPython.noop),
    ]
