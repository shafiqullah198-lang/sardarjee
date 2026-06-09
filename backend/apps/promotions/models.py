from django.db import models

from apps.catalog.models import Category, Product
from apps.common.models import TimeStampedModel


class Coupon(TimeStampedModel):
    class DiscountType(models.TextChoices):
        PERCENT = "percent", "Percent"
        FIXED = "fixed", "Fixed"

    code = models.CharField(max_length=40, unique=True)
    discount_type = models.CharField(max_length=16, choices=DiscountType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    max_uses = models.PositiveIntegerField(default=0)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    products = models.ManyToManyField(Product, blank=True, related_name="coupons")
    categories = models.ManyToManyField(Category, blank=True, related_name="coupons")
