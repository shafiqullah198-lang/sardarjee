from django.contrib import admin

from apps.catalog.models import Brand, Category, Product, ProductColorVariant, ProductImage, ProductTag, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


class ProductColorVariantInline(admin.TabularInline):
    model = ProductColorVariant
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "base_price", "is_on_sale", "discount_percent", "sale_price", "stock", "status", "show_in_men", "show_in_wedding", "show_in_fabrics")
    list_filter = ("status", "is_on_sale", "show_in_men", "show_in_wedding", "show_in_fabrics", "is_featured", "is_trending", "is_new_arrival", "category")
    search_fields = ("name", "slug", "description")
    readonly_fields = ("stock",)
    inlines = [ProductVariantInline, ProductColorVariantInline, ProductImageInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "is_active")
    list_filter = ("is_active", "parent")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


admin.site.register(Brand)
admin.site.register(ProductTag)
