from django.urls import path
from . import views
from .views import ocr_document
urlpatterns = [
    path('dashboard/',                views.dashboard_stats),
    path('items/',                    views.inventory_list),
    path('items/create/',             views.item_create),
    path('items/<int:item_id>/',      views.item_detail),
    path('stock-in/',                 views.stock_in_create),
    path('stock-out/',                views.stock_out_create),
    path('history/<int:item_id>/',    views.stock_history),
    path('partners/', views.partner_list),
    path('partners/',        views.partner_list),
    path('partners/create/', views.partner_create),
    path('ocr/', ocr_document),

]