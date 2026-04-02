from django.contrib import admin
from .models import Item, Partner, BOM, StockIn, StockOut

# Register your models here.
admin.site.register(Item)
admin.site.register(Partner)
admin.site.register(BOM)
admin.site.register(StockIn)
admin.site.register(StockOut)