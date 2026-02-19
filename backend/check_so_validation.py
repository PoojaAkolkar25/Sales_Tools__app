import os
import django
import sys

# Setup Django
sys.path.append(r'd:\Sales_tools_application\Sales_Tools__app\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sales_orders.models import SalesOrder
from sales_orders.serializers import SalesOrderSerializer
from rest_framework.exceptions import ValidationError

try:
    instance = SalesOrder.objects.get(id=22)
    data = {
        "po_number": "5100004349",
        "customer": 14
    }
    serializer = SalesOrderSerializer(instance, data=data, partial=True)
    if serializer.is_valid():
        print("Valid!")
    else:
        print(f"Invalid! Errors: {serializer.errors}")
except Exception as e:
    print(f"Error: {e}")
