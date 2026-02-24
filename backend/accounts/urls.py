from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, UserViewSet, CurrentUserView, ForgotPasswordView, ResetPasswordView

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view({'get': 'list'}), name='me'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('', include(router.urls)),
]
