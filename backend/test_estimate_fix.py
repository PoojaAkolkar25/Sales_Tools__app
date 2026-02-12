
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from estimates.models import Estimate
from estimates.serializers import EstimateSerializer

try:
    e = Estimate.objects.get(id=5)
    print(f"Estimate ID: {e.estimate_id}")
    print(f"Cost Sheet Price: {e.cost_sheet.total_estimated_price}")
    print(f"Current items in DB: {e.items.count()}")
    
    # Simulate what the frontend sends - items with valid data
    items = [
        {
            'sr_no': 1,
            'particulars': 'License Cost',
            'description': 'Software licenses',
            'hsn_sac': '998314',
            'qty': 10,
            'rate': 500.00,
            'amount': 5000.00
        },
        {
            'sr_no': 2,
            'particulars': 'Implementation Services',
            'description': 'Setup and configuration',
            'hsn_sac': '998315',
            'qty': 20,
            'rate': 200.00,
            'amount': 4000.00
        }
    ]
    
    data = {
        'items': items,
        'description_memo': 'Testing with actual items'
    }
    
    print(f"\nSending {len(items)} items to serializer")
    print(f"Total from items: ${sum(item['amount'] for item in items)}")
    
    s = EstimateSerializer(e, data=data, partial=True)
    is_valid = s.is_valid()
    
    print(f"\nValidation Result: {is_valid}")
    if not is_valid:
        print(f"Errors: {s.errors}")
    else:
        print("✓ Serializer validation PASSED!")
        print("The fix is working correctly.")
        
except Exception as err:
    print(f"Error: {err}")
    import traceback
    traceback.print_exc()
