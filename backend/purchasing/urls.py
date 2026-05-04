from django.urls import path
from . import views

urlpatterns = [
    path('orders/',                          views.po_list),
    path('orders/create/',                   views.po_create),
    path('orders/<int:po_id>/status/',       views.po_status_update),
    path('orders/<int:po_id>/update/',       views.po_update),
    path('orders/<int:po_id>/delete/',       views.po_delete),
    path('orders/<int:po_id>/pdf/',          views.po_pdf),
    path('delivery/',                        views.dn_list),
    path('delivery/create/',                 views.dn_create),
    path('delivery/<int:dn_id>/complete/',   views.dn_complete),
    path('ocr/',                             views.ocr_po_match),
    path('ocr/complete/',                    views.ocr_po_complete),
]