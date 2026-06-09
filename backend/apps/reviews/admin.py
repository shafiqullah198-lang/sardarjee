from django.contrib import admin
from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("display_name", "product", "rating", "status", "verified_purchase", "is_featured", "created_at")
    list_filter = ("status", "verified_purchase", "is_featured", "rating")
    search_fields = ("guest_name", "customer_name", "user__email", "product__name", "review_text", "comment", "ip_address")
    readonly_fields = (
        "user",
        "product",
        "guest_name",
        "customer_name",
        "customer_profile_image",
        "rating",
        "title",
        "review_text",
        "comment",
        "image",
        "review_image",
        "verified_purchase",
        "helpful_count",
        "ip_address",
        "created_at",
        "updated_at",
    )
    fields = readonly_fields + ("status", "is_featured")

    def has_add_permission(self, request):
        return False

    def display_name(self, obj):
        if obj.guest_name or obj.customer_name:
            return obj.guest_name or obj.customer_name
        return obj.user.email if obj.user else "Guest"
