from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0007_orderitem_unit_cost"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="courier_company",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="order",
            name="courier_shipment_id",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="order",
            name="courier_tracking_number",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="order",
            name="courier_booking_status",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="order",
            name="courier_response",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="order",
            name="courier_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
