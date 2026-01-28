import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from cost_sheets.models import CostSheet
from leads.models import Lead

def cleanup_orphans():
    print("Starting cleanup of orphaned CostSheet records...")
    cost_sheets = CostSheet.objects.all()
    orphans_count = 0
    
    for cs in cost_sheets:
        try:
            # Check if lead exists by accessing the lead attribute
            _ = cs.lead
        except Lead.DoesNotExist:
            print(f"Deleting orphaned CostSheet: ID={cs.id}, No={cs.cost_sheet_no}")
            cs.delete()
            orphans_count += 1
            
    print(f"Cleanup complete. Total orphaned records deleted: {orphans_count}")

if __name__ == "__main__":
    cleanup_orphans()
