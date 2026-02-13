"""
Script to fix existing deals that have cost sheets but are still in DEAL_CREATED stage
Run with: python manage.py shell
Then paste this code
"""
from deals.models import Deal, DealStage

# Find all deals in DEAL_CREATED stage that have cost sheets
deals_to_update = []
for deal in Deal.objects.filter(stage=DealStage.DEAL_CREATED):
    if deal.cost_sheets.exists():
        deals_to_update.append(deal)

print(f"Found {len(deals_to_update)} deals to update:")
for deal in deals_to_update:
    print(f"  {deal.deal_id}: {deal.stage} -> COST_SHEET (has {deal.cost_sheets.count()} cost sheets)")
    deal.stage = DealStage.COST_SHEET
    deal.save(update_fields=['stage', 'updated_at'])

print(f"\n✓ Updated {len(deals_to_update)} deals to COST_SHEET stage")
