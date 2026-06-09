from rest_framework import permissions, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order, OrderItem
from apps.reviews.models import Review
from apps.reviews.serializers import ReviewSerializer


def get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ("list", "retrieve", "create"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Review.objects.select_related("user", "product").order_by("-created_at")
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        if self.request.query_params.get("mine") == "true" and self.request.user.is_authenticated:
            return qs.filter(user=self.request.user)
        if self.action in ("update", "partial_update") and self.request.user.is_authenticated and not self.request.user.is_staff:
            return qs.filter(user=self.request.user)
        if not self.request.user.is_staff:
            qs = qs.filter(is_hidden=False, is_spam=False)
        qs = qs.order_by("-is_featured", "-created_at")
        return qs

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request, "ip_address": get_client_ip(self.request)}

    def create(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_staff:
            return Response({"detail": "Admins cannot create customer reviews."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(self.get_serializer(review).data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Only admins can delete abusive reviews."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class ApprovedReviewsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        reviews = (
            Review.objects.filter(is_hidden=False, is_spam=False)
            .select_related("user", "product")
            .order_by("-is_featured", "-created_at")
        )
        product_id = request.query_params.get("product")
        if product_id:
            reviews = reviews.filter(product_id=product_id)
        return Response(ReviewSerializer(reviews, many=True, context={"request": request}).data)


class ReviewEligibilityView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id):
        user = request.user if request.user.is_authenticated else None
        purchased = False
        review = None
        if user:
            purchased = OrderItem.objects.filter(
                order__user=user,
                order__status=Order.Status.DELIVERED,
                variant__product_id=product_id,
            ).exists()
            review = Review.objects.filter(user=user, product_id=product_id).first()
        return Response({
            "can_review": True,
            "has_review": bool(review),
            "verified_customer": purchased,
            "review": ReviewSerializer(review, context={"request": request}).data if review else None,
        })


class ReviewCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        if request.user.is_authenticated and request.user.is_staff:
            return Response({"detail": "Admins cannot create customer reviews."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ReviewSerializer(data=request.data, context={"request": request, "ip_address": get_client_ip(request)})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminReviewApproveView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        review = Review.objects.get(pk=pk)
        review.is_approved = True
        review.status = Review.Status.APPROVED
        if "is_featured" in request.data:
            review.is_featured = str(request.data.get("is_featured")).lower() in ("true", "1", "yes", "on")
        if "hide_spam" in request.data:
            hidden = str(request.data.get("hide_spam")).lower() in ("true", "1", "yes", "on")
            review.is_hidden = hidden
            review.is_spam = hidden
            review.status = Review.Status.HIDDEN if hidden else Review.Status.APPROVED
        review.save()
        return Response(ReviewSerializer(review, context={"request": request}).data)
