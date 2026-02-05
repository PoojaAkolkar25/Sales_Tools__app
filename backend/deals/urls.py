from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DealViewSet, ImplementationPartnerViewSet, ProductViewSet, CustomerViewSet,
    DealTypeEntryViewSet, AuditTrailViewSet
)

router = DefaultRouter()
router.register(r'deals', DealViewSet, basename='deal')
router.register(r'partners', ImplementationPartnerViewSet, basename='partner')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'deal-types', DealTypeEntryViewSet, basename='deal-type')
router.register(r'audit-trail', AuditTrailViewSet, basename='audit-trail')

urlpatterns = [
    path('', include(router.urls)),
]
