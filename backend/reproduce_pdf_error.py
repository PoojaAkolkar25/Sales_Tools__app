import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.models import Invoice
from finance.services import InvoiceService
import traceback

def reproduce_error():
    try:
        # Get the first invoice or a specific one if known
        invoice = Invoice.objects.first()
        if not invoice:
            print("No invoices found to test.")
            return

        print(f"Testing PDF generation for Invoice: {invoice.invoice_no} (ID: {invoice.id})")
        
        # Call the service method directly
        pdf_file = InvoiceService.generate_pdf(invoice)
        
        if pdf_file:
            print("PDF generation successful!")
        else:
            print("PDF generation failed (returned None).")

    except Exception as e:
        with open('backend/traceback.txt', 'w') as f:
            f.write("!!! ERROR CAUGHT !!!\n")
            traceback.print_exc(file=f)
        print("Error logged to backend/traceback.txt")

if __name__ == '__main__':
    reproduce_error()
