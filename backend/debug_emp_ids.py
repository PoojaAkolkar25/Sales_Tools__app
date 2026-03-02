import os
import sys
import django

# Add the directory containing 'core' to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import UserProfile
from django.db.models import Max

profiles = UserProfile.objects.all().order_by('employee_id')
print(f"Total profiles: {profiles.count()}")
for p in profiles:
    try:
        print(f"User: {p.user.username:20} | Employee ID: '{p.employee_id}'")
    except Exception as e:
        print(f"Error printing profile for user ID {p.user_id}: {e}")

last = UserProfile.objects.all().order_by('employee_id').last()
if last:
    print(f"\nLAST (by string order): {last.employee_id}")
    
    # Check for max numeric EMP ID
    import re
    max_num = 0
    emp_profiles = UserProfile.objects.filter(employee_id__startswith='EMP')
    for p in emp_profiles:
        match = re.search(r'(\d+)$', p.employee_id)
        if match:
            max_num = max(max_num, int(match.group(1)))
    print(f"Max numeric EMP ID found: {max_num}")
    print(f"Proposed Next ID: EMP{max_num + 1:04d}")
else:
    print("\nNo profiles found.")
