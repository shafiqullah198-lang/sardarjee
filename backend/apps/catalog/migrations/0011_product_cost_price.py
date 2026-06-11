from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0010_product_archived_at_product_is_active_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="cost_price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
