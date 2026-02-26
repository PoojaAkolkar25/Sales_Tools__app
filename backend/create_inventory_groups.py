import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import Group

groups = [
    'Project Manager',
    'IT Head',
    'Finance Manager',
    'Server Issuing Authority'
]

for group_name in groups:
    group, created = Group.objects.get_or_create(name=group_name)
    if created:
        print(f"Created group: {group_name}")
    else:
        print(f"Group already exists: {group_name}")
