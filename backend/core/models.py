from django.db import models
from accounts.models import User
# Create your models here.
# ── 10. 감사 로그 ──────────────────────────────────────
class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', '생성'),
        ('update', '수정'),
        ('delete', '삭제'),
        ('login',  '로그인'),
        ('logout', '로그아웃'),
    ]
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action     = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=50)     # 어떤 모델에서 발생했는지
    object_id  = models.CharField(max_length=20, blank=True)
    detail     = models.TextField(blank=True)        # 변경 전/후 내용 JSON 저장
    ip_address = models.GenericIPAddressField(null=True)
    device     = models.CharField(max_length=200, blank=True)
    timestamp  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']