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


@api_view(['GET'])
@permission_classes([])
def inventory_list(request):
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
    
# 품목 생성
@api_view(['POST'])
@permission_classes([])
def item_create(request):
    code        = request.data.get('code')
    name        = request.data.get('name')
    unit        = request.data.get('unit', 'EA')
    item_type   = request.data.get('item_type')
    safety_stock = request.data.get('safety_stock', 0)
    unit_price  = request.data.get('unit_price', 0)
    description = request.data.get('description', '')

    if not code or not name or not item_type:
        return Response({'error': '품번, 품목명, 카테고리는 필수입니다'}, status=400)

    if Item.objects.filter(code=code).exists():
        return Response({'error': '이미 존재하는 품번입니다'}, status=400)

    item = Item.objects.create(
        code=code,
        name=name,
        unit=unit,
        item_type=item_type,
        safety_stock=safety_stock,
        unit_price=unit_price,
        description=description,
    )
    return Response({
        'message': '품목 등록 완료',
        'id': item.id,
        'name': item.name,
        'code': item.code,
    })


# 품목 상세 조회 및 수정
@api_view(['GET', 'PUT'])
@permission_classes([])
def item_detail(request, item_id):
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return Response({'error': '품목 없음'}, status=404)

    if request.method == 'GET':
        return Response({
            'id': item.id,
            'code': item.code,
            'name': item.name,
            'unit': item.unit,
            'item_type': item.item_type,
            'safety_stock': float(item.safety_stock),
            'current_stock': float(item.current_stock),
            'unit_price': float(item.unit_price),
            'description': item.description,
        })

    if request.method == 'PUT':
        item.name         = request.data.get('name', item.name)
        item.unit         = request.data.get('unit', item.unit)
        item.item_type    = request.data.get('item_type', item.item_type)
        item.safety_stock = request.data.get('safety_stock', item.safety_stock)
        item.unit_price   = request.data.get('unit_price', item.unit_price)
        item.description  = request.data.get('description', item.description)
        item.save()
        return Response({'message': '품목 수정 완료', 'name': item.name})
    
@api_view(['GET'])
@permission_classes([])
def partner_list(request):
    from .models import Partner
    partners = Partner.objects.all().order_by('name')
    data = [{'id': p.id, 'name': p.name, 'partner_type': p.partner_type} for p in partners]
    return Response(data)

@api_view(['POST'])
@permission_classes([])
def partner_create(request):
    from .models import Partner
    code         = request.data.get('code')
    name         = request.data.get('name')
    partner_type = request.data.get('partner_type')
    contact_name = request.data.get('contact_name', '')
    phone        = request.data.get('phone', '')
    email        = request.data.get('email', '')

    if not code or not name or not partner_type:
        return Response({'error': '코드, 이름, 유형은 필수입니다'}, status=400)

    if Partner.objects.filter(code=code).exists():
        return Response({'error': '이미 존재하는 코드입니다'}, status=400)

    partner = Partner.objects.create(
        code=code, name=name, partner_type=partner_type,
        contact_name=contact_name, phone=phone, email=email,
    )
    return Response({'message': '거래처 등록 완료', 'id': partner.id, 'name': partner.name})