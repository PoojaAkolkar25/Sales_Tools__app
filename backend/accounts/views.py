from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from django.contrib.auth.models import User
from .serializers import UserSerializer

class LoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        user_serializer = UserSerializer(user)
        return Response({
            'token': token.key,
            'user': user_serializer.data
        })

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'toggle_status']:
            # Only admin can create, delete, or toggle status
            return [permissions.IsAuthenticated(), IsAppAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({
            'status': 'success',
            'is_active': user.is_active,
            'message': f'User {user.username} is now {"active" if user.is_active else "inactive"}'
        })

class IsAppAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or request.user.groups.filter(name='app_admin').exists()

class CurrentUserView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
