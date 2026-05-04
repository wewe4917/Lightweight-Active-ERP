from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from decimal import Decimal
from .models import WorkOrder


@api_view(['GET'])
@permission_classes([])
def bom_list(request):
    from inventory.models import Item, BOM
    products = Item.objects.filter(item_type='finished').order_by('name')
    data = []
    for product in products:
        boms = BOM.objects.filter(product=product).select_related('material')
        materials = [
            {
                'id': bom.id,
                'material_id': bom.material.id,
                'material_name': bom.material.name,
                'material_code': bom.material.code,
                'quantity': float(bom.quantity),
                'unit': bom.material.unit,
            }
            for bom in boms
        ]
        if materials:
            data.append({
                'product_id': product.id,
                'product_name': product.name,
                'product_code': product.code,
                'materials': materials,
            })
    return Response(data)


@api_view(['POST'])
@permission_classes([])
def bom_create(request):
    from inventory.models import Item, BOM
    product_id  = request.data.get('product_id')
    material_id = request.data.get('material_id')
    quantity    = request.data.get('quantity')

    try:
        product  = Item.objects.get(id=product_id, item_type='finished')
        material = Item.objects.get(id=material_id)
    except Item.DoesNotExist:
        return Response({'error': '품목을 찾을 수 없습니다'}, status=404)

    if BOM.objects.filter(product=product, material=material).exists():
        return Response({'error': '이미 등록된 BOM입니다'}, status=400)

    bom = BOM.objects.create(
        product=product,
        material=material,
        quantity=quantity,
    )
    return Response({
        'message': 'BOM 등록 완료',
        'id': bom.id,
        'product': product.name,
        'material': material.name,
        'quantity': float(bom.quantity),
    })


@api_view(['DELETE'])
@permission_classes([])
def bom_delete(request, bom_id):
    from inventory.models import BOM
    try:
        bom = BOM.objects.get(id=bom_id)
        bom.delete()
        return Response({'message': 'BOM 삭제 완료'})
    except BOM.DoesNotExist:
        return Response({'error': 'BOM을 찾을 수 없습니다'}, status=404)


@api_view(['GET'])
@permission_classes([])
def finished_items(request):
    from inventory.models import Item
    items = Item.objects.filter(item_type='finished').values('id', 'name', 'code')
    return Response(list(items))


@api_view(['GET'])
@permission_classes([])
def raw_items(request):
    from inventory.models import Item
    items = Item.objects.filter(
        item_type__in=['raw', 'semi']
    ).values('id', 'name', 'code', 'unit')
    return Response(list(items))


@api_view(['GET'])
@permission_classes([])
def workorder_list(request):
    orders = WorkOrder.objects.all().order_by('-created_at').select_related('product', 'assigned_to')
    data = []
    for order in orders:
        progress = 0
        if order.target_qty > 0:
            progress = round((order.actual_qty / order.target_qty) * 100, 1)
        data.append({
            'id': order.id,
            'order_number': order.order_number,
            'product_name': order.product.name,
            'product_code': order.product.code,
            'target_qty': float(order.target_qty),
            'actual_qty': float(order.actual_qty),
            'defect_qty': float(order.defect_qty),
            'status': order.status,
            'status_display': order.get_status_display(),
            'assigned_to': order.assigned_to.username if order.assigned_to else '-',
            'start_date': order.start_date,
            'due_date': order.due_date,
            'progress': progress,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([])
def workorder_create(request):
    from inventory.models import Item
    product_id = request.data.get('product_id')
    target_qty = request.data.get('target_qty')
    start_date = request.data.get('start_date')
    due_date   = request.data.get('due_date')

    try:
        product = Item.objects.get(id=product_id, item_type='finished')
    except Item.DoesNotExist:
        return Response({'error': '완제품을 찾을 수 없습니다'}, status=404)

    today = timezone.now().strftime('%Y%m%d')
    count = WorkOrder.objects.filter(order_number__startswith=f'WO-{today}').count()
    order_number = f'WO-{today}-{str(count + 1).zfill(3)}'

    order = WorkOrder.objects.create(
        order_number=order_number,
        product=product,
        target_qty=target_qty,
        start_date=start_date,
        due_date=due_date,
        status='pending',
    )
    return Response({
        'message': '작업지시서 생성 완료',
        'order_number': order.order_number,
        'product': product.name,
        'target_qty': float(order.target_qty),
    })


@api_view(['PATCH'])
@permission_classes([])
def workorder_status_update(request, order_id):
    try:
        order = WorkOrder.objects.get(id=order_id)
    except WorkOrder.DoesNotExist:
        return Response({'error': '작업지시서를 찾을 수 없습니다'}, status=404)

    new_status = request.data.get('status')
    valid = ['pending', 'in_progress', 'completed', 'cancelled']
    if new_status not in valid:
        return Response({'error': '올바르지 않은 상태값입니다'}, status=400)

    order.status = new_status
    if new_status == 'completed':
        order.completed_at = timezone.now()
    order.save()

    return Response({
        'message': f'상태 변경 완료 → {order.get_status_display()}',
        'order_number': order.order_number,
        'status': order.status,
    })

@api_view(['POST'])
@permission_classes([])
def workorder_complete(request, order_id):
    from inventory.models import Item, BOM, StockOut
    from decimal import Decimal

    try:
        order = WorkOrder.objects.get(id=order_id)
    except WorkOrder.DoesNotExist:
        return Response({'error': '작업지시서를 찾을 수 없습니다'}, status=404)

    if order.status == 'completed':
        return Response({'error': '이미 완료된 작업지시서입니다'}, status=400)

    # BOM 조회
    boms = BOM.objects.filter(product=order.product)
    if not boms.exists():
        return Response({'error': 'BOM이 등록되지 않은 제품입니다'}, status=400)

    actual_qty = request.data.get('actual_qty', order.target_qty)
    defect_qty = request.data.get('defect_qty', 0)

    # 재고 부족 사전 체크
    shortage_list = []
    for bom in boms:
        required = Decimal(str(actual_qty)) * bom.quantity
        if bom.material.current_stock < required:
            shortage_list.append(
                f"{bom.material.name} (필요: {required}, 현재: {bom.material.current_stock})"
            )

    if shortage_list:
        return Response({
            'error': '재고 부족으로 완료 처리 불가',
            'shortage': shortage_list
        }, status=400)

    # 트랜잭션으로 원자재 차감 + 완제품 증가
    with transaction.atomic():
        for bom in boms:
            required = Decimal(str(actual_qty)) * bom.quantity
            # 원자재 재고 차감
            bom.material.current_stock -= required
            bom.material.save()
            # 출고 이력 기록
            StockOut.objects.create(
                item=bom.material,
                quantity=required,
                purpose='production',
                note=f'작업지시서 {order.order_number} 생산 투입',
            )

        # 완제품 재고 증가
        order.product.current_stock += Decimal(str(actual_qty))
        order.product.save()

        # 작업지시서 완료 처리
        order.status = 'completed'
        order.actual_qty = actual_qty
        order.defect_qty = defect_qty
        order.completed_at = timezone.now()
        order.save()

    return Response({
        'message': f'생산 완료 처리 완료',
        'order_number': order.order_number,
        'actual_qty': float(actual_qty),
        'product': order.product.name,
        'product_stock': float(order.product.current_stock),
    })