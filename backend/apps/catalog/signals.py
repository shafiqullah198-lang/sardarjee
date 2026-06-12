from __future__ import annotations

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.catalog.models import Category, Product
from apps.common.cache import invalidate_public_cache


def _invalidate_catalog_cache():
    transaction.on_commit(
        lambda: invalidate_public_cache(
            "products",
            "categories",
            "home-content",
            "home-stats",
            "live-home-stats",
        )
    )


@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def invalidate_catalog_public_cache(**kwargs):
    _invalidate_catalog_cache()

