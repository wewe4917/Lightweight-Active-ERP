from django.shortcuts import render
from django.db import models, transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from decimal import Decimal
from .models import Item, Partner, StockIn, StockOut
from production.models import WorkOrder


@api_view(['GET'])
@permission_classes([])
def dashboard_stats(request):
    total_production = WorkOrder.objects.aggregate(
        total=models.Sum('actual_qty'))['total'] or 0

    orders = WorkOrder.objects.all()
    if orders.exists():
        total_actual = orders.aggregate(t=models.Sum('actual_qty'))['t'] or 1
        total_defect = orders.aggregate(d=models.Sum('defect_qty'))['d'] or 0
        defect_rate = round((total_defect / total_actual) * 100, 1)
    else:
        defect_rate = 0

    low_stock_count = Item.objects.filter(
        current_stock__lte=models.F('safety_stock')
    ).count()

    active_lines = WorkOrder.objects.filter(status='in_progress').count()
    total_lines = 5

    low_stock_items = Item.objects.filter(
        current_stock__lte=models.F('safety_stock')
    ).values('name', 'current_stock', 'safety_stock')[:5]

    notifications = [
        {'message': f'[긴급] {item["name"]} 안전재고 미달', 'type': 'red'}
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


@api_view(['GET', 'POST'])
@permission_classes([])
def inventory_list(request):
    # 🚀 1. 리액트에서 데이터를 보냈을 때 (POST 요청)
    if request.method == 'POST':
        data = request.data
        try:
            # 전달받은 데이터로 DB에 새 아이템 생성(저장)
            new_item = Item.objects.create(
                code=data.get('code'),
                name=data.get('name'),
                unit=data.get('unit', 'EA'), # 없으면 기본값 EA
                item_type=data.get('item_type', 'raw'),
                safety_stock=data.get('safety_stock', 0),
                current_stock=data.get('current_stock', 0),
                unit_price=data.get('unit_price', 0),
                description=data.get('description', '')
            )
            # 성공적으로 만들었다고 201 상태 코드와 함께 응답!
            return Response({"message": "성공적으로 등록되었습니다!"}, status=201)
        except Exception as e:
            # 혹시 에러(예: 중복된 코드 등)가 나면 400 에러를 보냄
            return Response({"error": str(e)}, status=400)

    # 🔍 2. 리액트에서 목록을 달라고 할 때 (기존 GET 요청 로직)
    elif request.method == 'GET':
        items = Item.objects.all().order_by('code')
        data = []
        for item in items:
            data.append({
                'id': item.id,
                'code': item.code,
                'name': item.name,
                'unit': item.unit,
                'item_type': item.get_item_type_display(),
                'current_stock': float(item.current_stock),
                'safety_stock': float(item.safety_stock),
                'unit_price': float(item.unit_price),
                'is_low_stock': item.is_low_stock(),
            })
        return Response(data)


@api_view(['POST'])
@permission_classes([])
def stock_in_create(request):
    item_id    = request.data.get('item_id')
    quantity   = request.data.get('quantity')
    partner_id = request.data.get('partner_id')
    unit_price = request.data.get('unit_price', 0)
    lot_number = request.data.get('lot_number', '')
    note       = request.data.get('note', '')

    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return Response({'error': '품목을 찾을 수 없습니다'}, status=404)

    partner = None
    if partner_id:
        try:
            partner = Partner.objects.get(id=partner_id)
        except Partner.DoesNotExist:
            pass

    with transaction.atomic():
        StockIn.objects.create(
            item=item,
            partner=partner,
            quantity=quantity,
            unit_price=unit_price,
            lot_number=lot_number,
            note=note,
        )
        item.current_stock += Decimal(str(quantity))
        item.save()

    return Response({'message': '입고 등록 완료', 'current_stock': float(item.current_stock)})


@api_view(['POST'])
@permission_classes([])
def stock_out_create(request):
    item_id    = request.data.get('item_id')
    quantity   = request.data.get('quantity')
    purpose    = request.data.get('purpose', 'other')
    partner_id = request.data.get('partner_id')
    note       = request.data.get('note', '')

    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return Response({'error': '품목을 찾을 수 없습니다'}, status=404)

    if item.current_stock < Decimal(str(quantity)):
        return Response(
            {'error': f'재고 부족 (현재: {item.current_stock})'},
            status=400
        )

    partner = None
    if partner_id:
        try:
            partner = Partner.objects.get(id=partner_id)
        except Partner.DoesNotExist:
            pass

    with transaction.atomic():
        StockOut.objects.create(
            item=item,
            partner=partner,
            quantity=quantity,
            purpose=purpose,
            note=note,
        )
        item.current_stock -= Decimal(str(quantity))
        item.save()

    return Response({'message': '출고 등록 완료', 'current_stock': float(item.current_stock)})


@api_view(['GET'])
@permission_classes([])
def stock_history(request, item_id):
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return Response({'error': '품목 없음'}, status=404)

    stock_ins = StockIn.objects.filter(item=item).order_by('-created_at').values(
        'id', 'quantity', 'unit_price', 'lot_number', 'note', 'created_at'
    )
    stock_outs = StockOut.objects.filter(item=item).order_by('-created_at').values(
        'id', 'quantity', 'purpose', 'note', 'created_at'
    )

    return Response({
        'item': item.name,
        'stock_ins': list(stock_ins),
        'stock_outs': list(stock_outs),
    })