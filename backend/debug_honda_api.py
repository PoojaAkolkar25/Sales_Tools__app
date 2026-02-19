import requests
import json

# Since we don't have an easy way to get the token here, 
# let's use the Django test client or just check the database again 
# to see if there's any hidden status filtering in common logic.

from sales_orders.models import SalesOrder
from deals.models import Customer
from django.db.models import Q

honda = Customer.objects.filter(name__icontains='honda').first()
if honda:
    print(f"Honda ID: {honda.id}")
    # Basic filter
    sos = SalesOrder.objects.filter(customer=honda)
    print(f"Direct filter count: {sos.count()}")
    
    # Check if there are SOs with Honda name but different ID or null ID
    sos_name = SalesOrder.objects.filter(customer_name__icontains='honda')
    print(f"Name filter count: {sos_name.count()}")
else:
    print("Honda not found")
