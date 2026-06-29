from django.contrib import admin, messages
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.html import format_html

from apps.orders.models import Order, OrderItem, OrderStatusEvent, ReturnRequest
from services.courier_service import CourierBookingError, create_courier_shipment


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "sku", "unit_price", "quantity", "line_total")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("number", "user", "status", "grand_total", "courier_booking_status", "courier_tracking_number", "created_at")
    list_filter = ("status", "courier_booking_status", "created_at")
    search_fields = ("number", "tracking_id", "courier_tracking_number", "user__email")
    readonly_fields = (
        "courier_company",
        "courier_shipment_id",
        "courier_tracking_number",
        "courier_booking_status",
        "courier_response",
        "courier_created_at",
        "create_courier_booking_button",
    )
    inlines = [OrderItemInline]

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<int:order_id>/create-courier-booking/",
                self.admin_site.admin_view(self.create_courier_booking),
                name="orders_order_create_courier_booking",
            ),
        ]
        return custom_urls + urls

    def create_courier_booking_button(self, obj):
        if not obj or not obj.pk:
            return "-"
        if obj.courier_tracking_number:
            return format_html("<strong>{}</strong>", obj.courier_tracking_number)
        if obj.status != Order.Status.CONFIRMED:
            return "Available after order is confirmed"
        url = reverse("admin:orders_order_create_courier_booking", args=[obj.pk])
        if obj.courier_booking_status not in ("", "failed"):
            return obj.courier_booking_status
        return format_html('<a class="button" href="{}">Send to Shipment</a>', url)
    create_courier_booking_button.short_description = "Manual courier booking"

    def create_courier_booking(self, request, order_id):
        order = Order.objects.get(pk=order_id)
        if order.status != Order.Status.CONFIRMED:
            self.message_user(request, "Courier booking is only available for confirmed orders.", level=messages.WARNING)
            return redirect(reverse("admin:orders_order_change", args=[order_id]))
        try:
            create_courier_shipment(order)
        except CourierBookingError as exc:
            self.message_user(request, f"Order confirmed but courier booking failed. {exc}", level=messages.WARNING)
        else:
            self.message_user(request, "Courier booking created.", level=messages.SUCCESS)
        return redirect(reverse("admin:orders_order_change", args=[order_id]))


admin.site.register(OrderStatusEvent)
admin.site.register(ReturnRequest)
