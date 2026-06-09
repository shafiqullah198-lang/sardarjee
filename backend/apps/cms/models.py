from django.db import models

from apps.common.models import TimeStampedModel


class HomepageBanner(TimeStampedModel):
    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    image = models.FileField(upload_to="cms/banners/", blank=True, null=True)
    hero_media = models.FileField(upload_to="hero/", blank=True, null=True)
    media_type = models.CharField(max_length=10, choices=MediaType.choices, default=MediaType.IMAGE)
    cta_text = models.CharField(max_length=80, blank=True)
    cta_url = models.CharField(max_length=255, blank=True)
    secondary_cta_text = models.CharField(max_length=80, blank=True)
    secondary_cta_url = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)


class HomepageStat(TimeStampedModel):
    class StatType(models.TextChoices):
        TOTAL_PRODUCTS = "total_products", "Total products"
        TOTAL_ORDERS = "total_orders", "Total orders"
        TOTAL_SALES = "total_sales", "Total sales"
        TOTAL_CUSTOMERS = "total_customers", "Total customers"
        TOTAL_REVIEWS = "total_reviews", "Total reviews"
        AVERAGE_RATING = "average_rating", "Average rating"
        LOW_STOCK = "low_stock", "Low stock"

    stat_type = models.CharField(max_length=40, choices=StatType.choices, default=StatType.TOTAL_PRODUCTS)
    title = models.CharField(max_length=120)
    number = models.CharField(max_length=40, blank=True, default="")
    label = models.CharField(max_length=120, blank=True)
    icon = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)


class HomepageStory(TimeStampedModel):
    title = models.CharField(max_length=255)
    text = models.TextField()
    image = models.FileField(upload_to="cms/story/", blank=True)
    cta_text = models.CharField(max_length=80, blank=True)
    cta_url = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)


class HomepageDisplaySettings(TimeStampedModel):
    lookbook_title = models.CharField(max_length=160, default="Latest Product Looks")
    lookbook_limit = models.PositiveSmallIntegerField(default=6)
    reviews_title = models.CharField(max_length=160, default="Customer Reviews")
    is_lookbook_active = models.BooleanField(default=True)
    is_reviews_active = models.BooleanField(default=True)


class Testimonial(TimeStampedModel):
    name = models.CharField(max_length=120)
    location = models.CharField(max_length=120, blank=True)
    text = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5)
    is_active = models.BooleanField(default=True)


class NewsletterSubscription(TimeStampedModel):
    email = models.EmailField(unique=True)


class CareerOpportunity(TimeStampedModel):
    title = models.CharField(max_length=180)
    department = models.CharField(max_length=120)
    location = models.CharField(max_length=160)
    job_type = models.CharField(max_length=80)
    description = models.TextField()
    requirements = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "Career Opportunity"
        verbose_name_plural = "Careers / Opportunities"

    def __str__(self):
        return self.title
