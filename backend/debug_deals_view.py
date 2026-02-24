import traceback
from django.test import RequestFactory
from deals.views import DealViewSet
from rest_framework.test import force_authenticate
from accounts.models import User

try:
    factory = RequestFactory()
    request = factory.get('/api/deals/export_pdf/?stage=DEAL_CREATED')
    user = User.objects.first()
    
    view = DealViewSet.as_view({'get': 'export_pdf'})
    
    # We need APIRequestFactory for DRF force_authenticate
    from rest_framework.test import APIRequestFactory
    api_factory = APIRequestFactory()
    api_request = api_factory.get('/api/deals/export_pdf/?stage=DEAL_CREATED')
    force_authenticate(api_request, user=user)
    
    response = view(api_request)
    
    if response.status_code == 200:
        print("Success! PDF generated. Length:", len(response.rendered_content))
    else:
        print(f"Failed with status: {response.status_code}")
        print("Response data:", response.data)
except Exception as e:
    print("Error caught in debug_deals_view.py:")
    traceback.print_exc()
