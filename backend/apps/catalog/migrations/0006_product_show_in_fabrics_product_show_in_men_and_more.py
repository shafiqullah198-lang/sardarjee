from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0005_remove_product_sale_price_product_discount_percent_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="show_in_fabrics",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="product",
            name="show_in_men",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="product",
            name="show_in_wedding",
            field=models.BooleanField(default=False),
        ),
    ]
