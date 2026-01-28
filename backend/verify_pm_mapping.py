import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from leads.models import Lead
from deals.models import Deal
from cost_sheets.models import CostSheet

def verify_mapping():
    print("1. Creating a Lead...")
    lead = Lead.objects.create(
        lead_no="L-TEST",
        customer_name="Test Customer",
        project_name="Test Project",
        project_manager="PM Alpha",
        sales_person="SP Beta"
    )
    
    print("2. Creating a Deal from Lead...")
    deal = Deal.objects.create(
        deal_name="Deal for L-TEST",
        lead=lead,
        amount=5000,
        project_manager=lead.project_manager, # Simulation of frontend auto-fill
        salesperson_name=lead.sales_person
    )
    print(f"Deal PM: {deal.project_manager}")
    
    print("3. Checking auto-generated Cost Sheet...")
    cs = CostSheet.objects.get(deal=deal)
    print(f"Cost Sheet PM: {cs.project_manager}")
    
    if cs.project_manager == "PM Alpha":
        print("✅ PM passed from Deal to Cost Sheet successfully.")
    else:
        print("❌ PM mismatch in Cost Sheet.")

    print("4. Updating Cost Sheet PM (simulating serializer update)...")
    cs.project_manager = "PM Gamma"
    cs.save()
    
    # Normally the serializer handles sync, but since we are in ORM, 
    # we simulate the serializer logic or just call the logic manually.
    # In our case, the ORM save doesn't trigger the serializer logic.
    # We should test via the serializer if possible.
    
    from cost_sheets.serializers import CostSheetSerializer
    from rest_framework.request import Request
    from rest_framework.test import APIRequestFactory

    factory = APIRequestFactory()
    request = factory.put(f'/api/cost-sheets/{cs.id}/', {'project_manager': 'PM Delta'})
    
    serializer = CostSheetSerializer(instance=cs, data={'project_manager': 'PM Delta'}, partial=True)
    if serializer.is_valid():
        serializer.save()
        print("Serializer save called.")
    
    # Re-fetch objects
    lead.refresh_from_db()
    deal.refresh_from_db()
    
    print(f"Updated Lead PM: {lead.project_manager}")
    print(f"Updated Deal PM: {deal.project_manager}")
    
    if lead.project_manager == "PM Delta" and deal.project_manager == "PM Delta":
        print("✅ Cost Sheet update synced back to Lead and Deal successfully.")
    else:
        print("❌ Sync back failed.")

    # Cleanup
    cs.delete()
    deal.delete()
    lead.delete()
    print("\nCleanup completed.")

if __name__ == "__main__":
    verify_mapping()
