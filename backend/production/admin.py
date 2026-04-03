from django.contrib import admin
from .models import WorkOrder

@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'product', 'target_qty', 'actual_qty', 'status', 'due_date']
    list_filter = ['status']
    search_fields = ['order_number']