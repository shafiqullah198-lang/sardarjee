from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.accounts.models import Address, EmailVerificationToken, User, UserProfile


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ("-created_at",)
    list_display = ("email", "first_name", "last_name", "role", "is_staff", "is_email_verified")
    fieldsets = UserAdmin.fieldsets + (
        ("Commerce", {"fields": ("role", "is_email_verified")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Commerce", {"fields": ("role",)}),
    )


admin.site.register(UserProfile)
admin.site.register(Address)
admin.site.register(EmailVerificationToken)
