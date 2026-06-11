from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="inventoryrecord",
            index=models.Index(fields=["created_at"], name="inventory_i_created_6087cb_idx"),
        ),
        migrations.AddIndex(
            model_name="stockledgerentry",
            index=models.Index(fields=["created_at"], name="inventory_s_created_b52c69_idx"),
        ),
        migrations.AddIndex(
            model_name="stockledgerentry",
            index=models.Index(fields=["movement_type"], name="inventory_s_movemen_15559c_idx"),
        ),
        migrations.AddIndex(
            model_name="stockledgerentry",
            index=models.Index(fields=["variant"], name="inventory_s_variant_900a91_idx"),
        ),
    ]
