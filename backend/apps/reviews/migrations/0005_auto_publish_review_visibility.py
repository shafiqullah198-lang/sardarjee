from django.db import migrations, models


def backfill_review_visibility(apps, schema_editor):
    Review = apps.get_model("reviews", "Review")
    Review.objects.filter(status="hidden").update(is_approved=True, is_hidden=True, is_spam=True)
    Review.objects.filter(status="rejected").update(is_approved=True, is_hidden=True, is_spam=False)
    Review.objects.exclude(status__in=["hidden", "rejected"]).update(
        is_approved=True,
        is_hidden=False,
        is_spam=False,
        status="approved",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("reviews", "0004_review_is_approved"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="is_hidden",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="review",
            name="is_spam",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="review",
            name="is_approved",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="review",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("hidden", "Hidden spam"),
                ],
                default="approved",
                max_length=16,
            ),
        ),
        migrations.RunPython(backfill_review_visibility, migrations.RunPython.noop),
    ]
