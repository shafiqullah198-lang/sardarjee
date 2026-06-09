from django.db import models

from apps.common.models import TimeStampedModel
from apps.orders.models import Order


class PaymentTransaction(TimeStampedModel):
    class Provider(models.TextChoices):
        CASH = "cash", "Cash"
        EASYPAISA = "easypaisa", "EasyPaisa"
        JAZZCASH = "jazzcash", "JazzCash"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        AUTHORIZED = "authorized", "Authorized"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        CANCELLED = "cancelled", "Cancelled"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=20, choices=Provider.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    provider_reference = models.CharField(max_length=120, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
