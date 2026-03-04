from milestones.models import Milestone
from sales_orders.models import SalesOrder

sos = SalesOrder.objects.filter(customer_name__icontains='AplhaBiomet')
print(f"DEBUG: Found {sos.count()} SOs for AplhaBiomet")

for s in sos:
    print(f"SO ID: {s.id}")
    print(f"  SO Number: {s.so_number}")
    print(f"  Status: {s.status}")
    print(f"  Total Amount: {s.total_amount}")
    
    ms = Milestone.objects.filter(sales_order=s)
    print(f"  Found {ms.count()} milestones:")
    for m in ms:
        print(f"    MS ID: {m.id}")
        print(f"      No: {m.milestone_no}")
        print(f"      Status: {m.status}")
        print(f"      Amount: {m.amount}")
        print(f"      Invoice: {m.invoice_id}")
