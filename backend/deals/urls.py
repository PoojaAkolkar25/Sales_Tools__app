from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DealViewSet, DealOwnerViewSet, ImplementationPartnerViewSet,
    ProductViewSet, OpportunitySourceMasterViewSet, IndustryMasterViewSet, CustomerViewSet, CountryMasterViewSet
)

router = DefaultRouter()
router.register(r'deals', DealViewSet)
router.register(r'deal-owners', DealOwnerViewSet)
router.register(r'partners', ImplementationPartnerViewSet)
router.register(r'products', ProductViewSet)
router.register(r'sources', OpportunitySourceMasterViewSet)
router.register(r'industries', IndustryMasterViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'countries', CountryMasterViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
