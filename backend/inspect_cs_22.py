
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from cost_sheets.models import CostSheet, CostSheetStatus
from estimates.models import Estimate, ApprovalStatus

try:
    cs = CostSheet.objects.get(id=22)
    print(f"CS Status: {cs.status}")
    print(f"CS Total Price: {cs.total_estimated_price}")
    
    related_estimates = cs.estimates.all()
    print(f"Related Estimates Count: {related_estimates.count()}")
    
    for estimate in related_estimates:
        print(f"--- Estimate {estimate.estimate_id} ---")
        print(f"  Approval Status: {estimate.approval_status}")
        
        # Check proposals
        proposals = estimate.proposals.all()
        print(f"  Proposals Count: {proposals.count()}")
        for p in proposals:
            print(f"    - Proposal: {p.filename}")
            
        # Check items for total
        items = estimate.items.all()
        estimate_total = sum(float(item.amount or 0) for item in items)
        cost_sheet_price = float(cs.total_estimated_price)
        
        print(f"  Estimate Total: {estimate_total}")
        print(f"  Cost Sheet Price: {cost_sheet_price}")
        
        if estimate.approval_status != ApprovalStatus.APPROVED:
            print("  FAIL: Estimate not approved")
        if not estimate.proposals.exists():
            print("  FAIL: No proposal attachment")
        if estimate_total < cost_sheet_price:
            print("  FAIL: Estimate total < CS price")
            
except CostSheet.DoesNotExist:
    print("Error: Cost Sheet 22 not found")
except Exception as e:
    print(f"Error: {e}")
