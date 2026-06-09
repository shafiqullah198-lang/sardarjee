from django.db import migrations, models
from django.utils import timezone


def backfill_tracking_ids(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.filter(tracking_id="").order_by("id"):
        date_part = timezone.localtime(order.created_at).strftime("%Y%m%d") if order.created_at else timezone.localdate().strftime("%Y%m%d")
        order.tracking_id = f"SG-{date_part}-{order.id % 10000:04d}"
        order.save(update_fields=["tracking_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_order_refund_inventory_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="payment_screenshot",
            field=models.ImageField(blank=True, null=True, upload_to="payment-proofs/"),
        ),
        migrations.AddField(
            model_name="order",
            name="tracking_id",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("placed", "Placed"),
                    ("confirmed", "Confirmed"),
                    ("processing", "Processing"),
                    ("packed", "Packed"),
                    ("out_for_delivery", "Out For Delivery"),
                    ("shipped", "Shipped"),
                    ("delivered", "Delivered"),
                    ("cancelled", "Cancelled"),
                    ("returned", "Returned"),
                    ("refunded", "Refunded"),
                ],
                default="pending",
                max_length=16,
            ),
        ),
        migrations.RunPython(backfill_tracking_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="order",
            name="tracking_id",
            field=models.CharField(blank=True, max_length=32, unique=True),
        ),
    ]
