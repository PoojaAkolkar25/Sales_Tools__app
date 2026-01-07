import os
import django
import sys

# Setup Django environment
sys.path.append(r'd:\Sales_tools_application\Sales_Tools__app\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.models import ReceiptVoucher

vouchers = ReceiptVoucher.objects.all()
print(f"Total vouchers: {len(vouchers)}")
for v in vouchers:
    print(f"ID: {v.id}, No: {v.receipt_no}, Customer: '{v.customer_name}', Lead: {v.lead}")
    if v.lead:
        print(f"  Lead Customer: '{v.lead.customer_name}'")
