import traceback
from finance.models import Invoice
from finance.services import InvoiceService

invoices = Invoice.objects.all()
errors = 0
for invoice in invoices:
    try:
        pdf_content = InvoiceService.generate_pdf(invoice)
        print(f"Success for {invoice.invoice_no}, length: {len(pdf_content)}")
    except Exception as e:
        print(f"Failed for {invoice.invoice_no}!")
        traceback.print_exc()
        errors += 1

print(f"Total tested: {invoices.count()}, Errors: {errors}")
