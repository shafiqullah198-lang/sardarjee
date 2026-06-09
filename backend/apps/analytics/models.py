from django.db import models

from apps.common.models import TimeStampedModel


class EventLog(TimeStampedModel):
    event_name = models.CharField(max_length=120)
    payload = models.JSONField(default=dict, blank=True)
