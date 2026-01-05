from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CostSheetViewSet

router = DefaultRouter()
router.register(r'cost-sheets', CostSheetViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
