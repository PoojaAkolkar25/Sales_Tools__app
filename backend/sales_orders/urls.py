from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesOrderViewSet, IncomingEmailViewSet, PurchaseOrderFileViewSet

router = DefaultRouter()
router.register(r'sales-orders', SalesOrderViewSet)
router.register(r'incoming-emails', IncomingEmailViewSet)
router.register(r'po-files', PurchaseOrderFileViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
