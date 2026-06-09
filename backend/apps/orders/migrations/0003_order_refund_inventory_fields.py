from django.db import migrations, models
import django.db.models.deletion


def mark_existing_pos_inventory(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(source="pos").update(inventory_reduced=True)


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_product_show_in_fabrics_product_show_in_men_and_more"),
        ("orders", "0002_order_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="inventory_reduced",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="refunded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="refunded_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="order",
            name="refund_reason",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="color_variant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="order_items",
                to="catalog.productcolorvariant",
            ),
        ),
        migrations.RunPython(mark_existing_pos_inventory, migrations.RunPython.noop),
    ]
