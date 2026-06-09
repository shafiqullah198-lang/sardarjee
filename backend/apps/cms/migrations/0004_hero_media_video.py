from django.db import migrations, models


def backfill_hero_media(apps, schema_editor):
    HomepageBanner = apps.get_model("cms", "HomepageBanner")
    for banner in HomepageBanner.objects.exclude(image=""):
        if not banner.hero_media:
            banner.hero_media = banner.image
            banner.media_type = "image"
            banner.save(update_fields=["hero_media", "media_type"])


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0003_homepagestat_live_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="homepagebanner",
            name="image",
            field=models.FileField(blank=True, null=True, upload_to="cms/banners/"),
        ),
        migrations.AddField(
            model_name="homepagebanner",
            name="hero_media",
            field=models.FileField(blank=True, null=True, upload_to="hero/"),
        ),
        migrations.AddField(
            model_name="homepagebanner",
            name="media_type",
            field=models.CharField(choices=[("image", "Image"), ("video", "Video")], default="image", max_length=10),
        ),
        migrations.RunPython(backfill_hero_media, migrations.RunPython.noop),
    ]
