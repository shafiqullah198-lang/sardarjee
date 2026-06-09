from django.db import migrations, models


def backfill_order_sources(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(number__startswith="POS-").update(source="pos")
    Order.objects.exclude(number__startswith="POS-").update(source="website")


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="source",
            field=models.CharField(
                choices=[("website", "Website"), ("pos", "POS")],
                default="website",
                max_length=16,
            ),
        ),
        migrations.RunPython(backfill_order_sources, migrations.RunPython.noop),
    ]
