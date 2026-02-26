import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import Group

print("Existing Groups:")
for g in Group.objects.all():
    print(f"- {g.name}")
