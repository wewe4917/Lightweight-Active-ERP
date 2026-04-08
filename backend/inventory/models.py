from django.db import models
from django.contrib.auth.models import AbstractUser
from accounts.models import User  # User FK 참조용

# Create your models here.
# ── 2. 품목 ──────────────────────────────────────────
class Item(models.Model):
    TYPE_CHOICES = [
        ('raw',      '원자재'),
        ('semi',     '반제품'),
        ('finished', '완제품'),
    ]
    code         = models.CharField(max_length=30, unique=True)   # 품목코드 ex) ITEM-M10-BOLT
    name         = models.CharField(max_length=100)
    unit         = models.CharField(max_length=10)                # kg, EA, L ...
    item_type    = models.CharField(max_length=10, choices=TYPE_CHOICES)
    safety_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_stock= models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit_price   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description  = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def is_low_stock(self):
        return self.current_stock <= self.safety_stock

    class Meta:
        db_table = 'items'

    def __str__(self):
        return f"[{self.code}] {self.name}"


# ── 3. 거래처 ──────────────────────────────────────────
class Partner(models.Model):
    TYPE_CHOICES = [
        ('supplier', '공급업체'),
        ('customer', '납품처'),
        ('both',     '양방향'),
    ]
    code         = models.CharField(max_length=20, unique=True)
    name         = models.CharField(max_length=100)
    partner_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    contact_name = models.CharField(max_length=50, blank=True)
    phone        = models.CharField(max_length=20, blank=True)
    email        = models.EmailField(blank=True)
    address      = models.CharField(max_length=200, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'partners'

    def __str__(self):
        return self.name


# ── 4. BOM (자재명세서) ──────────────────────────────────중요!
class BOM(models.Model):
    product  = models.ForeignKey(
        Item, on_delete=models.CASCADE,
        related_name='bom_products',
        limit_choices_to={'item_type': 'finished'}   # 완제품만 선택 가능
    )
    material = models.ForeignKey(
        Item, on_delete=models.CASCADE,
        related_name='bom_materials',
        limit_choices_to={'item_type__in': ['raw', 'semi']}
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=4)  # 완제품 1개당 소요량

    class Meta:
        db_table = 'bom'
        unique_together = ('product', 'material')   # 동일 조합 중복 방지

    def __str__(self):
        return f"{self.product.name} → {self.material.name} x{self.quantity}"


# ── 5. 입고 ──────────────────────────────────────────
class StockIn(models.Model):
    item       = models.ForeignKey(Item, on_delete=models.PROTECT)
    partner    = models.ForeignKey(Partner, on_delete=models.PROTECT, null=True, blank=True)
    quantity   = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    lot_number = models.CharField(max_length=30, blank=True)   # LOT 추적용
    note       = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


    class Meta:
        db_table = 'stock_in'


# ── 6. 출고 ──────────────────────────────────────────
class StockOut(models.Model):
    PURPOSE_CHOICES = [
        ('production', '생산투입'),
        ('delivery',   '납품출고'),
        ('disposal',   '폐기'),
        ('other',      '기타'),
    ]
    item       = models.ForeignKey(Item, on_delete=models.PROTECT)
    partner    = models.ForeignKey(Partner, on_delete=models.PROTECT, null=True, blank=True)
    quantity   = models.DecimalField(max_digits=10, decimal_places=2)
    purpose    = models.CharField(max_length=15, choices=PURPOSE_CHOICES)
    note       = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_out'