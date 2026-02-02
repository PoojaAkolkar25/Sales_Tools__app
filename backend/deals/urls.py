from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DealViewSet, ImplementationPartnerViewSet, ProductViewSet, CustomerViewSet
)

router = DefaultRouter()
router.register(r'deals', DealViewSet)
router.register(r'partners', ImplementationPartnerViewSet)
router.register(r'products', ProductViewSet)
router.register(r'customers', CustomerViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
