import os
import django
import sys

# Setup Django environment
sys.path.append('d:\\SalesEdge\\Sales_Tools__app\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.template.loader import render_to_string
from estimates.models import Estimate
from finance.models import CompanyProfile, BankConnection
from datetime import date

def test_template_render():
    print("Testing estimate_pdf.html template rendering...")
    
    # Try to find an estimate
    estimate = Estimate.objects.first()
    if not estimate:
        print("No estimate found for testing.")
        return

    company = CompanyProfile.objects.first()
    items = estimate.items.all().order_by('sr_no')
    has_discount = any(float(item.discount or 0) > 0 for item in items)
    
    context = {
        'estimate': estimate,
        'items': items,
        'company': company,
        'bank': BankConnection.objects.first(),
        'po_number': "PO123",
        'po_date': date.today(),
        'has_discount': has_discount,
        'currency_symbol': "Rs.",
        'grand_total_words': "One Thousand Rupees",
        'now': date.today()
    }
    
    try:
        html_string = render_to_string('estimates/estimate_pdf.html', context)
        print("SUCCESS: Template rendered successfully.")
    except Exception as e:
        print(f"FAILURE: Template rendering failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_template_render()
