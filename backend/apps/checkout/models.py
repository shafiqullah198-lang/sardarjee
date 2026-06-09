from django.db import models

from apps.common.models import TimeStampedModel


class CheckoutSession(TimeStampedModel):
    cart_id = models.CharField(max_length=100)
    idempotency_key = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, default="started")
