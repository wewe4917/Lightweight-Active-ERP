from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/',          views.dashboard_stats),
    path('items/',              views.inventory_list),
    path('stock-in/',           views.stock_in_create),
    path('stock-out/',          views.stock_out_create),
    path('history/<int:item_id>/', views.stock_history),
]