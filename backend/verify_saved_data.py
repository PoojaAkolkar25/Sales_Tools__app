
import os
import django
import json

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sales_orders.models import SalesOrder, SalesOrderItem, SalesOrderStatus
from sales_orders.serializers import SalesOrderSerializer
from deals.models import Product

def verify_data_persistence():
    print("--- Verifying Sales Order Data Persistence ---")
    
    # 1. Setup Data
    product = Product.objects.first()
    if not product:
        product = Product.objects.create(name="Test Product", unit_price=100)
        
    so = SalesOrder.objects.create(
        po_number="TEST-PERSIST-001",
        status=SalesOrderStatus.DRAFT,
        customer_name="Test Customer Persist"
    )
    
    # Create an initial item
    item1 = SalesOrderItem.objects.create(sales_order=so, product=product, qty=1, rate=100, amount=100)
    print(f"Created SO: {so.id} with item ID: {item1.id}")
    
    # 2. Update Payload (Simulate Frontend)
    # Sending back the existing item with its ID, plus a new item (no ID)
    payload = {
        "po_number": "TEST-PERSIST-001",
        "order_date": "2026-02-04",
        "items": [
            {
                "id": item1.id,  # Existing ID
                "sales_order": so.id, 
                "product": product.id,
                "description": "Updated Item 1",
                "qty": 2,
                "rate": 100,
                "amount": 200,
                "tax": 0,
                "discount": 0
            },
            {
                # New item, no ID
                "sales_order": so.id,
                "product": product.id,
                "description": "New Item 2",
                "qty": 5,
                "rate": 10,
                "amount": 50,
                "tax": 0,
                "discount": 0
            }
        ]
    }
    
    print("Executing Serializer Update...")
    instance = SalesOrder.objects.get(pk=so.id)
    serializer = SalesOrderSerializer(instance, data=payload, partial=True)
    
    if serializer.is_valid():
        try:
            serializer.save()
            print("Save Successful.")
        except Exception as e:
            print(f"Save Failed: {e}")
            so.delete()
            return
    else:
        print(f"Validation Failed: {serializer.errors}")
        so.delete()
        return

    # 3. Verify Persistence
    print("Reading back from DB...")
    so.refresh_from_db()
    items = so.items.all()
    print(f"Total Items in DB: {items.count()}")
    
    for item in items:
        print(f" - Item ID: {item.id}, Desc: {item.description}, Amt: {item.amount}")
        
    if items.count() != 2:
        print("CRITICAL: Expected 2 items, found mismatch!")
    else:
        print("SUCCESS: Items count matches.")
        
    print(f"SO Total Amount: {so.total_amount}")
    if so.total_amount != 250.00: 
        print(f"CRITICAL: Expected total 250.00, got {so.total_amount}")
    
    # Cleanup
    so.delete()
    print("Cleanup complete.")

if __name__ == "__main__":
    verify_data_persistence()
