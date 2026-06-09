from rest_framework import serializers

from apps.cms.models import CareerOpportunity, HomepageBanner, HomepageDisplaySettings, HomepageStat, HomepageStory, Testimonial


class HomepageBannerSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()
    hero_media_url = serializers.SerializerMethodField()

    class Meta:
        model = HomepageBanner
        fields = (
            "id",
            "title",
            "subtitle",
            "image",
            "hero_media",
            "media_type",
            "media_url",
            "hero_media_url",
            "cta_text",
            "cta_url",
            "secondary_cta_text",
            "secondary_cta_url",
            "is_active",
            "sort_order",
        )

    def get_media_url(self, obj):
        media = obj.hero_media or obj.image
        if not media:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(media.url)
        return media.url

    def get_hero_media_url(self, obj):
        return self.get_media_url(obj)


class HomepageStatSerializer(serializers.ModelSerializer):
    value = serializers.CharField(read_only=True)

    class Meta:
        model = HomepageStat
        fields = ("id", "stat_type", "title", "number", "value", "label", "icon", "is_active", "sort_order")


class HomepageStorySerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageStory
        fields = ("id", "title", "text", "image", "cta_text", "cta_url", "is_active")


class HomepageDisplaySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageDisplaySettings
        fields = ("id", "lookbook_title", "lookbook_limit", "reviews_title", "is_lookbook_active", "is_reviews_active")


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ("name", "location", "text", "rating")


class CareerOpportunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerOpportunity
        fields = (
            "id",
            "title",
            "department",
            "location",
            "job_type",
            "description",
            "requirements",
            "is_active",
            "created_at",
            "updated_at",
        )
