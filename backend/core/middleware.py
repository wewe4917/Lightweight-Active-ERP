from django.utils.deprecation import MiddlewareMixin
import json


class AuditLogMiddleware(MiddlewareMixin):

    TRACK_POST_PATHS = [
        '/api/inventory/stock-in/',
        '/api/inventory/stock-out/',
        '/api/inventory/items/create/',
        '/api/inventory/partners/create/',
        '/api/production/workorders/create/',
        '/api/production/bom/create/',
        '/api/purchasing/orders/create/',
        '/api/purchasing/delivery/create/',
    ]
    TRACK_PATCH_PATHS = [
        '/api/production/workorders/',
        '/api/purchasing/orders/',
        '/api/purchasing/delivery/',
    ]
    # POST지만 완료 처리인 것들 (별도 처리)
    TRACK_COMPLETE_PATHS = [
        '/api/production/workorders/',   # /complete/
        '/api/purchasing/delivery/',     # /complete/
        '/api/purchasing/orders/',       # /received 는 PATCH로 처리
    ]

    MODEL_NAME_MAP = {
        'stock-in':   '입고',
        'stock-out':  '출고',
        'items':      '품목',
        'partners':   '거래처',
        'workorders': '작업지시',
        'bom':        'BOM',
        'orders':     '발주',
        'delivery':   '납품',
    }

    # ────────────────────────────────────────────────
    # request.body 는 한 번만 읽을 수 있으므로 미리 캐싱
    # PATCH 의 경우 변경 전 데이터도 여기서 저장
    # ────────────────────────────────────────────────
    def process_request(self, request):
        try:
            request._cached_body = request.body
        except Exception:
            request._cached_body = b''

        if request.method == 'PATCH':
            if any(request.path.startswith(p) for p in self.TRACK_PATCH_PATHS):
                try:
                    parts   = request.path.strip('/').split('/')
                    pk      = next((p for p in reversed(parts) if p.isdigit()), None)
                    segment = next((p for p in parts if p in self.MODEL_NAME_MAP), None)
                    if pk and segment:
                        request._audit_before   = self._get_before_data(segment, pk)
                        request._audit_segment  = segment
                        request._audit_pk       = pk
                except Exception:
                    pass

    # ────────────────────────────────────────────────
    # 변경 전 데이터 조회
    # ────────────────────────────────────────────────
    def _get_before_data(self, segment, pk):
        try:
            if segment == 'workorders':
                from production.models import WorkOrder
                o = WorkOrder.objects.get(pk=pk)
                return {
                    'status':     o.get_status_display(),
                    'actual_qty': str(o.actual_qty),
                    'defect_qty': str(o.defect_qty),
                    'due_date':   str(o.due_date),
                }
            elif segment == 'orders':
                from purchasing.models import PurchaseOrder
                o = PurchaseOrder.objects.get(pk=pk)
                return {
                    'status': o.get_status_display(),
                    'note':   o.note or '',
                }
            elif segment == 'delivery':
                from purchasing.models import DeliveryNote
                o = DeliveryNote.objects.get(pk=pk)
                return {
                    'status': o.get_status_display(),
                }
        except Exception:
            pass
        return {}

    # ────────────────────────────────────────────────
    # 상태값 한국어 변환
    # ────────────────────────────────────────────────
    STATUS_DISPLAY = {
        'pending':     '대기',
        'in_progress': '진행중',
        'completed':   '완료',
        'cancelled':   '취소',
        'draft':       '작성중',
        'sent':        '발송완료',
        'received':    '입고완료',
        'delivered':   '납품완료',
    }

    def _status_kr(self, val):
        return self.STATUS_DISPLAY.get(val, val)

    # ────────────────────────────────────────────────
    # process_response
    # ────────────────────────────────────────────────
    def process_response(self, request, response):
        try:
            should_track = False
            action       = 'create'
            path         = request.path

            if request.method == 'POST' and response.status_code in [200, 201]:
                if any(path == p for p in self.TRACK_POST_PATHS):
                    should_track = True
                    action = 'create'
                # /complete/ 엔드포인트 (workorder_complete, dn_complete)
                elif 'complete' in path.split('/'):
                    should_track = True
                    action = 'complete'

            if request.method == 'PATCH' and response.status_code == 200:
                if any(path.startswith(p) for p in self.TRACK_PATCH_PATHS):
                    should_track = True
                    action = 'update'

            if request.method == 'DELETE' and response.status_code == 200:
                should_track = True
                action = 'delete'

            if not should_track:
                return response

            # 유저
            user = request.user if (request.user and request.user.is_authenticated) else None

            # IP
            x_fwd = request.META.get('HTTP_X_FORWARDED_FOR')
            ip    = x_fwd.split(',')[0] if x_fwd else request.META.get('REMOTE_ADDR')

            # 디바이스
            device = request.META.get('HTTP_USER_AGENT', '')[:200]

            # 모델명 (한국어)
            parts    = path.strip('/').split('/')
            segment  = next((p for p in parts if p in self.MODEL_NAME_MAP), '')
            model_name = self.MODEL_NAME_MAP.get(segment, segment)

            # 상세 내용
            detail = self._build_detail(request, action, segment, response)

            from core.models import AuditLog
            AuditLog.objects.create(
                user=user,
                action=action if action in ['create', 'update', 'delete', 'login'] else 'update',
                model_name=model_name,
                detail=detail,
                ip_address=ip,
                device=device,
            )
        except Exception:
            pass

        return response

    # ────────────────────────────────────────────────
    # 액션별 상세 메시지 생성
    # ────────────────────────────────────────────────
    def _build_detail(self, request, action, segment, response):
        try:
            body = json.loads(request._cached_body.decode('utf-8')) if request._cached_body else {}
        except Exception:
            body = {}

        try:
            resp_data = json.loads(response.content.decode('utf-8'))
        except Exception:
            resp_data = {}

        try:
            # ── 입고 ──────────────────────────────────
            if segment == 'stock-in' and action == 'create':
                item_name = self._item_name(body.get('item_id'))
                qty       = body.get('quantity', '')
                partner   = self._partner_name(body.get('partner_id'))
                lot       = body.get('lot_number', '')
                parts = [f"({item_name}) 입고 +{qty}"]
                if partner: parts.append(f"거래처: {partner}")
                if lot:     parts.append(f"LOT: {lot}")
                return json.dumps({'summary': ' | '.join(parts)}, ensure_ascii=False)

            # ── 출고 ──────────────────────────────────
            elif segment == 'stock-out' and action == 'create':
                item_name = self._item_name(body.get('item_id'))
                qty       = body.get('quantity', '')
                purpose_map = {'production':'생산투입','delivery':'납품출고','disposal':'폐기','other':'기타'}
                purpose   = purpose_map.get(body.get('purpose',''), body.get('purpose',''))
                parts = [f"({item_name}) 출고 -{qty}"]
                if purpose and purpose != '기타': parts.append(f"목적: {purpose}")
                return json.dumps({'summary': ' | '.join(parts)}, ensure_ascii=False)

            # ── 품목 등록 ──────────────────────────────
            elif segment == 'items' and action == 'create':
                code      = body.get('code', '')
                name      = body.get('name', '')
                type_map  = {'raw':'원자재','semi':'반제품','finished':'완제품'}
                itype     = type_map.get(body.get('item_type',''), body.get('item_type',''))
                safety    = body.get('safety_stock', '')
                return json.dumps({
                    'summary': f"({code}) {name} 등록 | 분류: {itype} | 안전재고: {safety}"
                }, ensure_ascii=False)

            # ── 거래처 등록 ────────────────────────────
            elif segment == 'partners' and action == 'create':
                code      = body.get('code', '')
                name      = body.get('name', '')
                type_map  = {'supplier':'공급업체','customer':'납품처','both':'양방향'}
                ptype     = type_map.get(body.get('partner_type',''), body.get('partner_type',''))
                return json.dumps({
                    'summary': f"({code}) {name} 등록 | 유형: {ptype}"
                }, ensure_ascii=False)

            # ── BOM 등록 ───────────────────────────────
            elif segment == 'bom' and action == 'create':
                product  = self._item_name(body.get('product_id'))
                material = self._item_name(body.get('material_id'))
                qty      = body.get('quantity', '')
                return json.dumps({
                    'summary': f"완제품: {product} ← 자재: {material} x{qty} 등록"
                }, ensure_ascii=False)

            # ── BOM 삭제 ───────────────────────────────
            elif segment == 'bom' and action == 'delete':
                parts_path = request.path.strip('/').split('/')
                bom_id = next((p for p in reversed(parts_path) if p.isdigit()), '?')
                bom_info = self._bom_info(bom_id)
                return json.dumps({
                    'summary': f"BOM 삭제: {bom_info}"
                }, ensure_ascii=False)

            # ── 작업지시 생성 ──────────────────────────
            elif segment == 'workorders' and action == 'create':
                product = self._item_name(body.get('product_id'))
                qty     = body.get('target_qty', '')
                due     = body.get('due_date', '')
                return json.dumps({
                    'summary': f"({product}) 작업지시 생성 | 목표수량: {qty} | 마감: {due}"
                }, ensure_ascii=False)

            # ── 작업지시 상태 변경 (PATCH) ─────────────
            elif segment == 'workorders' and action == 'update':
                before  = getattr(request, '_audit_before', {})
                new_status = self._status_kr(body.get('status', ''))
                old_status = before.get('status', '?')
                order_num  = resp_data.get('order_number', '')
                return json.dumps({
                    'summary': f"{order_num} 상태 변경: {old_status} → {new_status}"
                }, ensure_ascii=False)

            # ── 작업지시 완료처리 (POST /complete/) ────
            elif segment == 'workorders' and action == 'complete':
                actual  = body.get('actual_qty', '')
                defect  = body.get('defect_qty', 0)
                product = resp_data.get('product', '')
                order_num = resp_data.get('order_number', '')
                return json.dumps({
                    'summary': f"{order_num} 생산완료 | 제품: {product} | 실생산: {actual} | 불량: {defect}"
                }, ensure_ascii=False)

            # ── 발주서 생성 ────────────────────────────
            elif segment == 'orders' and action == 'create':
                partner   = self._partner_name(body.get('partner_id'))
                items     = body.get('items', [])
                item_strs = []
                for i in items:
                    iname = self._item_name(i.get('item_id'))
                    item_strs.append(f"{iname} x{i.get('quantity','')}")
                po_number = resp_data.get('po_number', '')
                return json.dumps({
                    'summary': f"{po_number} 발주 생성 | 거래처: {partner} | 품목: {', '.join(item_strs)}"
                }, ensure_ascii=False)

            # ── 발주서 상태 변경 (PATCH) ───────────────
            elif segment == 'orders' and action == 'update':
                before     = getattr(request, '_audit_before', {})
                new_status = self._status_kr(body.get('status', ''))
                old_status = before.get('status', '?')
                parts_path = request.path.strip('/').split('/')
                po_id      = next((p for p in reversed(parts_path) if p.isdigit()), '?')
                po_number  = self._po_number(po_id)
                return json.dumps({
                    'summary': f"{po_number} 상태 변경: {old_status} → {new_status}"
                }, ensure_ascii=False)

            # ── 납품지시 생성 ──────────────────────────
            elif segment == 'delivery' and action == 'create':
                partner  = self._partner_name(body.get('partner_id'))
                item     = self._item_name(body.get('item_id'))
                qty      = body.get('quantity', '')
                dn_number = resp_data.get('dn_number', '')
                return json.dumps({
                    'summary': f"{dn_number} 납품지시 생성 | 거래처: {partner} | {item} x{qty}"
                }, ensure_ascii=False)

            # ── 납품 완료 (POST /complete/) ────────────
            elif segment == 'delivery' and action == 'complete':
                dn_number = resp_data.get('dn_number', '')
                item      = resp_data.get('item', '')
                qty       = resp_data.get('quantity', '')
                return json.dumps({
                    'summary': f"{dn_number} 납품완료 | {item} -{qty}"
                }, ensure_ascii=False)

            # ── 납품 상태 변경 (PATCH) ─────────────────
            elif segment == 'delivery' and action == 'update':
                before     = getattr(request, '_audit_before', {})
                new_status = self._status_kr(body.get('status', ''))
                old_status = before.get('status', '?')
                return json.dumps({
                    'summary': f"납품지시 상태 변경: {old_status} → {new_status}"
                }, ensure_ascii=False)

        except Exception:
            pass
        return ''

    # ────────────────────────────────────────────────
    # 헬퍼: ID → 이름 조회
    # ────────────────────────────────────────────────
    def _item_name(self, item_id):
        if not item_id:
            return '?'
        try:
            from inventory.models import Item
            item = Item.objects.get(pk=item_id)
            return f"{item.code} {item.name}"
        except Exception:
            return str(item_id)

    def _partner_name(self, partner_id):
        if not partner_id:
            return ''
        try:
            from inventory.models import Partner
            return Partner.objects.get(pk=partner_id).name
        except Exception:
            return str(partner_id)

    def _bom_info(self, bom_id):
        try:
            from inventory.models import BOM
            bom = BOM.objects.get(pk=bom_id)
            return f"{bom.product.name} ← {bom.material.name} x{bom.quantity}"
        except Exception:
            return f"ID {bom_id}"

    def _po_number(self, po_id):
        try:
            from purchasing.models import PurchaseOrder
            return PurchaseOrder.objects.get(pk=po_id).po_number
        except Exception:
            return f"PO#{po_id}"