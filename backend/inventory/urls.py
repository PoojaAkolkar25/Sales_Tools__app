from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResourceViewSet, ResourceRequestViewSet

router = DefaultRouter()
router.register(r'resources', ResourceViewSet)
router.register(r'requests', ResourceRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
