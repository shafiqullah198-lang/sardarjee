from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
import logging
import random
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    google_id_token = None
    google_requests = None

from apps.accounts.models import Address, PasswordResetOTP, UserProfile
from apps.accounts.serializers import (
    AddressSerializer,
    ForgotPasswordSerializer,
    OTPPasswordResetSerializer,
    RegisterSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def password_reset_email_config_error():
    required = {
        "EMAIL_HOST": settings.EMAIL_HOST,
        "EMAIL_PORT": settings.EMAIL_PORT,
        "EMAIL_HOST_USER": settings.EMAIL_HOST_USER,
        "EMAIL_HOST_PASSWORD": settings.EMAIL_HOST_PASSWORD,
        "DEFAULT_FROM_EMAIL": settings.DEFAULT_FROM_EMAIL,
    }
    missing = [name for name, value in required.items() if not value]
    if settings.EMAIL_BACKEND != "django.core.mail.backends.smtp.EmailBackend":
        missing.append("EMAIL_BACKEND=smtp")
    return missing


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CustomerTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "login"

    def validate(self, attrs):
        login_value = self.initial_data.get("login", "").strip()
        password = self.initial_data.get("password", "")
        if not login_value or not password:
            raise serializers.ValidationError({"detail": "Phone/email and password are required."})

        user = self._find_user(login_value, password)
        if not user or not user.is_active or user.is_staff or user.is_superuser:
            raise serializers.ValidationError({"detail": "Invalid customer credentials."})

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    def _find_user(self, login_value, password):
        user = authenticate(self.context["request"], username=login_value, password=password)
        if user:
            return user

        user = User.objects.filter(profile__phone__iexact=login_value).select_related("profile").first()
        if not user:
            return None
        return authenticate(self.context["request"], username=user.email, password=password)


class CustomerLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = CustomerTokenObtainPairSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class CustomerLogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    success_message = "If an account exists for that email, an OTP has been sent."

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.get_customer()

        missing_config = password_reset_email_config_error()
        if missing_config:
            logger.error("Password reset email SMTP configuration is missing: %s", ", ".join(missing_config))
            if settings.DEBUG:
                return Response(
                    {"detail": f"Password reset email is not configured: {', '.join(missing_config)}."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        if user:
            email = user.email.strip().lower()
            otp = f"{random.SystemRandom().randint(0, 999999):06d}"
            now = timezone.now()
            PasswordResetOTP.objects.filter(
                user=user,
                used_at__isnull=True,
            ).update(used_at=now, updated_at=now)
            otp_record = PasswordResetOTP.objects.create(
                user=user,
                email=email,
                otp_hash=make_password(otp),
                expires_at=now + timedelta(minutes=10),
            )
            try:
                send_mail(
                    subject="Your Sardar-G Fabrics password reset OTP",
                    message=(
                        "We received a request to reset your Sardar-G Fabrics password.\n\n"
                        f"Your OTP is: {otp}\n\n"
                        "This code expires in 10 minutes.\n\n"
                        "If you did not request this, you can ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as exc:
                logger.exception("Password reset OTP email failed for user id %s", user.pk)
                otp_record.used_at = timezone.now()
                otp_record.save(update_fields=["used_at", "updated_at"])
                if settings.DEBUG:
                    return Response(
                        {"detail": f"Password reset email could not be sent: {exc.__class__.__name__}."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

        return Response({"detail": self.success_message}, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "OTP verified."}, status=status.HTTP_200_OK)


class OTPPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = OTPPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Your password has been reset. You can sign in now."}, status=status.HTTP_200_OK)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AdminSessionLoginView(APIView):
    """POST /api/v1/admin/auth/login/ - JWT-based admin login."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({"detail": "Invalid admin credentials."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active or not (user.is_staff or user.is_superuser):
            return Response({"detail": "Only active staff or superusers can access admin."}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response({
            "authenticated": True,
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


class AdminSessionLogoutView(APIView):
    """POST /api/v1/admin/auth/logout/ - blacklist refresh token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        return Response({"authenticated": False})


class GoogleAuthView(APIView):
    """POST /api/v1/auth/google/

    Accepts a Google ID token from the frontend, verifies it with Google,
    then either creates a new customer account or logs in the existing one.
    Staff / superuser accounts can never be accessed through this endpoint.
    Returns the same {access, refresh} shape as normal customer login.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        if google_id_token is None or google_requests is None:
            return Response(
                {"detail": "Google authentication is not available on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            return Response(
                {"detail": "Google OAuth is not configured on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        token = request.data.get("id_token", "").strip()
        if not token:
            return Response(
                {"detail": "id_token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the token with Google's public keys
        try:
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:
            return Response(
                {"detail": f"Invalid Google token: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not idinfo.get("email_verified"):
            return Response(
                {"detail": "Google account email is not verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = idinfo.get("email", "").strip().lower()
        if not email:
            return Response(
                {"detail": "Could not retrieve email from Google account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        first_name = idinfo.get("given_name", "").strip()
        last_name = idinfo.get("family_name", "").strip()

        user = User.objects.filter(email__iexact=email).first()

        if user:
            # Existing user — must be a normal customer (no staff/admin access via Google)
            if user.is_staff or user.is_superuser:
                return Response(
                    {"detail": "This account has elevated privileges and cannot sign in via Google."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if not user.is_active:
                return Response(
                    {"detail": "This account has been deactivated."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Optionally update name if it was empty
            changed = False
            if not user.first_name and first_name:
                user.first_name = first_name
                changed = True
            if not user.last_name and last_name:
                user.last_name = last_name
                changed = True
            if changed:
                user.save(update_fields=["first_name", "last_name"])
        else:
            # New user — create a customer account with no usable password
            user = User(
                email=email,
                username=email,
                first_name=first_name,
                last_name=last_name,
                role=User.Roles.CUSTOMER,
                is_staff=False,
                is_superuser=False,
                is_active=True,
                is_email_verified=True,
            )
            user.set_unusable_password()
            user.save()
            # Create an empty profile so other parts of the app don't crash on profile access
            UserProfile.objects.get_or_create(user=user)

        # Issue JWT tokens exactly like normal customer login
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )
