import os
import django
import sys

# Setup django
sys.path.append(r'd:\Sales_tools_application\Sales_Tools__app\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from finance.services import InvoiceService
try:
    InvoiceService.generate_invoice_pdf(5)
    print("PDF Generated successfully")
except Exception as e:
    import traceback
    traceback.print_exc()
