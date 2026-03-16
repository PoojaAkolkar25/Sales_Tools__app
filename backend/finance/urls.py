from django.urls import path, include  # type: ignore
from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceViewSet, BankConnectionViewSet, BankTransactionViewSet,
    ReceiptVoucherViewSet, StateMasterViewSet, CompanyProfileViewSet,
    CustomerPartnerViewSet, EndCustomerViewSet, FinancialYearViewSet,
    ExchangeRateViewSet
)

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet)
router.register(r'bank-connections', BankConnectionViewSet)
router.register(r'bank-transactions', BankTransactionViewSet)
router.register(r'receipt-vouchers', ReceiptVoucherViewSet)
router.register(r'state-masters', StateMasterViewSet)
router.register(r'company-profile', CompanyProfileViewSet)
router.register(r'customer-partners', CustomerPartnerViewSet)
router.register(r'end-customers', EndCustomerViewSet)
router.register(r'financial-years', FinancialYearViewSet)
router.register(r'exchange-rates', ExchangeRateViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
