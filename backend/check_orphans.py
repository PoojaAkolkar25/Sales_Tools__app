import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from cost_sheets.models import CostSheet
from leads.models import Lead

def check_orphans():
    print("Checking for orphaned CostSheet records...")
    cost_sheets = CostSheet.objects.all()
    orphans = []
    for cs in cost_sheets:
        try:
            _ = cs.lead
        except Lead.DoesNotExist:
            orphans.append(cs)
            print(f"Found orphaned CostSheet: ID={cs.id}, No={cs.cost_sheet_no}, Lead ID={cs.lead_id}")
    
    if not orphans:
        print("No orphaned CostSheet records found.")
    else:
        print(f"Total orphans found: {len(orphans)}")

if __name__ == "__main__":
    check_orphans()
