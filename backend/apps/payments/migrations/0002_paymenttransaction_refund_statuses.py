from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="paymenttransaction",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("authorized", "Authorized"),
                    ("success", "Success"),
                    ("failed", "Failed"),
                    ("refunded", "Refunded"),
                    ("cancelled", "Cancelled"),
                ],
                default="pending",
                max_length=16,
            ),
        ),
    ]
