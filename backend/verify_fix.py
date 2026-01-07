import os
import django
import sys
import json
from datetime import date

# Setup Django environment
sys.path.append(r'd:\Sales_tools_application\Sales_Tools__app\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.models import ReceiptVoucher, BankConnection

bank = BankConnection.objects.first()

# Mock a request to the viewset
from rest_framework.test import APIRequestFactory
from finance.views import ReceiptVoucherViewSet

factory = APIRequestFactory()
view = ReceiptVoucherViewSet.as_view({'post': 'create'})

data = {
    'customer_name': 'Global Corp',
    'payment_date': str(date.today()),
    'payment_method': 'Bank Transfer',
    'deposit_to': bank.id,
    'amount_received': '1000.00',
    'adjustments': '[]'
}

request = factory.post('/finance/receipt-vouchers/', data)

# Force authenticate (dummy user)
from django.contrib.auth.models import User
user, _ = User.objects.get_or_create(username='testuser')
from rest_framework.test import force_authenticate
force_authenticate(request, user=user)

response = view(request)

print(f"Response status: {response.status_code}")
if response.status_code == 201:
    v = ReceiptVoucher.objects.latest('id')
    print(f"Created Voucher ID: {v.id}")
    print(f"Customer Name: '{v.customer_name}'")
    print(f"Lead: {v.lead}")
    if v.lead:
        print(f"Lead Customer: '{v.lead.customer_name}'")
else:
    print(response.data)
