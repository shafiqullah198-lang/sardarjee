from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile


User = get_user_model()


class CustomerAuthApiTests(APITestCase):
    def test_customer_can_register_login_and_fetch_profile(self):
        register_response = self.client.post(
            reverse("auth-register"),
            {
                "full_name": "Test Customer",
                "phone": "03001234567",
                "email": "customer@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="customer@example.com")
        self.assertEqual(user.role, User.Roles.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password("StrongPass123!"))
        self.assertEqual(UserProfile.objects.get(user=user).phone, "03001234567")

        login_response = self.client.post(
            reverse("auth-login"),
            {"login": "customer@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], "customer@example.com")
        self.assertEqual(me_response.data["full_name"], "Test Customer")
        self.assertEqual(me_response.data["phone"], "03001234567")

    def test_customer_can_login_with_phone(self):
        user = User.objects.create(
            email="phone-login@example.com",
            username="phone-login@example.com",
            first_name="Phone",
            last_name="Customer",
            role=User.Roles.CUSTOMER,
            is_staff=False,
            is_superuser=False,
            is_active=True,
        )
        user.set_password("StrongPass123!")
        user.save()
        UserProfile.objects.create(user=user, phone="03151234567")

        response = self.client.post(
            reverse("auth-login"),
            {"login": "03151234567", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_duplicate_email_is_rejected(self):
        existing = User.objects.create(
            email="existing@example.com",
            username="existing@example.com",
            role=User.Roles.CUSTOMER,
            is_staff=False,
            is_superuser=False,
            is_active=True,
        )
        existing.set_password("StrongPass123!")
        existing.save()

        response = self.client.post(
            reverse("auth-register"),
            {
                "full_name": "Another Customer",
                "phone": "03009998888",
                "email": "existing@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_customer_cannot_access_admin_session_endpoint(self):
        user = User.objects.create(
            email="customer-admin-check@example.com",
            username="customer-admin-check@example.com",
            role=User.Roles.CUSTOMER,
            is_staff=False,
            is_superuser=False,
            is_active=True,
        )
        user.set_password("StrongPass123!")
        user.save()

        self.client.force_login(user)
        response = self.client.get(reverse("admin-auth-session"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_session_endpoint_ignores_django_session_login(self):
        admin_user = User.objects.create(
            email="session-admin@example.com",
            username="session-admin@example.com",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        admin_user.set_password("StrongPass123!")
        admin_user.save()

        self.client.force_login(admin_user)
        response = self.client.get(reverse("admin-auth-session"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_login_returns_jwt_and_session_endpoint_accepts_bearer_token(self):
        admin_user = User.objects.create(
            email="jwt-admin@example.com",
            username="jwt-admin@example.com",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        admin_user.set_password("StrongPass123!")
        admin_user.save()

        login_response = self.client.post(
            reverse("admin-auth-login"),
            {"email": "jwt-admin@example.com", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertTrue(login_response.data["authenticated"])
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        session_response = self.client.get(reverse("admin-auth-session"))

        self.assertEqual(session_response.status_code, status.HTTP_200_OK)
        self.assertTrue(session_response.data["authenticated"])
        self.assertEqual(session_response.data["user"]["email"], "jwt-admin@example.com")


from unittest.mock import patch
from django.test import override_settings

@override_settings(GOOGLE_CLIENT_ID="test-google-client-id")
class GoogleAuthApiTests(APITestCase):
    @patch("apps.accounts.views.google_id_token.verify_oauth2_token")
    def test_google_login_new_user(self, mock_verify):
        mock_verify.return_value = {
            "email_verified": True,
            "email": "newgoogle@example.com",
            "given_name": "Google",
            "family_name": "User",
        }

        response = self.client.post(
            reverse("auth-google"),
            {"id_token": "valid-mock-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # Verify user is created correctly
        user = User.objects.get(email="newgoogle@example.com")
        self.assertEqual(user.first_name, "Google")
        self.assertEqual(user.last_name, "User")
        self.assertEqual(user.role, User.Roles.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)
        self.assertFalse(user.has_usable_password())

        # Verify profile is created
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    @patch("apps.accounts.views.google_id_token.verify_oauth2_token")
    def test_google_login_existing_user(self, mock_verify):
        existing_user = User.objects.create(
            email="existinggoogle@example.com",
            username="existinggoogle@example.com",
            role=User.Roles.CUSTOMER,
            is_staff=False,
            is_superuser=False,
            is_active=True,
        )
        existing_user.set_unusable_password()
        existing_user.save()
        UserProfile.objects.create(user=existing_user)

        mock_verify.return_value = {
            "email_verified": True,
            "email": "existinggoogle@example.com",
            "given_name": "Google",
            "family_name": "User",
        }

        response = self.client.post(
            reverse("auth-google"),
            {"id_token": "valid-mock-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    @patch("apps.accounts.views.google_id_token.verify_oauth2_token")
    def test_google_login_staff_forbidden(self, mock_verify):
        staff_user = User.objects.create(
            email="staffgoogle@example.com",
            username="staffgoogle@example.com",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=False,
            is_active=True,
        )
        staff_user.save()

        mock_verify.return_value = {
            "email_verified": True,
            "email": "staffgoogle@example.com",
            "given_name": "Staff",
            "family_name": "Admin",
        }

        response = self.client.post(
            reverse("auth-google"),
            {"id_token": "valid-mock-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("elevated privileges", response.data["detail"])

    @patch("apps.accounts.views.google_id_token.verify_oauth2_token")
    def test_google_login_invalid_token(self, mock_verify):
        mock_verify.side_effect = ValueError("Invalid token signature")

        response = self.client.post(
            reverse("auth-google"),
            {"id_token": "bad-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid Google token", response.data["detail"])
