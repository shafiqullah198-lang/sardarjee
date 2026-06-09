from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="homepagebanner",
            name="secondary_cta_text",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="homepagebanner",
            name="secondary_cta_url",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.CreateModel(
            name="HomepageDisplaySettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("lookbook_title", models.CharField(default="Latest Product Looks", max_length=160)),
                ("lookbook_limit", models.PositiveSmallIntegerField(default=6)),
                ("reviews_title", models.CharField(default="Customer Reviews", max_length=160)),
                ("is_lookbook_active", models.BooleanField(default=True)),
                ("is_reviews_active", models.BooleanField(default=True)),
            ],
            options={"abstract": False},
        ),
        migrations.CreateModel(
            name="HomepageStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=120)),
                ("number", models.CharField(max_length=40)),
                ("label", models.CharField(blank=True, max_length=120)),
                ("icon", models.CharField(blank=True, max_length=40)),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
            ],
            options={"abstract": False},
        ),
        migrations.CreateModel(
            name="HomepageStory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=255)),
                ("text", models.TextField()),
                ("image", models.FileField(blank=True, upload_to="cms/story/")),
                ("cta_text", models.CharField(blank=True, max_length=80)),
                ("cta_url", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"abstract": False},
        ),
    ]
