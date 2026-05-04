from django.urls import path
from . import views
from .views import item_delete, partner_delete
urlpatterns = [
    path('dashboard/',                views.dashboard),
    path('items/',                    views.inventory_list),
    path('items/create/',             views.item_create),
    path('items/<int:item_id>/',      views.item_detail),
    path('stock-in/',                 views.stock_in_create),
    path('stock-out/',                views.stock_out_create),
    path('history/<int:item_id>/',    views.stock_history),
    path('partners/', views.partner_list),
    path('partners/',        views.partner_list),
    path('partners/create/', views.partner_create),
    path('items/<int:item_id>/delete/', item_delete),
    path('partners/<int:partner_id>/delete/', partner_delete),

]