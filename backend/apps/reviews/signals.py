from __future__ import annotations

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.common.cache import invalidate_public_cache
from apps.reviews.models import Review


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def invalidate_review_public_cache(**kwargs):
    transaction.on_commit(
        lambda: invalidate_public_cache(
            "products",
            "reviews",
            "home-content",
            "home-stats",
            "live-home-stats",
        )
    )

