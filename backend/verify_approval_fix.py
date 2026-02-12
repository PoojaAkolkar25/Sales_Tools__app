import os
import django
import sys

# Setup Django environment
sys.path.append('d:\\Sales_tools_application\\Sales_Tools__app\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from estimates.models import Estimate, ApprovalStatus, EstimateStatus
from cost_sheets.models import CostSheet, CostSheetStatus
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from estimates.views import EstimateViewSet

def verify_fix():
    print("Starting verification of Cost Sheet approval dependency...")
    
    # Get or create a user for authentication
    user, _ = User.objects.get_or_create(username='admin', is_staff=True, is_superuser=True)
    
    # Get an existing estimate or create one for testing
    estimate = Estimate.objects.all().first()
    if not estimate:
        print("No estimate found for testing.")
        return

    # Case 1: Cost Sheet is NOT approved
    cs = estimate.cost_sheet
    original_cs_status = cs.status
    cs.status = CostSheetStatus.PENDING
    cs.save()
    
    original_est_approval = estimate.approval_status
    estimate.approval_status = ApprovalStatus.PENDING
    estimate.save()
    
    factory = APIRequestFactory()
    view = EstimateViewSet.as_view({'post': 'approve'})
    
    request = factory.post(f'/api/estimates/{estimate.id}/approve/', {'notes': 'Test approval'})
    force_authenticate(request, user=user)
    
    response = view(request, pk=estimate.id)
    
    print(f"Test 1 (CS Pending): Status Code = {response.status_code}")
    print(f"Response Data: {response.data}")
    
    if response.status_code == 400 and "Estimate cannot be approved until the associated Cost Sheet is approved" in str(response.data.get('error')):
        print("SUCCESS: Fix is working as expected (blocked approval).")
    else:
        print("FAILURE: Fix is NOT working as expected.")

    # Case 2: Cost Sheet IS approved
    cs.status = CostSheetStatus.APPROVED
    cs.save()
    
    request = factory.post(f'/api/estimates/{estimate.id}/approve/', {'notes': 'Test approval'})
    force_authenticate(request, user=user)
    
    response = view(request, pk=estimate.id)
    print(f"Test 2 (CS Approved): Status Code = {response.status_code}")
    
    if response.status_code == 200:
        print("SUCCESS: Approved cost sheet allows estimate approval.")
    else:
        print(f"FAILURE: Unexpected error with approved cost sheet: {response.data}")

    # Cleanup
    cs.status = original_cs_status
    cs.save()
    estimate.approval_status = original_est_approval
    estimate.save()

if __name__ == "__main__":
    verify_fix()
