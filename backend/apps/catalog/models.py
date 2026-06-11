from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify

from apps.common.models import TimeStampedModel
from apps.common.images import build_thumbnail, compress_uploaded_image


class Category(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Brand(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=160, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=300, unique=True, blank=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(Brand, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    is_on_sale = models.BooleanField(default=False)
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    is_active = models.BooleanField(default=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    is_trending = models.BooleanField(default=False)
    is_new_arrival = models.BooleanField(default=False)
    show_in_men = models.BooleanField(default=False)
    show_in_wedding = models.BooleanField(default=False)
    show_in_fabrics = models.BooleanField(default=False)
    stock = models.PositiveIntegerField(default=0)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.CharField(max_length=500, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["category"]),
            models.Index(fields=["is_featured"]),
            models.Index(fields=["is_trending"]),
            models.Index(fields=["is_new_arrival"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def has_discount(self):
        return self.is_on_sale and self.discount_percent > 0

    @property
    def buy_price(self):
        return self.cost_price

    @property
    def selling_price(self):
        return self.base_price

    @property
    def sale_price(self):
        if not self.has_discount:
            return None
        discount = self.selling_price * self.discount_percent / Decimal("100")
        return (self.selling_price - discount).quantize(Decimal("0.01"))

    @property
    def effective_price(self):
        return self.sale_price or self.selling_price

    def recalculate_stock(self):
        from apps.inventory.services import sync_product_stock
        return sync_product_stock(self)


class ProductColorVariant(TimeStampedModel):
    """A colour option for a product, with optional stock, hex colour, and a primary image."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="color_variants")
    color_name = models.CharField(max_length=80)
    color_hex = models.CharField(max_length=20, blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    # Legacy single image kept for backward compatibility; gallery images live in ProductColorVariantImage
    image = models.ImageField(upload_to="product-colors/", blank=True, null=True)

    class Meta:
        ordering = ("id",)
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.image:
            compress_uploaded_image(self.image)
        super().save(*args, **kwargs)
        self.product.recalculate_stock()

    def delete(self, *args, **kwargs):
        product = self.product
        result = super().delete(*args, **kwargs)
        product.recalculate_stock()
        return result

    def __str__(self):
        return f"{self.product.name} - {self.color_name}"


class ProductColorVariantImage(TimeStampedModel):
    """Multiple gallery images for a single colour variant."""

    color_variant = models.ForeignKey(ProductColorVariant, on_delete=models.CASCADE, related_name="images")
    image = models.FileField(upload_to="product-color-images/")
    thumbnail = models.ImageField(upload_to="product-color-images/thumbnails/", blank=True, null=True)
    alt_text = models.CharField(max_length=150, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")
        indexes = [
            models.Index(fields=["color_variant", "sort_order"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.image:
            compress_uploaded_image(self.image)
            thumbnail = build_thumbnail(self.image)
            if thumbnail is not None:
                self.thumbnail.save(thumbnail.name, thumbnail, save=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.color_variant} image #{self.sort_order}"


class ProductVariant(TimeStampedModel):
    """A specific SKU combining product + color + size + fabric + stitch options."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    # Optional FK to color variant so variant images resolve automatically
    color_variant = models.ForeignKey(
        ProductColorVariant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="variants",
    )
    sku = models.CharField(max_length=64, unique=True)
    size = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=40, blank=True)
    fabric = models.CharField(max_length=80, blank=True)
    is_stitched = models.BooleanField(
        default=False,
        help_text="True = stitched, False = unstitched. Only relevant when fabric variants differ.",
    )
    stock = models.PositiveIntegerField(default=0)
    price_override = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sale_price_override = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="If set, this overrides the product-level sale price for this variant.",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("product", "size", "color", "fabric", "is_stitched")
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["color_variant"]),
        ]

    @property
    def price(self):
        return self.price_override or self.product.effective_price

    @property
    def cost_price(self):
        return self.product.cost_price

    @property
    def sale_price(self):
        if self.sale_price_override is not None:
            return self.sale_price_override
        return self.product.sale_price

    @property
    def effective_price(self):
        return self.price

    def __str__(self):
        parts = [self.product.name]
        if self.color:
            parts.append(self.color)
        if self.size:
            parts.append(self.size)
        if self.fabric:
            parts.append(self.fabric)
        return " / ".join(parts)


class ProductVariantImage(TimeStampedModel):
    """Multiple gallery images for a single product variant."""

    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="images")
    image = models.FileField(upload_to="product-variant-images/")
    thumbnail = models.ImageField(upload_to="product-variant-images/thumbnails/", blank=True, null=True)
    alt_text = models.CharField(max_length=150, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")
        indexes = [
            models.Index(fields=["variant", "sort_order"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.image:
            compress_uploaded_image(self.image)
            thumbnail = build_thumbnail(self.image)
            if thumbnail is not None:
                self.thumbnail.save(thumbnail.name, thumbnail, save=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.variant} image #{self.sort_order}"


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.FileField(upload_to="products/")
    thumbnail = models.ImageField(upload_to="products/thumbnails/", blank=True, null=True)
    alt_text = models.CharField(max_length=150, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=["product", "sort_order"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.image:
            compress_uploaded_image(self.image)
            thumbnail = build_thumbnail(self.image)
            if thumbnail is not None:
                self.thumbnail.save(thumbnail.name, thumbnail, save=False)
        super().save(*args, **kwargs)


class ProductTag(TimeStampedModel):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    products = models.ManyToManyField(Product, related_name="tags", blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
