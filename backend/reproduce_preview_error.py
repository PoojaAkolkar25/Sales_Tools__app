import os
import django
import json
from datetime import date

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.services import InvoiceService

def test_preview_error():
    # Mock data that might cause error (e.g. empty strings instead of numbers/dates)
    invoice_data = {
        'invoice_no': 'TEST-001',
        'invoice_date': '2026-03-11',
        'due_date': '2026-04-10',
        'customer': '1',
        'customer_state': '', # Empty state
        'currency': 'INR',
        'is_gst_applicable': True,
        'gst_customer_type': 'CGST_SGST_9',
        'po_date': '', # Potential date error
    }
    
    line_items = [
        {
            'description': 'Test Item',
            'quantity': '1', 
            'rate': '100',
            'discount': '0',
            'gst_rate': '18'
        }
    ]
    
    print("Testing generate_preview_pdf with empty quantity...")
    try:
        pdf = InvoiceService.generate_preview_pdf(invoice_data, line_items)
        print("Success!")
    except Exception as e:
        print(f"Caught expected error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_preview_error()
