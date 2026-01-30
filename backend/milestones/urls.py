from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MilestoneViewSet

router = DefaultRouter()
router.register(r'milestones', MilestoneViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
