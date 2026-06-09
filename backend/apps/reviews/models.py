from django.conf import settings
from django.db import models

from apps.catalog.models import Product
from apps.common.models import TimeStampedModel


class Review(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        HIDDEN = "hidden", "Hidden spam"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="reviews", blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    guest_name = models.CharField(max_length=120, blank=True)
    customer_name = models.CharField(max_length=120, blank=True)
    customer_profile_image = models.ImageField(upload_to="reviews/profiles/", blank=True, null=True)
    rating = models.PositiveSmallIntegerField(default=5)
    title = models.CharField(max_length=120, blank=True)
    review_text = models.TextField(blank=True)
    comment = models.TextField(blank=True)
    image = models.ImageField(upload_to="reviews/", blank=True, null=True)
    review_image = models.ImageField(upload_to="reviews/", blank=True, null=True)
    verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)
    is_spam = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.APPROVED)
    helpful_count = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
