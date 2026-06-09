from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Notification(TimeStampedModel):
    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        IN_APP = "in_app", "In App"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=16, choices=Channel.choices)
    subject = models.CharField(max_length=150)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
