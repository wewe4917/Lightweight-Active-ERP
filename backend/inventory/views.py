from django.shortcuts import render
from django.db import models, transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from decimal import Decimal
from .models import Item, Partner, StockIn, StockOut
from production.models import WorkOrder
import uuid
import base64
import requests as req
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
import pytz

@api_view(['GET'])
@permission_classes([])
def dashboard(request):
    from production.models import WorkOrder
    from inventory.models import BOM
    from django.utils import timezone
    from datetime import timedelta

    # 재고 부족 품목
    all_items = Item.objects.all()
    low_stock_items = [i for i in all_items if i.current_stock < i.safety_stock]

    # 가동 중인 라인
    active_lines = WorkOrder.objects.filter(status='in_progress').count()
    total_lines = WorkOrder.objects.count()

    # KST 기준 오늘
    kst = pytz.timezone('Asia/Seoul')
    now_kst = timezone.now().astimezone(kst)
    today = now_kst.date()
    today_start = kst.localize(timezone.datetime(today.year, today.month, today.day, 0, 0, 0))
    today_end = today_start + timedelta(days=1)

    # 금일 생산량
    today_production = WorkOrder.objects.filter(
        status='completed',
        completed_at__gte=today_start,
        completed_at__lt=today_end,
    ).aggregate(total=Sum('actual_qty'))['total'] or 0

    # 평균 불량률
    completed = WorkOrder.objects.filter(status='completed')
    total_actual = completed.aggregate(t=Sum('actual_qty'))['t'] or 0
    total_defect = completed.aggregate(d=Sum('defect_qty'))['d'] or 0
    defect_rate = round((total_defect / total_actual * 100), 1) if total_actual > 0 else 0

    # BOM 등록된 완제품 목록
    bom_product_ids = BOM.objects.values_list('product_id', flat=True).distinct()
    bom_products = Item.objects.filter(id__in=bom_product_ids)


    # 제품 필터 (쿼리 파라미터)
    product_id = request.GET.get('product_id', None)

    # 주간 생산량
    weekly_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = kst.localize(timezone.datetime(day.year, day.month, day.day, 0, 0, 0))
        day_end = day_start + timedelta(days=1)
        qs = WorkOrder.objects.filter(
            status='completed',
            completed_at__gte=day_start,
            completed_at__lt=day_end,
        )
        if product_id:
            qs = qs.filter(product_id=product_id)
        qty = qs.aggregate(total=Sum('actual_qty'))['total'] or 0
        weekly_data.append({
            'date': day.strftime('%m/%d'),
            'day': ['월','화','수','목','금','토','일'][day.weekday()],
            'qty': int(qty),
        })

    # 능동형 알림
    notifications = []
    for item in low_stock_items:
        notifications.append({
            'type': 'low_stock',
            'level': 'danger',
            'message': f'[재고부족] {item.name} - 현재 {item.current_stock}{item.unit} (안전재고: {item.safety_stock}{item.unit})',
            'item_name': item.name,
            'current': float(item.current_stock),
            'safety': float(item.safety_stock),
        })
    in_progress = WorkOrder.objects.filter(status='in_progress')
    for wo in in_progress:
        notifications.append({
            'type': 'production',
            'level': 'info',
            'message': f'[생산중] {wo.product.name} - {wo.order_number} 진행중',
        })

    return Response({
        'total_production': int(today_production),
        'defect_rate': defect_rate,
        'low_stock_count': len(low_stock_items),
        'active_lines': active_lines,
        'total_lines': total_lines,
        'weekly_data': weekly_data,
        'bom_products': [
            {'id': p.id, 'name': p.name, 'code': p.code}
            for p in bom_products
        ],
        'low_stock_items': [
            {
                'name': i.name,
                'code': i.code,
                'current': float(i.current_stock),
                'safety': float(i.safety_stock),
                'unit': i.unit,
            }
            for i in low_stock_items
        ],
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

@api_view(['DELETE'])
@permission_classes([])
def item_delete(request, item_id):
    from .models import Item
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return Response({'error': '품목을 찾을 수 없습니다'}, status=404)
    item.delete()
    return Response({'message': '품목 삭제 완료'})


@api_view(['DELETE'])
@permission_classes([])
def partner_delete(request, partner_id):
    from .models import Partner
    try:
        partner = Partner.objects.get(id=partner_id)
    except Partner.DoesNotExist:
        return Response({'error': '거래처를 찾을 수 없습니다'}, status=404)
    try:
        partner.delete()
    except Exception:
        return Response({'error': '이 거래처에 연결된 발주서/입출고 이력이 있어 삭제할 수 없습니다'}, status=400)
    return Response({'message': '거래처 삭제 완료'})