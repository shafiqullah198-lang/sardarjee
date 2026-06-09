from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0002_homepage_dynamic_sections"),
    ]

    operations = [
        migrations.AddField(
            model_name="homepagestat",
            name="stat_type",
            field=models.CharField(
                choices=[
                    ("total_products", "Total products"),
                    ("total_orders", "Total orders"),
                    ("total_sales", "Total sales"),
                    ("total_customers", "Total customers"),
                    ("total_reviews", "Total reviews"),
                    ("average_rating", "Average rating"),
                    ("low_stock", "Low stock"),
                ],
                default="total_products",
                max_length=40,
            ),
        ),
        migrations.AlterField(
            model_name="homepagestat",
            name="number",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
    ]
