from django.db import models
from inventory.models import Item
from accounts.models import User
# Create your models here.
# ── 7. 작업지시서 ──────────────────────────────────────
class WorkOrder(models.Model):
    STATUS_CHOICES = [
        ('pending',    '대기'),
        ('in_progress','진행중'),
        ('completed',  '완료'),
        ('cancelled',  '취소'),
    ]
    order_number = models.CharField(max_length=30, unique=True)   # WO-2025-0312-001
    product      = models.ForeignKey(
        Item, on_delete=models.PROTECT,
        limit_choices_to={'item_type': 'finished'}
    )
    target_qty   = models.DecimalField(max_digits=10, decimal_places=2)
    actual_qty   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    defect_qty   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status       = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    assigned_to  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    start_date   = models.DateField()
    due_date     = models.DateField()
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_orders'
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'work_orders'

    def __str__(self):
        return self.order_number