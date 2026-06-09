from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_paymenttransaction_refund_statuses"),
    ]

    operations = [
        migrations.AlterField(
            model_name="paymenttransaction",
            name="provider",
            field=models.CharField(
                choices=[
                    ("cod", "Cash on Delivery"),
                    ("stripe", "Stripe"),
                    ("paypal", "PayPal"),
                    ("easypaisa", "EasyPaisa"),
                    ("jazzcash", "JazzCash"),
                    ("bank_transfer", "Bank Transfer"),
                ],
                max_length=20,
            ),
        ),
    ]
