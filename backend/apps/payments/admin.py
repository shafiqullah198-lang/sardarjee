from django.contrib import admin
from apps.payments.models import PaymentTransaction

admin.site.register(PaymentTransaction)
