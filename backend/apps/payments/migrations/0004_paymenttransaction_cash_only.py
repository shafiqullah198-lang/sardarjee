from django.db import migrations, models


def convert_cod_to_cash(apps, schema_editor):
    PaymentTransaction = apps.get_model("payments", "PaymentTransaction")
    PaymentTransaction.objects.filter(provider="cod").update(provider="cash")


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0003_paymenttransaction_bank_transfer"),
    ]

    operations = [
        migrations.RunPython(convert_cod_to_cash, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="paymenttransaction",
            name="provider",
            field=models.CharField(
                choices=[
                    ("cash", "Cash"),
                    ("easypaisa", "EasyPaisa"),
                    ("jazzcash", "JazzCash"),
                    ("bank_transfer", "Bank Transfer"),
                ],
                max_length=20,
            ),
        ),
    ]
