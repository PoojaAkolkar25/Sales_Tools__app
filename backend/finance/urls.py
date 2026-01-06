from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, BankConnectionViewSet, BankTransactionViewSet, ReceiptVoucherViewSet

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet)
router.register(r'bank-connections', BankConnectionViewSet)
router.register(r'bank-transactions', BankTransactionViewSet)
router.register(r'receipt-vouchers', ReceiptVoucherViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
