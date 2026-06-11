from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0005_careeropportunity"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="careeropportunity",
            index=models.Index(fields=["created_at"], name="cms_careero_created_527805_idx"),
        ),
        migrations.AddIndex(
            model_name="careeropportunity",
            index=models.Index(fields=["is_active"], name="cms_careero_is_acti_12c393_idx"),
        ),
        migrations.AddIndex(
            model_name="homepagebanner",
            index=models.Index(fields=["is_active"], name="cms_homepag_is_acti_a99c3b_idx"),
        ),
        migrations.AddIndex(
            model_name="homepagebanner",
            index=models.Index(fields=["sort_order"], name="cms_homepag_sort_or_71055e_idx"),
        ),
        migrations.AddIndex(
            model_name="homepagestat",
            index=models.Index(fields=["stat_type"], name="cms_homepag_stat_ty_624129_idx"),
        ),
        migrations.AddIndex(
            model_name="homepagestat",
            index=models.Index(fields=["is_active"], name="cms_homepag_is_acti_b92b9e_idx"),
        ),
        migrations.AddIndex(
            model_name="homepagestat",
            index=models.Index(fields=["sort_order"], name="cms_homepag_sort_or_1ac4b0_idx"),
        ),
        migrations.AddIndex(
            model_name="homepagestory",
            index=models.Index(fields=["is_active"], name="cms_homepag_is_acti_833897_idx"),
        ),
        migrations.AddIndex(
            model_name="homepagestory",
            index=models.Index(fields=["created_at"], name="cms_homepag_created_955ccc_idx"),
        ),
    ]
