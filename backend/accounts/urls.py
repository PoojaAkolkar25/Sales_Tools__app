from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, UserViewSet, CurrentUserView

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view({'get': 'list'}), name='me'),
    path('', include(router.urls)),
]
