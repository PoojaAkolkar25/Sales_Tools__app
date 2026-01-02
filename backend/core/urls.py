from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('leads.urls')),
    path('api/', include('cost_sheets.urls')),
    path('api/auth/', include('accounts.urls')),
]
