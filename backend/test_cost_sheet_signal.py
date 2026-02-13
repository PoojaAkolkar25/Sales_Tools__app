"""
Test script to verify cost sheet signal is working
Run this with: python manage.py shell < test_cost_sheet_signal.py
"""
from deals.models import Deal, DealStage
from cost_sheets.models import CostSheet

# Get the first deal
deal = Deal.objects.first()
if not deal:
    print("No deals found. Please create a deal first.")
else:
    print(f"Testing with Deal: {deal.deal_id}, Current Stage: {deal.stage}")
    
    # Create a new cost sheet for this deal
    cost_sheet = CostSheet.objects.create(
        deal=deal,
        customer_name="Test Customer",
        project_name="Test Project"
    )
    
    print(f"Created Cost Sheet: {cost_sheet.cost_sheet_no}")
    
    # Refresh the deal from database
    deal.refresh_from_db()
    print(f"Deal Stage after creating cost sheet: {deal.stage}")
    
    if deal.stage == DealStage.COST_SHEET:
        print("✓ SUCCESS: Deal stage updated to COST_SHEET")
    else:
        print(f"✗ FAILED: Deal stage is still {deal.stage}, expected COST_SHEET")
