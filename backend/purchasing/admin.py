from django.contrib import admin
from .models import PurchaseOrder, PurchaseOrderItem, DeliveryNote

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'partner', 'status', 'ordered_date']
    list_filter  = ['status']

@admin.register(DeliveryNote)
class DeliveryNoteAdmin(admin.ModelAdmin):
    list_display = ['dn_number', 'partner', 'item', 'quantity', 'status']
    list_filter  = ['status']