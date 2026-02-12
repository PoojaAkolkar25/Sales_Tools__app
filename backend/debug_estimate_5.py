
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
    
    items = []
    for i in e.items.all():
        item_dict = {
            'sr_no': i.sr_no,
            'particulars': i.particulars,
            'description': i.description,
            'hsn_sac': i.hsn_sac,
            'qty': float(i.qty),
            'rate': float(i.rate),
            'amount': float(i.amount)
        }
        items.append(item_dict)
        print(f"Item {i.sr_no}: qty={i.qty}, rate={i.rate}, amount={i.amount}")
    
    print(f"\nTotal items: {len(items)}")
    
    data = {
        'items': items,
        'description_memo': 'Triggering validation from script'
    }
    
    s = EstimateSerializer(e, data=data, partial=True)
    is_valid = s.is_valid()
    
    # Let's see what the serializer thinks
    items_data = data.get('items')
    cost_sheet = e.cost_sheet
    total_estimate_price = sum((float(item.get('qty', 0)) * float(item.get('rate', 0))) for item in items_data)
    cost_sheet_price = float(cost_sheet.total_estimated_price)
    
    print(f"\nDEBUG: total_estimate_price = {total_estimate_price} (type: {type(total_estimate_price)})")
    print(f"DEBUG: cost_sheet_price = {cost_sheet_price} (type: {type(cost_sheet_price)})")
    print(f"DEBUG: total_estimate_price < cost_sheet_price = {total_estimate_price < cost_sheet_price}")
    
    print(f"Is Valid: {is_valid}")
    if not is_valid:
        print(f"Errors: {s.errors}")
    else:
        print("Serializer is valid with current items.")
        
except Exception as err:
    print(f"Error: {err}")
