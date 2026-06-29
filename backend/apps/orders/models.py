from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.catalog.models import ProductColorVariant, ProductVariant
from apps.common.models import TimeStampedModel


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PLACED = "placed", "Placed"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        PACKED = "packed", "Packed"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out For Delivery"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        RETURNED = "returned", "Returned"
        REFUNDED = "refunded", "Refunded"

    class Source(models.TextChoices):
        WEBSITE = "website", "Website"
        POS = "pos", "POS"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    number = models.CharField(max_length=32, unique=True)
    tracking_id = models.CharField(max_length=32, unique=True, blank=True)
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.WEBSITE)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_name = models.CharField(max_length=120)
    shipping_phone = models.CharField(max_length=20)
    shipping_line1 = models.CharField(max_length=255)
    shipping_city = models.CharField(max_length=100)
    shipping_country = models.CharField(max_length=100, default="Pakistan")
    payment_screenshot = models.ImageField(upload_to="payment-proofs/", blank=True, null=True)
    inventory_reduced = models.BooleanField(default=False)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_reason = models.CharField(max_length=255, blank=True)
    courier_company = models.CharField(max_length=50, blank=True)
    courier_shipment_id = models.CharField(max_length=100, blank=True)
    courier_tracking_number = models.CharField(max_length=100, blank=True)
    courier_booking_status = models.CharField(max_length=30, blank=True)
    courier_response = models.JSONField(default=dict, blank=True)
    courier_created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["source"]),
            models.Index(fields=["user"]),
        ]

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            date_part = timezone.localdate().strftime("%Y%m%d")
            base = f"SG-{date_part}"
            latest = (
                Order.objects.filter(tracking_id__startswith=base)
                .order_by("-id")
                .values_list("id", flat=True)
                .first()
                or 0
            )
            self.tracking_id = f"{base}-{(latest + 1) % 10000:04d}"
        super().save(*args, **kwargs)


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)
    color_variant = models.ForeignKey(ProductColorVariant, null=True, blank=True, on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    # Snapshots — preserved even if variants are later edited/deleted
    variant_color = models.CharField(max_length=80, blank=True)
    variant_size = models.CharField(max_length=20, blank=True)
    variant_fabric = models.CharField(max_length=80, blank=True)
    variant_is_stitched = models.BooleanField(null=True, blank=True)
    variant_image_url = models.CharField(max_length=500, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["variant"]),
            models.Index(fields=["color_variant"]),
        ]


class OrderStatusEvent(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_events")
    from_status = models.CharField(max_length=16, blank=True)
    to_status = models.CharField(max_length=16)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["to_status"]),
        ]


class ReturnRequest(TimeStampedModel):
    class ReturnStatus(models.TextChoices):
        REQUESTED = "requested", "Requested"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        REFUNDED = "refunded", "Refunded"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="return_requests")
    reason = models.TextField()
    status = models.CharField(max_length=16, choices=ReturnStatus.choices, default=ReturnStatus.REQUESTED)
