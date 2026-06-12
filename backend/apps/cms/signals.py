from __future__ import annotations

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.cms.models import HomepageBanner, HomepageDisplaySettings, HomepageStat, HomepageStory
from apps.common.cache import invalidate_public_cache


def _invalidate_cms_cache():
    transaction.on_commit(
        lambda: invalidate_public_cache(
            "home-content",
            "home-stats",
            "live-home-stats",
        )
    )


@receiver(post_save, sender=HomepageBanner)
@receiver(post_delete, sender=HomepageBanner)
@receiver(post_save, sender=HomepageStat)
@receiver(post_delete, sender=HomepageStat)
@receiver(post_save, sender=HomepageStory)
@receiver(post_delete, sender=HomepageStory)
@receiver(post_save, sender=HomepageDisplaySettings)
@receiver(post_delete, sender=HomepageDisplaySettings)
def invalidate_cms_public_cache(**kwargs):
    _invalidate_cms_cache()

