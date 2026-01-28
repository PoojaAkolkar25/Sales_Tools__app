from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EstimateViewSet, ProposalViewSet, RenewalViewSet

router = DefaultRouter()
router.register(r'estimates', EstimateViewSet)
router.register(r'proposals', ProposalViewSet)
router.register(r'renewals', RenewalViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
