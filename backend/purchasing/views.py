from django.db import transaction
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from decimal import Decimal
from .models import PurchaseOrder, PurchaseOrderItem, DeliveryNote

# ── 발주서 목록 조회 ──────────────────────────────────
@api_view(['GET'])
@permission_classes([])
def po_list(request):
    orders = PurchaseOrder.objects.all().order_by('-created_at').prefetch_related('items')
    data = []
    for po in orders:
        items = [
            {
                'id': i.id,
                'item_name': i.item.name,
                'item_code': i.item.code,
                'quantity': float(i.quantity),
                'unit_price': float(i.unit_price),
                'total': float(i.quantity * i.unit_price),
            }
            for i in po.items.all()
        ]
        data.append({
            'id': po.id,
            'po_number': po.po_number,
            'partner_name': po.partner.name,
            'partner_id': po.partner.id,
            'status': po.status,
            'status_display': po.get_status_display(),
            'ordered_date': po.ordered_date,
            'expected_date': po.expected_date,
            'note': po.note,
            'items': items,
            'total_amount': sum(i['total'] for i in items),
        })
    return Response(data)


# ── 발주서 생성 ───────────────────────────────────────
@api_view(['POST'])
@permission_classes([])
def po_create(request):
    from inventory.models import Partner, Item

    partner_id    = request.data.get('partner_id')
    expected_date = request.data.get('expected_date')
    note          = request.data.get('note', '')
    items         = request.data.get('items', [])

    if not partner_id or not items:
        return Response({'error': '거래처와 품목은 필수입니다'}, status=400)

    try:
        partner = Partner.objects.get(id=partner_id)
    except Partner.DoesNotExist:
        return Response({'error': '거래처를 찾을 수 없습니다'}, status=404)

    today = timezone.now().strftime('%Y%m%d')
    count = PurchaseOrder.objects.filter(po_number__startswith=f'PO-{today}').count()
    po_number = f'PO-{today}-{str(count + 1).zfill(3)}'

    with transaction.atomic():
        po = PurchaseOrder.objects.create(
            po_number=po_number,
            partner=partner,
            expected_date=expected_date,
            note=note,
            status='draft',
        )
        for item_data in items:
            try:
                item = Item.objects.get(id=item_data['item_id'])
            except Item.DoesNotExist:
                continue
            PurchaseOrderItem.objects.create(
                po=po,
                item=item,
                quantity=item_data.get('quantity', 1),
                unit_price=item_data.get('unit_price', 0),
            )

    return Response({
        'message': '발주서 생성 완료',
        'po_number': po.po_number,
        'id': po.id,
    })


# ── 발주서 상태 변경 ──────────────────────────────────
@api_view(['PATCH'])
@permission_classes([])
def po_status_update(request, po_id):
    try:
        po = PurchaseOrder.objects.get(id=po_id)
    except PurchaseOrder.DoesNotExist:
        return Response({'error': '발주서를 찾을 수 없습니다'}, status=404)

    new_status = request.data.get('status')
    valid = ['draft', 'sent', 'received', 'cancelled']
    if new_status not in valid:
        return Response({'error': '올바르지 않은 상태값'}, status=400)

    # 입고완료 시 재고 자동 증가
    if new_status == 'received' and po.status != 'received':
        from inventory.models import StockIn
        with transaction.atomic():
            for poi in po.items.all():
                poi.item.current_stock += poi.quantity
                poi.item.save()
                StockIn.objects.create(
                    item=poi.item,
                    partner=po.partner,
                    quantity=poi.quantity,
                    unit_price=poi.unit_price,
                    note=f'발주서 {po.po_number} 입고',
                )

    po.status = new_status
    po.save()
    return Response({'message': f'상태 변경 완료 → {po.get_status_display()}'})


# ── 발주서 PDF 출력 ───────────────────────────────────
@api_view(['GET'])
@permission_classes([])
def po_pdf(request, po_id):
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import io, os

    try:
        po = PurchaseOrder.objects.get(id=po_id)
    except PurchaseOrder.DoesNotExist:
        return Response({'error': '발주서 없음'}, status=404)

    # 한글 폰트 등록
    font_path = r'C:\Windows\Fonts\malgun.ttf'
    if not os.path.exists(font_path):
        font_path = r'C:\Windows\Fonts\gulim.ttc'
    pdfmetrics.registerFont(TTFont('Korean', font_path))

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # 제목
    p.setFont("Korean", 20)
    p.drawString(50, height - 60, "발주서 (PURCHASE ORDER)")

    p.setFont("Korean", 12)
    p.drawString(50, height - 90,  f"발주번호 : {po.po_number}")
    p.drawString(50, height - 110, f"거래처   : {po.partner.name}")
    p.drawString(50, height - 130, f"발주일   : {po.ordered_date}")
    p.drawString(50, height - 150, f"납기예정 : {po.expected_date or '-'}")
    p.drawString(50, height - 170, f"상태     : {po.get_status_display()}")

    p.line(50, height - 185, width - 50, height - 185)

    # 헤더
    p.setFont("Korean", 11)
    p.drawString(50,  height - 205, "품목코드")
    p.drawString(180, height - 205, "품목명")
    p.drawString(370, height - 205, "수량")
    p.drawString(430, height - 205, "단가")
    p.drawString(510, height - 205, "합계")

    p.line(50, height - 212, width - 50, height - 212)

    y = height - 230
    total_amount = 0
    p.setFont("Korean", 10)
    for poi in po.items.all():
        total = float(poi.quantity * poi.unit_price)
        total_amount += total
        p.drawString(50,  y, poi.item.code)
        p.drawString(180, y, poi.item.name[:15])
        p.drawString(370, y, str(float(poi.quantity)))
        p.drawString(430, y, f"{float(poi.unit_price):,.0f}")
        p.drawString(510, y, f"{total:,.0f}")
        y -= 20

    p.line(50, y - 5, width - 50, y - 5)
    p.setFont("Korean", 11)
    p.drawString(430, y - 20, "총 합계")
    p.drawString(510, y - 20, f"{total_amount:,.0f}")

    if po.note:
        p.setFont("Korean", 10)
        p.drawString(50, y - 50, f"비고: {po.note}")

    p.showPage()
    p.save()

    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="PO_{po.po_number}.pdf"'
    return response


# ── 납품지시서 목록 조회 ──────────────────────────────
@api_view(['GET'])
@permission_classes([])
def dn_list(request):
    notes = DeliveryNote.objects.all().order_by('-created_at').select_related('partner', 'item', 'work_order')
    data = []
    for dn in notes:
        data.append({
            'id': dn.id,
            'dn_number': dn.dn_number,
            'partner_name': dn.partner.name,
            'item_name': dn.item.name,
            'item_code': dn.item.code,
            'quantity': float(dn.quantity),
            'status': dn.status,
            'status_display': dn.get_status_display(),
            'delivered_date': dn.delivered_date,
            'work_order': dn.work_order.order_number if dn.work_order else '-',
        })
    return Response(data)


# ── 납품지시서 생성 ───────────────────────────────────
@api_view(['POST'])
@permission_classes([])
def dn_create(request):
    from inventory.models import Partner, Item

    partner_id = request.data.get('partner_id')
    item_id    = request.data.get('item_id')
    quantity   = request.data.get('quantity')

    if not partner_id or not item_id or not quantity:
        return Response({'error': '거래처, 품목, 수량은 필수입니다'}, status=400)

    try:
        partner = Partner.objects.get(id=partner_id)
        item    = Item.objects.get(id=item_id)
    except Exception:
        return Response({'error': '거래처 또는 품목을 찾을 수 없습니다'}, status=404)

    today = timezone.now().strftime('%Y%m%d')
    count = DeliveryNote.objects.filter(dn_number__startswith=f'DN-{today}').count()
    dn_number = f'DN-{today}-{str(count + 1).zfill(3)}'

    dn = DeliveryNote.objects.create(
        dn_number=dn_number,
        partner=partner,
        item=item,
        quantity=quantity,
        status='pending',
    )
    return Response({
        'message': '납품지시서 생성 완료',
        'dn_number': dn.dn_number,
        'id': dn.id,
    })


# ── 납품 완료 처리 ────────────────────────────────────
@api_view(['POST'])
@permission_classes([])
def dn_complete(request, dn_id):
    from inventory.models import StockOut

    try:
        dn = DeliveryNote.objects.get(id=dn_id)
    except DeliveryNote.DoesNotExist:
        return Response({'error': '납품지시서를 찾을 수 없습니다'}, status=404)

    if dn.status == 'delivered':
        return Response({'error': '이미 납품 완료된 건입니다'}, status=400)

    if dn.item.current_stock < dn.quantity:
        return Response({
            'error': f'재고 부족 (현재: {dn.item.current_stock}, 필요: {dn.quantity})'
        }, status=400)

    with transaction.atomic():
        # 완제품 재고 차감
        dn.item.current_stock -= dn.quantity
        dn.item.save()

        # 출고 이력 자동 생성
        StockOut.objects.create(
            item=dn.item,
            partner=dn.partner,
            quantity=dn.quantity,
            purpose='delivery',
            note=f'납품지시서 {dn.dn_number} 납품 완료',
        )

        dn.status = 'delivered'
        dn.delivered_date = timezone.now().date()
        dn.save()

    return Response({
        'message': '납품 완료 처리 완료',
        'dn_number': dn.dn_number,
        'item': dn.item.name,
        'quantity': float(dn.quantity),
        'current_stock': float(dn.item.current_stock),
    })
    
