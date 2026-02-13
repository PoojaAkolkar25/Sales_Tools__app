"""
Diagnostic script to check deal stage updates
Run with: python manage.py shell
Then paste this code
"""
from deals.models import Deal, DealStage
from cost_sheets.models import CostSheet

# Check the most recent cost sheet
recent_cs = CostSheet.objects.order_by('-created_at').first()
if recent_cs:
    print(f"Most recent cost sheet: {recent_cs.cost_sheet_no}")
    print(f"  Deal: {recent_cs.deal}")
    print(f"  Deal ID: {recent_cs.deal.deal_id if recent_cs.deal else 'None'}")
    print(f"  Deal Stage: {recent_cs.deal.stage if recent_cs.deal else 'None'}")
    
    if recent_cs.deal:
        print(f"\nManually updating deal stage to COST_SHEET...")
        recent_cs.deal.stage = DealStage.COST_SHEET
        recent_cs.deal.save()
        print(f"Deal stage updated to: {recent_cs.deal.stage}")
else:
    print("No cost sheets found")

# List all deals and their stages
print("\n=== All Deals ===")
for deal in Deal.objects.all()[:5]:
    print(f"{deal.deal_id}: {deal.stage}")
    # Count related cost sheets
    cs_count = deal.cost_sheets.count()
    print(f"  Cost Sheets: {cs_count}")
