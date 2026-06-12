from __future__ import annotations

from hashlib import md5

from django.core.cache import cache
from django.http import HttpRequest


PUBLIC_API_CACHE_TTL = 60


def _version_key(namespace: str) -> str:
    return f"public-api-version:{namespace}"


def get_public_cache_version(namespace: str) -> int:
    version = cache.get(_version_key(namespace))
    if version is None:
        version = 1
        cache.set(_version_key(namespace), version, None)
    return int(version)


def build_public_cache_key(request: HttpRequest, namespace: str) -> str:
    version = get_public_cache_version(namespace)
    digest = md5(request.get_full_path().encode("utf-8"), usedforsecurity=False).hexdigest()
    return f"public-api:{namespace}:v{version}:{digest}"


def get_public_cached_payload(request: HttpRequest, namespace: str):
    return cache.get(build_public_cache_key(request, namespace))


def set_public_cached_payload(request: HttpRequest, namespace: str, payload, ttl: int = PUBLIC_API_CACHE_TTL):
    cache.set(build_public_cache_key(request, namespace), payload, ttl)


def invalidate_public_cache(*namespaces: str):
    seen: set[str] = set()
    for namespace in namespaces:
        if not namespace or namespace in seen:
            continue
        seen.add(namespace)
        key = _version_key(namespace)
        version = cache.get(key)
        if version is None:
            cache.set(key, 2, None)
        else:
            cache.set(key, int(version) + 1, None)

