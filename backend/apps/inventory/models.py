from django.db import models

from apps.catalog.models import ProductVariant
from apps.common.models import TimeStampedModel


class InventoryRecord(TimeStampedModel):
    variant = models.OneToOneField(ProductVariant, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.IntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)

    @property
    def is_low_stock(self):
        return self.quantity <= self.low_stock_threshold


class StockLedgerEntry(TimeStampedModel):
    class MovementType(models.TextChoices):
        IN = "in", "In"
        OUT = "out", "Out"
        ADJUSTMENT = "adjustment", "Adjustment"

    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="stock_moves")
    movement_type = models.CharField(max_length=16, choices=MovementType.choices)
    quantity = models.IntegerField()
    note = models.CharField(max_length=255, blank=True)
