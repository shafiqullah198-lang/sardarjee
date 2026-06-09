from django.contrib import admin
from apps.orders.models import Order, OrderItem, OrderStatusEvent, ReturnRequest


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "sku", "unit_price", "quantity", "line_total")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("number", "user", "status", "grand_total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("number", "user__email")
    inlines = [OrderItemInline]


admin.site.register(OrderStatusEvent)
admin.site.register(ReturnRequest)
