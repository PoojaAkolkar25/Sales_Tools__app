from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('leads.urls')),
    path('api/', include('cost_sheets.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('deals.urls')),
    path('api/', include('estimates.urls')),
    path('api/', include('sales_orders.urls')),
    path('api/', include('milestones.urls')),
    path('api/inventory/', include('inventory.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
