import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User

print("=" * 60)
print(f"{'ID':<5} {'Username':<20} {'Email':<35} {'Active'}")
print("-" * 60)
for u in User.objects.all().order_by('id'):
    email_display = u.email if u.email else "(NOT SET)"
    print(f"{u.id:<5} {u.username:<20} {email_display:<35} {u.is_active}")
print("=" * 60)
print("\nUsers with NO email set:")
no_email = User.objects.filter(email='')
if no_email.exists():
    for u in no_email:
        print(f"  - {u.username}")
else:
    print("  All users have emails set.")
