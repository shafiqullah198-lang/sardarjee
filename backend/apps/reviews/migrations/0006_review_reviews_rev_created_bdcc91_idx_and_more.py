from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reviews", "0005_auto_publish_review_visibility"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="review",
            index=models.Index(fields=["created_at"], name="reviews_rev_created_bdcc91_idx"),
        ),
        migrations.AddIndex(
            model_name="review",
            index=models.Index(fields=["status"], name="reviews_rev_status_5966f7_idx"),
        ),
        migrations.AddIndex(
            model_name="review",
            index=models.Index(fields=["product"], name="reviews_rev_product_a9ee0d_idx"),
        ),
        migrations.AddIndex(
            model_name="review",
            index=models.Index(fields=["is_featured"], name="reviews_rev_is_feat_ac4864_idx"),
        ),
        migrations.AddIndex(
            model_name="review",
            index=models.Index(fields=["is_approved"], name="reviews_rev_is_appr_23bb75_idx"),
        ),
    ]
