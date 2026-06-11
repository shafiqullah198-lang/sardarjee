from django.db import migrations, models


def backfill_unit_cost(apps, schema_editor):
    OrderItem = apps.get_model("orders", "OrderItem")
    for item in OrderItem.objects.select_related("variant__product").all():
        cost_price = getattr(item.variant.product, "cost_price", 0) or 0
        item.unit_cost = cost_price
        item.save(update_fields=["unit_cost"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0006_variant_gallery_and_stock_snapshot"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="unit_cost",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.RunPython(backfill_unit_cost, noop),
    ]
