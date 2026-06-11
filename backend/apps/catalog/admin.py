from django.contrib import admin

from apps.catalog.models import (
    Brand,
    Category,
    Product,
    ProductColorVariant,
    ProductColorVariantImage,
    ProductImage,
    ProductTag,
    ProductVariant,
    ProductVariantImage,
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    readonly_fields = ("thumbnail",)


class ProductColorVariantImageInline(admin.TabularInline):
    """Gallery images for a single colour variant."""
    model = ProductColorVariantImage
    extra = 2
    readonly_fields = ("thumbnail",)
    fields = ("image", "thumbnail", "alt_text", "sort_order")


@admin.register(ProductColorVariant)
class ProductColorVariantAdmin(admin.ModelAdmin):
    list_display = ("product", "color_name", "color_hex", "stock")
    list_filter = ("product",)
    search_fields = ("product__name", "color_name")
    inlines = [ProductColorVariantImageInline]


class ProductColorVariantInline(admin.TabularInline):
    model = ProductColorVariant
    extra = 1
    fields = ("color_name", "color_hex", "stock", "image")
    show_change_link = True


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = (
        "sku",
        "color",
        "size",
        "fabric",
        "is_stitched",
        "color_variant",
        "stock",
        "price_override",
        "sale_price_override",
        "is_active",
    )
    autocomplete_fields = []


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "cost_price",
        "base_price",
        "is_on_sale",
        "discount_percent",
        "sale_price",
        "stock",
        "status",
        "show_in_men",
        "show_in_wedding",
        "show_in_fabrics",
    )
    list_filter = (
        "status",
        "is_on_sale",
        "show_in_men",
        "show_in_wedding",
        "show_in_fabrics",
        "is_featured",
        "is_trending",
        "is_new_arrival",
        "category",
    )
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
admin.site.register(ProductVariantImage)
