from django.contrib import admin
from apps.inventory.models import InventoryRecord, StockLedgerEntry

admin.site.register(InventoryRecord)
admin.site.register(StockLedgerEntry)
