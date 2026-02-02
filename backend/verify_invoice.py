import os
import django
import sys

# Setup Django
sys.path.append('d:/Sales_tools_application/Sales_Tools__app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.services import InvoiceService
from finance.models import StateMaster, CompanyProfile

def test_invoice_logic():
    print("Testing Invoice Service Logic...")
    
    # 1. Test Number Generation
    no1 = InvoiceService.generate_invoice_number()
    print(f"Generated Number 1: {no1}")
    
    # 2. Test Tax Calculation (Domestic - MH to MH)
    company = CompanyProfile.objects.first()
    mh = StateMaster.objects.get(name="Maharashtra")
    
    invoice_data = {
        'customer_state': mh.id,
        'currency': 'INR'
    }
    line_items = [
        {'description': 'Item 1', 'quantity': 2, 'rate': 1000, 'discount': 100, 'gst_rate': 18}
    ]
    
    results = InvoiceService.calculate_taxes(invoice_data, line_items, company)
    print("\nDomestic Calculation Results:")
    print(f"Subtotal: {results['subtotal']}")
    print(f"Taxable: {results['taxable_amount']}")
    print(f"Total Tax: {results['total_tax']}")
    print(f"Grand Total: {results['total_amount']}")
    print(f"Words: {results['grand_total_words']}")
    
    # 3. Test Inter-State (MH to Delhi)
    delhi = StateMaster.objects.get(name="Delhi")
    invoice_data['customer_state'] = delhi.id
    results_inter = InvoiceService.calculate_taxes(invoice_data, line_items, company)
    print("\nInter-State Calculation Results:")
    print(f"Type: {results_inter['invoice_type']}")
    print(f"Total Tax: {results_inter['total_tax']}")
    
    # 4. Test Export
    invoice_data['is_export'] = True
    results_export = InvoiceService.calculate_taxes(invoice_data, line_items, company)
    print("\nExport Calculation Results:")
    print(f"Type: {results_export['invoice_type']}")
    print(f"Total Tax: {results_export['total_tax']}")

if __name__ == "__main__":
    test_invoice_logic()
