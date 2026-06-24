from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Address, PasswordResetOTP, UserProfile

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_phone(self, value):
        phone = value.strip()
        if not phone:
            raise serializers.ValidationError("Phone is required.")
        if UserProfile.objects.filter(phone__iexact=phone).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return phone

    def validate_email(self, value):
        email = value.strip().lower()
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop("full_name").strip()
        phone = validated_data.pop("phone").strip()
        email = validated_data.pop("email", "").strip().lower()
        password = validated_data.pop("password")
        validated_data.pop("confirm_password", None)

        name_parts = [part for part in full_name.split(" ") if part]
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        if not email:
            email = f"customer-{phone.replace('+', '').replace(' ', '').replace('-', '')}@sardar-g.local"

        user = User(
            email=email,
            username=email,
            first_name=first_name,
            last_name=last_name,
            role=User.Roles.CUSTOMER,
            is_staff=False,
            is_superuser=False,
            is_active=True,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        UserProfile.objects.update_or_create(user=user, defaults={"phone": phone})
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "is_email_verified",
            "is_active",
            "is_staff",
            "is_superuser",
        )
        read_only_fields = ("id", "role", "is_email_verified", "is_active", "is_staff", "is_superuser")

    def get_full_name(self, obj):
        full_name = " ".join(part for part in [obj.first_name, obj.last_name] if part).strip()
        return full_name or getattr(obj, "username", "") or getattr(obj, "email", "")

    def get_phone(self, obj):
        try:
            return obj.profile.phone
        except UserProfile.DoesNotExist:
            return ""

    def update(self, instance, validated_data):
        profile_data = {}
        if "phone" in self.initial_data:
            profile_data["phone"] = str(self.initial_data.get("phone", "")).strip()
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.role = User.Roles.CUSTOMER if not (instance.is_staff or instance.is_superuser) else instance.role
        instance.save()
        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            if "phone" in profile_data:
                profile.phone = profile_data["phone"]
                profile.save(update_fields=["phone", "updated_at"])
        return instance


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = "__all__"
        read_only_fields = ("user",)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def get_customer(self):
        email = self.validated_data["email"].strip().lower()
        return User.objects.filter(
            email__iexact=email,
            is_active=True,
            is_staff=False,
            is_superuser=False,
        ).first()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)

    default_error_messages = {
        "invalid_otp": "Invalid or expired OTP.",
    }

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must be 6 digits.")
        return value

    def validate(self, attrs):
        otp_record = self._get_otp_record(attrs["email"], attrs["otp"])
        if not otp_record:
            raise serializers.ValidationError({"otp": self.error_messages["invalid_otp"]})
        attrs["otp_record"] = otp_record
        return attrs

    def _get_otp_record(self, email, otp):
        email = email.strip().lower()
        candidates = PasswordResetOTP.objects.filter(
            email__iexact=email,
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
            attempts__lt=5,
        ).select_related("user").order_by("-created_at")

        for record in candidates[:3]:
            if check_password(otp, record.otp_hash):
                return record
            record.attempts += 1
            record.save(update_fields=["attempts", "updated_at"])
        return None

    def save(self, **kwargs):
        otp_record = self.validated_data["otp_record"]
        if not otp_record.verified_at:
            otp_record.verified_at = timezone.now()
            otp_record.save(update_fields=["verified_at", "updated_at"])
        return otp_record


class OTPPasswordResetSerializer(VerifyOTPSerializer):
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return super().validate(attrs)

    def save(self, **kwargs):
        otp_record = self.validated_data["otp_record"]
        user = otp_record.user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        otp_record.used_at = timezone.now()
        otp_record.verified_at = otp_record.verified_at or otp_record.used_at
        otp_record.save(update_fields=["used_at", "verified_at", "updated_at"])
        return user
