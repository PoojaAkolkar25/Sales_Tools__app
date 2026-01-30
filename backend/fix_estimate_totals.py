import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from estimates.models import Estimate

def fix_totals():
    print("--- Fixing Estimate Totals ---")
    estimates = Estimate.objects.all()
    count = 0
    for est in estimates:
        items_total = sum(float(item.amount or 0) for item in est.items.all())
        
        # Update if different (or if 0 and items exist)
        if float(est.total_price) != items_total:
            print(f"Updating Est {est.estimate_id}: Old {est.total_price} -> New {items_total}")
            est.total_price = items_total
            est.save()
            count += 1
            
    print(f"--- Updated {count} estimates ---")

if __name__ == '__main__':
    fix_totals()
