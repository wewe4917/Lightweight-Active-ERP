from django.db import transaction
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from decimal import Decimal
from .models import PurchaseOrder, PurchaseOrderItem, DeliveryNote
import uuid, base64, re
import requests as req
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

@api_view(['POST'])
@permission_classes([])
def ocr_po_match(request):
    from inventory.models import Partner, Item

    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': '이미지가 없습니다'}, status=400)

    image_data = base64.b64encode(image_file.read()).decode('utf-8')
    filename = image_file.name.lower()
    fmt = 'png' if filename.endswith('.png') else 'pdf' if filename.endswith('.pdf') else 'jpg'

    payload = {
        "version": "V2",
        "requestId": str(uuid.uuid4()),
        "timestamp": 0,
        "images": [{"format": fmt, "name": "delivery_note", "data": image_data}]
    }
    headers = {
        "Content-Type": "application/json",
        "X-OCR-SECRET": "dHRrWmtVelRYWUhteXJuaWJPYlZ3V0xEVFJKRWF4dEQ="
    }
    OCR_URL = "https://izkahjdx3k.apigw.ntruss.com/custom/v1/52471/b25f51bc1cca3d42c9908bd70757af3ce3549ae72fc9c353d6f4f326f193b1aa/general"

    try:
        res = req.post(OCR_URL, json=payload, headers=headers, timeout=30)
        result = res.json()
    except Exception as e:
        return Response({'error': f'OCR API 호출 실패: {str(e)}'}, status=500)

    try:
        fields = result['images'][0]['fields']
    except (KeyError, IndexError):
        return Response({'error': 'OCR 인식 실패', 'raw': result}, status=400)

    full_text = ' '.join([f['inferText'] for f in fields])

    # 줄 단위로 묶기
    lines_dict = {}
    for field in fields:
        y = round(field['boundingPoly']['vertices'][0]['y'] / 15)
        lines_dict.setdefault(y, []).append(field['inferText'])
    lines = [' '.join(words) for _, words in sorted(lines_dict.items())]

    # 거래처 인식
    all_partners = Partner.objects.all()        
    # 이렇게 교체 - (주) 같은 접두어 제거 후 매칭
    import re as _re
    matched_partner = None
    full_text_clean = _re.sub(r'[\(\)주()（）]', '', full_text)  # 괄호/주 제거

    for p in all_partners:
        partner_clean = _re.sub(r'[\(\)주()（）]', '', p.name)
        if partner_clean in full_text_clean:
            matched_partner = p
            break

    # 품번 + 수량 인식
    all_items = Item.objects.all()
    item_code_map = {i.code.upper(): i for i in all_items}
    ocr_items = []

    for line in lines:
        code_match = re.search(r'[A-Za-z0-9]+-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*', line)
        if not code_match:
            continue
        extracted_code = code_match.group(0).upper()
        found_item = item_code_map.get(extracted_code)
        if not found_item:
            continue

        numbers = re.findall(r'\d+', line)
        qty = 0
        for n in reversed(numbers):
            val = int(n)
            if 0 < val < 10000 and val not in [2025, 2024, 2023]:
                qty = val
                break
        if qty == 0:
            continue

        ocr_items.append({
            'item_id': found_item.id,
            'item_code': found_item.code,
            'item_name': found_item.name,
            'quantity': qty,
        })

    # sent 상태 발주서 중에서 거래처 + 품번 + 수량 대조
    matched_results = []
    if matched_partner:
        sent_orders = PurchaseOrder.objects.filter(
            status='sent',
            partner=matched_partner
        ).prefetch_related('items')

        for po in sent_orders:
            po_item_map = {
                poi.item.code.upper(): poi
                for poi in po.items.all()
            }
            for ocr_item in ocr_items:
                poi = po_item_map.get(ocr_item['item_code'].upper())
                if poi:
                    matched_results.append({
                        'po_id': po.id,
                        'po_number': po.po_number,
                        'partner_name': matched_partner.name,
                        'item_id': poi.item.id,
                        'item_code': poi.item.code,
                        'item_name': poi.item.name,
                        'quantity': float(ocr_item['quantity']),      # 납품서 수량
                        'po_quantity': float(poi.quantity),            # 발주 수량
                        'quantity_mismatch': float(poi.quantity) != float(ocr_item['quantity']),
                        'unit_price': float(poi.unit_price),
                        'selected': True,
                    })

    return Response({
        'raw_text': full_text,
        'partner_name': matched_partner.name if matched_partner else None,
        'ocr_items': ocr_items,
        'matched_results': matched_results,
    })


@api_view(['POST'])
@permission_classes([])
def ocr_po_complete(request):
    from inventory.models import StockIn

    items = request.data.get('items', [])
    if not items:
        return Response({'error': '처리할 항목이 없습니다'}, status=400)

    completed_pos = set()
    with transaction.atomic():
        for item in items:
            po_id = item.get('po_id')
            item_id = item.get('item_id')
            quantity = item.get('quantity')

            try:
                po = PurchaseOrder.objects.get(id=po_id, status='sent')
                poi = po.items.get(item__id=item_id)
            except Exception:
                continue

            # 재고 증가
            poi.item.current_stock += poi.quantity
            poi.item.save()

            # 입고 이력
            StockIn.objects.create(
                item=poi.item,
                partner=po.partner,
                quantity=poi.quantity,
                unit_price=poi.unit_price,
                note=f'납품서 OCR 입고 - {po.po_number}',
            )

            completed_pos.add(po_id)

        # 발주서 전체 품목이 다 처리됐으면 입고완료로 변경
        for po_id in completed_pos:
            po = PurchaseOrder.objects.get(id=po_id)
            po.status = 'received'
            po.save()

    return Response({'message': f'{len(items)}건 입고완료 처리되었습니다'})