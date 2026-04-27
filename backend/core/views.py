from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import AuditLog


@api_view(['GET'])
@permission_classes([])
def auditlog_list(request):
    logs = AuditLog.objects.all().order_by('-timestamp')[:100]
    data = []
    for log in logs:
        data.append({
            'id': log.id,
            'user': log.user.username if log.user else '알 수 없음',
            'action': log.action,
            'action_display': log.get_action_display(),
            'model_name': log.model_name,
            'detail': log.detail,
            'ip_address': str(log.ip_address) if log.ip_address else '-',
            'device': log.device[:80] if log.device else '-',
            'timestamp': log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        })
    return Response(data)