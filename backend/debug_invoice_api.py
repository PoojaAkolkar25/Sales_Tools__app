import traceback
from django.test import RequestFactory
from finance.views import InvoiceViewSet
from rest_framework.test import force_authenticate
from accounts.models import User
from finance.models import Invoice

try:
    factory = RequestFactory()
    invoice = Invoice.objects.first()
    
    view = InvoiceViewSet.as_view({'get': 'download_pdf'})
    
    from rest_framework.test import APIRequestFactory
    api_factory = APIRequestFactory()
    api_request = api_factory.get(f'/api/finance/invoices/{invoice.id}/download_pdf/')
    user = User.objects.first()
    force_authenticate(api_request, user=user)
    
    response = view(api_request, pk=invoice.id)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code != 200:
        print("Response data:", response.data)
except Exception as e:
    print("Error caught:")
    traceback.print_exc()
