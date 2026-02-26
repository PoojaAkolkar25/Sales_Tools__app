from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RevenueContractViewSet, RevenueScheduleViewSet, 
    ConsumptionRecordViewSet, FixedBidProgressViewSet, PeriodLockViewSet
)

router = DefaultRouter()
router.register(r'contracts', RevenueContractViewSet)
router.register(r'schedules', RevenueScheduleViewSet)
router.register(r'consumptions', ConsumptionRecordViewSet)
router.register(r'progress', FixedBidProgressViewSet)
router.register(r'locks', PeriodLockViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
