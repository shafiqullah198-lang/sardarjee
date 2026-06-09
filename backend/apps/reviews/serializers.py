from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Order, OrderItem
from apps.reviews.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    customer_profile_image_url = serializers.SerializerMethodField()
    review_image_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    captcha_a = serializers.IntegerField(write_only=True, required=False)
    captcha_b = serializers.IntegerField(write_only=True, required=False)
    captcha_answer = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Review
        fields = (
            "id",
            "product",
            "product_name",
            "guest_name",
            "customer_name",
            "customer_profile_image",
            "customer_profile_image_url",
            "rating",
            "title",
            "review_text",
            "comment",
            "image",
            "image_url",
            "review_image",
            "review_image_url",
            "verified_purchase",
            "is_approved",
            "is_hidden",
            "is_spam",
            "is_featured",
            "status",
            "helpful_count",
            "ip_address",
            "user_email",
            "created_at",
            "captcha_a",
            "captcha_b",
            "captcha_answer",
        )
        read_only_fields = ("verified_purchase", "is_approved", "is_hidden", "is_spam", "is_featured", "status", "helpful_count", "ip_address")

    def get_customer_profile_image_url(self, obj):
        return self._media_url(obj.customer_profile_image)

    def get_review_image_url(self, obj):
        return self._media_url(obj.review_image or obj.image)

    def get_image_url(self, obj):
        return self._media_url(obj.image or obj.review_image)

    def _media_url(self, image):
        if not image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(image.url)
        return image.url

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        product = attrs.get("product") or getattr(self.instance, "product", None)
        captcha_a = attrs.pop("captcha_a", None)
        captcha_b = attrs.pop("captcha_b", None)
        captcha_answer = attrs.pop("captcha_answer", None)

        if user and user.is_authenticated and user.is_staff:
            raise serializers.ValidationError("Admins cannot create customer reviews.")
        if not product:
            raise serializers.ValidationError("Product is required.")
        if not (attrs.get("guest_name") or attrs.get("customer_name")):
            raise serializers.ValidationError({"guest_name": "Name is required."})
        if not (attrs.get("review_text") or attrs.get("comment")):
            raise serializers.ValidationError({"review_text": "Review text is required."})
        ip_address = self.context.get("ip_address")
        if ip_address:
            window_start = timezone.now() - timezone.timedelta(hours=1)
            recent_count = Review.objects.filter(ip_address=ip_address, created_at__gte=window_start).count()
            if recent_count >= 3:
                raise serializers.ValidationError("Too many reviews from this connection. Please try again later.")

            product_repeat = Review.objects.filter(
                product=product,
                ip_address=ip_address,
                created_at__gte=timezone.now() - timezone.timedelta(days=1),
            ).exists()
            if product_repeat:
                raise serializers.ValidationError("A review for this product was already submitted from this connection recently.")

            review_text = (attrs.get("review_text") or attrs.get("comment") or "").strip().lower()
            duplicate = Review.objects.filter(
                product=product,
                ip_address=ip_address,
                review_text__iexact=review_text,
                created_at__gte=timezone.now() - timezone.timedelta(days=1),
            ).exists() or Review.objects.filter(
                product=product,
                ip_address=ip_address,
                comment__iexact=review_text,
                created_at__gte=timezone.now() - timezone.timedelta(days=1),
            ).exists()
            if duplicate:
                raise serializers.ValidationError("This review looks like a duplicate.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user if request.user.is_authenticated and not request.user.is_staff else None
        name = validated_data.get("guest_name") or validated_data.get("customer_name") or ""
        text = validated_data.get("review_text") or validated_data.get("comment") or ""
        validated_data["guest_name"] = name
        validated_data["customer_name"] = name
        validated_data["review_text"] = text
        validated_data["comment"] = text
        if validated_data.get("image") and not validated_data.get("review_image"):
            validated_data["review_image"] = validated_data["image"]
        elif validated_data.get("review_image") and not validated_data.get("image"):
            validated_data["image"] = validated_data["review_image"]
        validated_data["status"] = Review.Status.APPROVED
        validated_data["is_approved"] = True
        validated_data["is_hidden"] = False
        validated_data["is_spam"] = False
        validated_data["is_featured"] = False
        validated_data["ip_address"] = self.context.get("ip_address")
        validated_data["user"] = user
        validated_data["verified_purchase"] = self._has_delivered_purchase(user, validated_data["product"])
        review = Review.objects.create(**validated_data)
        return review

    def update(self, instance, validated_data):
        for field in ("guest_name", "customer_name", "customer_profile_image", "rating", "title", "review_text", "comment", "image", "review_image"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.customer_name = instance.customer_name or instance.guest_name
        instance.guest_name = instance.guest_name or instance.customer_name
        instance.comment = instance.comment or instance.review_text
        instance.review_text = instance.review_text or instance.comment
        instance.image = instance.image or instance.review_image
        instance.review_image = instance.review_image or instance.image
        instance.status = Review.Status.APPROVED
        instance.is_approved = True
        instance.is_hidden = False
        instance.is_spam = False
        instance.save()
        return instance

    def _has_delivered_purchase(self, user, product):
        if not user:
            return False
        return OrderItem.objects.filter(
            order__user=user,
            order__status=Order.Status.DELIVERED,
            variant__product=product,
        ).exists()
