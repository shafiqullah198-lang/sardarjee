import mimetypes
import os
import re

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.urls import include, path
from django.urls import re_path
from django.utils._os import safe_join
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    AddressViewSet,
    AdminCsrfView,
    AdminSessionLoginView,
    AdminSessionLogoutView,
    AdminSessionView,
    CustomerLoginView,
    CustomerLogoutView,
    GoogleAuthView,
    MeView,
    RegisterView,
)
from apps.catalog.views import CategoryViewSet, ProductViewSet
from apps.cart.views import CartViewSet
from apps.cms.views import (
    AdminCareerOpportunityView,
    AdminDisplaySettingsView,
    AdminDashboardStatsView,
    AdminHeroSettingsView,
    AdminHomepageView,
    AdminReviewModerationView,
    AdminStatsView,
    AdminStorySettingsView,
    CareersView,
    HomeContentView,
    HomeStatsView,
    LiveHomepageStatsView,
)
from apps.checkout.views import CheckoutView
from apps.orders.views import (
    AdminDashboardView,
    AdminInventoryMoveView,
    AdminInventoryView,
    InventoryItemStockView,
    AdminOrdersView,
    AdminOrderEventsView,
    AdminPosSaleView,
    AdminProductView,
    AdminSalesView,
    AdminSalesInvoiceView,
    OrderViewSet,
    TrackOrderView,
)
from apps.reviews.views import AdminReviewApproveView, ApprovedReviewsView, ReviewCreateView, ReviewEligibilityView, ReviewViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"products", ProductViewSet, basename="products")
router.register(r"cart", CartViewSet, basename="cart")
router.register(r"orders", OrderViewSet, basename="orders")
router.register(r"reviews", ReviewViewSet, basename="reviews")
router.register(r"addresses", AddressViewSet, basename="addresses")


def ranged_media_response(request, path):
    try:
        full_path = safe_join(settings.MEDIA_ROOT, path)
    except ValueError as exc:
        raise Http404 from exc
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise Http404

    content_type, _ = mimetypes.guess_type(full_path)
    content_type = content_type or "application/octet-stream"
    file_size = os.path.getsize(full_path)
    range_header = request.headers.get("Range", "")
    match = re.match(r"bytes=(\d*)-(\d*)$", range_header)

    if match:
        start_text, end_text = match.groups()
        start = int(start_text) if start_text else 0
        end = int(end_text) if end_text else file_size - 1
        end = min(end, file_size - 1)
        if start > end or start >= file_size:
            return HttpResponse(status=416, headers={"Content-Range": f"bytes */{file_size}"})

        with open(full_path, "rb") as media_file:
            media_file.seek(start)
            data = media_file.read(end - start + 1)
        response = HttpResponse(data, status=206, content_type=content_type)
        response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        response["Content-Length"] = str(end - start + 1)
        response["Accept-Ranges"] = "bytes"
        return response

    response = FileResponse(open(full_path, "rb"), content_type=content_type)
    response["Content-Length"] = str(file_size)
    response["Accept-Ranges"] = "bytes"
    return response


def create_temp_admin(request):
    if request.GET.get("key") != os.getenv("TEMP_ADMIN_KEY"):
        return JsonResponse({"error": "forbidden"}, status=403)

    User = get_user_model()

    email = "sardargfabric@gmail.com"
    password = "YourStrongPassword123"

    user, created = User.objects.get_or_create(email=email)

    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.save()

    return JsonResponse({
        "ok": True,
        "created": created,
        "email": email,
    })

urlpatterns = [
    path("admin/", admin.site.urls),
    path("temp-create-admin/", create_temp_admin),
    path("api/v1/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/v1/auth/login/", CustomerLoginView.as_view(), name="auth-login"),
    path("api/v1/auth/token/", CustomerLoginView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/v1/auth/logout/", CustomerLogoutView.as_view(), name="auth-logout"),
    path("api/v1/auth/google/", GoogleAuthView.as_view(), name="auth-google"),
    path("api/v1/admin/auth/csrf/", AdminCsrfView.as_view(), name="admin-auth-csrf"),
    path("api/v1/admin/auth/session/", AdminSessionView.as_view(), name="admin-auth-session"),
    path("api/v1/admin/auth/login/", AdminSessionLoginView.as_view(), name="admin-auth-login"),
    path("api/v1/admin/auth/logout/", AdminSessionLogoutView.as_view(), name="admin-auth-logout"),
    path("api/v1/checkout/", CheckoutView.as_view(), name="checkout"),
    path("api/v1/cms/home/", HomeContentView.as_view(), name="cms-home"),
    path("api/v1/cms/home-stats/", HomeStatsView.as_view(), name="cms-home-stats"),
    path("api/v1/careers/", CareersView.as_view(), name="careers"),
    path("api/v1/admin/careers/", AdminCareerOpportunityView.as_view(), name="admin-careers"),
    path("api/v1/admin/careers/<int:pk>/", AdminCareerOpportunityView.as_view(), name="admin-career-detail"),
    path("api/v1/admin/homepage/", AdminHomepageView.as_view(), name="admin-homepage"),
    path("api/v1/admin/homepage/hero/", AdminHeroSettingsView.as_view(), name="admin-homepage-hero"),
    path("api/v1/admin/homepage/stats/", AdminStatsView.as_view(), name="admin-homepage-stats"),
    path("api/v1/admin/homepage/stats/<int:pk>/", AdminStatsView.as_view(), name="admin-homepage-stat-detail"),
    path("api/v1/admin/homepage/story/", AdminStorySettingsView.as_view(), name="admin-homepage-story"),
    path("api/v1/admin/homepage/display/", AdminDisplaySettingsView.as_view(), name="admin-homepage-display"),
    path("api/v1/admin/homepage/reviews/", AdminReviewModerationView.as_view(), name="admin-homepage-reviews"),
    path("api/v1/admin/homepage/reviews/<int:pk>/", AdminReviewModerationView.as_view(), name="admin-homepage-review"),
    path("api/v1/homepage/stats/live/", LiveHomepageStatsView.as_view(), name="homepage-live-stats"),
    path("api/v1/reviews/approved/", ApprovedReviewsView.as_view(), name="approved-reviews"),
    path("api/v1/reviews/create/", ReviewCreateView.as_view(), name="review-create"),
    path("api/v1/reviews/eligibility/<int:product_id>/", ReviewEligibilityView.as_view(), name="review-eligibility"),
    path("api/v1/admin/reviews/<int:pk>/approve/", AdminReviewApproveView.as_view(), name="admin-review-approve"),
    path("api/v1/track-order/", TrackOrderView.as_view(), name="track-order"),
    path("api/v1/admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("api/v1/admin/dashboard/stats/", AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
    path("api/v1/admin/products/", AdminProductView.as_view(), name="admin-products"),
    path("api/v1/admin/products/<int:pk>/", AdminProductView.as_view(), name="admin-product-detail"),
    path("api/v1/admin/inventory/", AdminInventoryView.as_view(), name="admin-inventory"),
    path("api/v1/admin/inventory/move/", AdminInventoryMoveView.as_view(), name="admin-inventory-move"),
    path("api/v1/inventory/items/<int:pk>/stock/", InventoryItemStockView.as_view(), name="inventory-item-stock"),
    path("api/v1/admin/orders/", AdminOrdersView.as_view(), name="admin-orders"),
    path("api/v1/admin/orders/<int:pk>/", AdminOrdersView.as_view(), name="admin-order-detail"),
    path("api/v1/admin/order-events/", AdminOrderEventsView.as_view(), name="admin-order-events"),
    path("api/v1/admin/pos/sales/", AdminPosSaleView.as_view(), name="admin-pos-sales"),
    path("api/v1/admin/sales/", AdminSalesView.as_view(), name="admin-sales"),
    path("api/v1/admin/sales/<int:pk>/refund/", AdminSalesView.as_view(), name="admin-sale-refund"),
    path("api/v1/admin/sales/<int:pk>/invoice/", AdminSalesInvoiceView.as_view(), name="admin-sale-invoice"),
    path("api/v1/admin/sales/by-number/<str:number>/invoice/", AdminSalesInvoiceView.as_view(), name="admin-sale-invoice-by-number"),
    path("api/homepage/stats/live", LiveHomepageStatsView.as_view(), name="api-homepage-live-stats"),
    path("api/reviews/approved", ApprovedReviewsView.as_view(), name="api-approved-reviews"),
    path("api/reviews", ReviewCreateView.as_view(), name="api-review-create"),
    path("api/admin/reviews/<int:pk>/approve", AdminReviewApproveView.as_view(), name="api-admin-review-approve"),
    path("api/admin/dashboard/stats", AdminDashboardStatsView.as_view(), name="api-admin-dashboard-stats"),
    path("api/v1/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", ranged_media_response),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
