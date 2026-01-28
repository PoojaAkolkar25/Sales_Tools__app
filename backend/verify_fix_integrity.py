import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from deals.models import Deal

def verify_save():
    print("Attempting to create a test deal...")
    try:
        test_deal = Deal.objects.create(
            deal_name="Verification Test Deal",
            amount=1000,
            description="Testing fix for IntegrityError",
            project_name="Verification Project"
        )
        print(f"Successfully created deal: {test_deal.deal_id}")
        test_deal.delete()
        print("Test deal deleted successfully.")
        return True
    except Exception as e:
        print(f"Verification FAILED: {e}")
        return False

if __name__ == "__main__":
    verify_save()
