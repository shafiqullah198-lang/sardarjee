from __future__ import annotations

from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps


def _open_image(file_obj):
    file_obj.open("rb")
    image = Image.open(file_obj)
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    return image


def compress_uploaded_image(field_file, quality=82):
    if not field_file:
        return

    image = _open_image(field_file)
    output = BytesIO()
    image.save(output, format="JPEG", optimize=True, quality=quality)
    output.seek(0)
    stem = Path(field_file.name).stem
    field_file.save(f"{stem}.jpg", ContentFile(output.read()), save=False)


def build_thumbnail(field_file, width=640, height=640, quality=76):
    if not field_file:
        return None

    image = _open_image(field_file)
    image.thumbnail((width, height))
    output = BytesIO()
    image.save(output, format="WEBP", optimize=True, quality=quality)
    output.seek(0)
    stem = Path(field_file.name).stem
    return ContentFile(output.read(), name=f"{stem}-thumb.webp")
