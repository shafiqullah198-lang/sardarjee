from django.contrib import admin
from apps.cms.models import CareerOpportunity, HomepageBanner, HomepageDisplaySettings, HomepageStat, HomepageStory, NewsletterSubscription, Testimonial

admin.site.register(HomepageBanner)
admin.site.register(HomepageStat)
admin.site.register(HomepageStory)
admin.site.register(HomepageDisplaySettings)
admin.site.register(Testimonial)
admin.site.register(NewsletterSubscription)


@admin.register(CareerOpportunity)
class CareerOpportunityAdmin(admin.ModelAdmin):
    list_display = ("title", "department", "location", "job_type", "is_active", "created_at")
    list_filter = ("is_active", "department", "job_type")
    search_fields = ("title", "department", "location", "description", "requirements")
    list_editable = ("is_active",)
