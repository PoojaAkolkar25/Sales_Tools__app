import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User

# Set email for admin1 user
updates = [
    ('admin1', 'pooja.akolkar@valuedx.com'),
    # Add more mappings here if needed:
    # ('admin', 'some@email.com'),
]

for username, email in updates:
    try:
        user = User.objects.get(username=username)
        user.email = email
        user.save()
        print(f"✓ Set email for '{username}' → {email}")
    except User.DoesNotExist:
        print(f"✗ User '{username}' not found")

print("\nAll users after update:")
print(f"{'Username':<20} {'Email':<40}")
print("-" * 60)
for u in User.objects.all().order_by('id'):
    print(f"{u.username:<20} {u.email or '(NOT SET)':<40}")
