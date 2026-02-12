import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from cost_sheets.models import CostSheet, CostSheetStatus
from estimates.models import Estimate
from deals.models import Deal

def verify_sync():
    print("Starting verification of Cost Sheet to Estimate sync...")
    
    # Get a deal
    deal = Deal.objects.first()
    if not deal:
        print("Error: No Deal found in database. Cannot proceed.")
        return

    # 1. Create Draft Cost Sheet
    cs_no = 'VERIFY-CS-001'
    # Cleanup previous if exists
    CostSheet.objects.filter(cost_sheet_no=cs_no).delete()
    
    print(f"Creating Draft Cost Sheet: {cs_no}")
    cs = CostSheet.objects.create(
        cost_sheet_no=cs_no,
        deal=deal,
        status=CostSheetStatus.PENDING,
        total_estimated_price=1000.00,
        total_estimated_cost=800.00,
        total_estimated_margin=200.00
    )
    
    # Check if Estimate created
    est = Estimate.objects.filter(cost_sheet=cs).first()
    if est:
        print(f"SUCCESS: Estimate created automatically. ID: {est.estimate_id}")
        print(f"Estimate Price: {est.total_price}")
        
        # 2. Update Cost Sheet
        print("Updating Cost Sheet price to 2000.00")
        cs.total_estimated_price = 2000.00
        cs.save()
        
        est.refresh_from_db()
        print(f"Updated Estimate Price: {est.total_price}")
        
        if est.total_price == 2000.00:
            print("SUCCESS: Estimate price synced correctly.")
        else:
            print("FAILURE: Estimate price not synced.")
    else:
        print("FAILURE: Estimate was not created.")

    # Cleanup
    cs.delete()
    print("Verification complete and cleaned up.")

if __name__ == "__main__":
    verify_sync()
