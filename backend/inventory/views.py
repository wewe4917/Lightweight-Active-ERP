from django.shortcuts import render
from django.db import models
# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Item
from production.models import WorkOrder


@api_view(['GET'])
@permission_classes([])
def dashboard_stats(request):
    today = timezone.now().date()

    # 금일 총 생산량
    total_production = WorkOrder.objects.aggregate(
    total=models.Sum('actual_qty'))['total'] or 0


    # 평균 불량률
    orders = WorkOrder.objects.all()

    if orders.exists():
        total_actual = orders.aggregate(t=models.Sum('actual_qty'))['t'] or 1
        total_defect = orders.aggregate(d=models.Sum('defect_qty'))['d'] or 0
        defect_rate = round((total_defect / total_actual) * 100, 1)
    else:
        defect_rate = 0

    # 재고 부족 품목 수
    low_stock_count = Item.objects.filter(
        current_stock__lte=models.F('safety_stock')
    ).count()

    # 가동 중인 라인
    active_lines = WorkOrder.objects.filter(status='in_progress').count()
    total_lines = 5

    # 최근 알림 (재고 부족 품목)
    low_stock_items = Item.objects.filter(
        current_stock__lte=models.F('safety_stock')
    ).values('name', 'current_stock', 'safety_stock')[:5]

    notifications = [
        {
            'message': f'[긴급] {item["name"]} 안전재고 미달',
            'type': 'red'
        }
        for item in low_stock_items
    ]

    return Response({
        'total_production': total_production,
        'defect_rate': defect_rate,
        'low_stock_count': low_stock_count,
        'active_lines': active_lines,
        'total_lines': total_lines,
        'notifications': notifications,
    })