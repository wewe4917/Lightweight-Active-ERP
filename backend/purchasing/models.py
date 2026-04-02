from django.db import models
from accounts.models import User
from inventory.models import Partner, Item
from production.models import WorkOrder

# Create your models here.
# ── 8. 발주서 ──────────────────────────────────────────
class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('draft',     '작성중'),
        ('sent',      '발송완료'),
        ('received',  '입고완료'),
        ('cancelled', '취소'),
    ]
    po_number     = models.CharField(max_length=30, unique=True)   # PO-2025-0312-001
    partner       = models.ForeignKey(Partner, on_delete=models.PROTECT)
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    ordered_date  = models.DateField(auto_now_add=True)
    expected_date = models.DateField(null=True, blank=True)
    note          = models.TextField(blank=True)
    created_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'purchase_orders'


class PurchaseOrderItem(models.Model):
    po         = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    item       = models.ForeignKey(Item, on_delete=models.PROTECT)
    quantity   = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'purchase_order_items'


# ── 9. 납품지시서 ──────────────────────────────────────
class DeliveryNote(models.Model):
    STATUS_CHOICES = [
        ('pending',   '대기'),
        ('delivered', '납품완료'),
        ('cancelled', '취소'),
    ]
    dn_number      = models.CharField(max_length=30, unique=True)   # DN-2025-0312-001
    partner        = models.ForeignKey(Partner, on_delete=models.PROTECT)
    work_order     = models.ForeignKey(WorkOrder, on_delete=models.PROTECT, null=True, blank=True)
    item           = models.ForeignKey(Item, on_delete=models.PROTECT)
    quantity       = models.DecimalField(max_digits=10, decimal_places=2)
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    delivered_date = models.DateField(null=True, blank=True)
    created_by     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_notes'
