import os
import django
import sys

# Setup Django environment
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User, Group

def check_perms():
    print("--- Groups in Database ---")
    groups = Group.objects.all()
    for g in groups:
        print(f"- {g.name}")
    
    print("\n--- Users and their Groups ---")
    users = User.objects.all()
    for u in users:
        user_groups = [g.name for g in u.groups.all()]
        print(f"User: {u.username}, Superuser: {u.is_superuser}, Groups: {user_groups}")

if __name__ == "__main__":
    check_perms()
