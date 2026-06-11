from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_order_tracking_payment_proof_statuses"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=["created_at"], name="orders_orde_created_0e92de_idx"),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=["status"], name="orders_orde_status_c6dd84_idx"),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=["source"], name="orders_orde_source_e5e59d_idx"),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=["user"], name="orders_orde_user_id_a87c6f_idx"),
        ),
        migrations.AddIndex(
            model_name="orderitem",
            index=models.Index(fields=["order"], name="orders_orde_order_i_5d347b_idx"),
        ),
        migrations.AddIndex(
            model_name="orderitem",
            index=models.Index(fields=["variant"], name="orders_orde_variant_164791_idx"),
        ),
        migrations.AddIndex(
            model_name="orderitem",
            index=models.Index(fields=["color_variant"], name="orders_orde_color_v_1f9be3_idx"),
        ),
        migrations.AddIndex(
            model_name="orderstatusevent",
            index=models.Index(fields=["order"], name="orders_orde_order_i_e9fa37_idx"),
        ),
        migrations.AddIndex(
            model_name="orderstatusevent",
            index=models.Index(fields=["created_at"], name="orders_orde_created_4769b2_idx"),
        ),
        migrations.AddIndex(
            model_name="orderstatusevent",
            index=models.Index(fields=["to_status"], name="orders_orde_to_stat_35cff7_idx"),
        ),
    ]
