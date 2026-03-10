import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.models import Invoice
from finance.services import InvoiceService
import traceback

print("Test PDF Generation script starting...")
try:
    inv = Invoice.objects.last()
    if inv:
        print(f"Generating PDF for {inv.invoice_no}")
        pdf_data = InvoiceService.generate_pdf(inv)
        print("Success! PDF generated.")
    else:
        print("No invoices found")
except Exception as e:
    print(f"Error occurred: {e}")
    traceback.print_exc()
