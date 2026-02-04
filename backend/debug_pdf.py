import os
import django
import sys

# Add the project root to sys.path
sys.path.append('d:\\Sales_tools_application\\Sales_Tools__app\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from estimates.models import Estimate
from estimates.utils import generate_estimate_pdf

def test_pdf():
    try:
        est = Estimate.objects.all().first()
        if not est:
            print("No estimates found")
            return
        print(f"Testing PDF for {est.estimate_id}")
        pdf_bytes = generate_estimate_pdf(est)
        print(f"Success! PDF size: {len(pdf_bytes)} bytes")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf()
