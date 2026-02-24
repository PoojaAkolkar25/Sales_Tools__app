import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User
from accounts.views import UserViewSet
import json

factory = APIRequestFactory()
data = {
    "username": "new_user_123",
    "email": "new@test.com",
    "password": "Password123",
    "first_name": "Test",
    "last_name": "User",
    "role": "app_user",
    "mobile": "",
    "department": "",
    "region": "",
    "reporting_to": None,
    "employee_id": ""
}

request = factory.post('/api/auth/users/', data, format='json')
user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.first()

force_authenticate(request, user=user)

view = UserViewSet.as_view({'post': 'create'})
response = view(request)

print("Status:", response.status_code)
print("Response:", response.data)
