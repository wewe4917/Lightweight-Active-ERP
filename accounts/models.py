from django.db import models
from django.contrib.auth.models import AbstractUser
# ── 1. 사용자 ──────────────────────────────────────────
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin',   '관리자'),
        ('manager', '팀장'),
        ('worker',  '작업자'),
    ]
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES, default='worker')
    department = models.CharField(max_length=50, blank=True)
    phone      = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'users'