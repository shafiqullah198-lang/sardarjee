from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0004_paymenttransaction_cash_only"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="paymenttransaction",
            index=models.Index(fields=["created_at"], name="payments_pa_created_a246c6_idx"),
        ),
        migrations.AddIndex(
            model_name="paymenttransaction",
            index=models.Index(fields=["status"], name="payments_pa_status_b6726a_idx"),
        ),
        migrations.AddIndex(
            model_name="paymenttransaction",
            index=models.Index(fields=["provider"], name="payments_pa_provide_51dff6_idx"),
        ),
        migrations.AddIndex(
            model_name="paymenttransaction",
            index=models.Index(fields=["order"], name="payments_pa_order_i_d65105_idx"),
        ),
    ]
