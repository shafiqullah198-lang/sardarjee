from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0004_hero_media_video"),
    ]

    operations = [
        migrations.CreateModel(
            name="CareerOpportunity",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=180)),
                ("department", models.CharField(max_length=120)),
                ("location", models.CharField(max_length=160)),
                ("job_type", models.CharField(max_length=80)),
                ("description", models.TextField()),
                ("requirements", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "Career Opportunity",
                "verbose_name_plural": "Careers / Opportunities",
                "ordering": ("-created_at",),
            },
        ),
    ]
