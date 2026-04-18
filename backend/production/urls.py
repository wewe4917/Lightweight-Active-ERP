from django.urls import path
from . import views

urlpatterns = [
    path('bom/',                    views.bom_list),
    path('bom/create/',             views.bom_create),
    path('bom/<int:bom_id>/',       views.bom_delete),
    path('items/finished/',         views.finished_items),
    path('items/raw/',              views.raw_items),
    path('workorders/',             views.workorder_list),
    path('workorders/create/',      views.workorder_create),
    path('workorders/<int:order_id>/status/', views.workorder_status_update),
]