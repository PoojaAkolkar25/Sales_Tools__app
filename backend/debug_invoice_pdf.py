import traceback
from finance.models import Invoice
from finance.services import InvoiceService

try:
    invoice = Invoice.objects.first()
    if invoice:
        print(f"Testing PDF generation for invoice: {invoice.invoice_no}")
        pdf_content = InvoiceService.generate_pdf(invoice)
        print("PDF generated successfully, length:", len(pdf_content))
    else:
        print("No invoices found to test.")
except Exception as e:
    print("Error caught in debug_invoice_pdf.py:")
    traceback.print_exc()
