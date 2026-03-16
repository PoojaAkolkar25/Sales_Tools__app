import os
import django
import sys
from decimal import Decimal

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.services import ExchangeRateService
from finance.models import ExchangeRate
from django.utils import timezone

def verify():
    print("--- Currency Conversion Verification ---")
    
    # 1. Test fetch_rates logic (internal call)
    print("\n1. Testing ExchangeRateService.get_rate...")
    try:
        # Ensure we have at least one rate
        ExchangeRate.objects.update_or_create(
            currency_code="USD",
            date=timezone.now().date(),
            defaults={"rate_to_inr": Decimal("83.25")}
        )
        
        rate = ExchangeRateService.get_rate("USD")
        print(f"Rate for USD: {rate}")
    except Exception as e:
        print(f"get_rate failed: {e}")
        return

    # 2. Test convert_to_inr (The one that failed with NameError)
    print("\n2. Testing ExchangeRateService.convert_to_inr...")
    try:
        amount = Decimal("100.00")
        converted = ExchangeRateService.convert_to_inr(amount, "USD")
        print(f"Converted {amount} USD to INR: {converted}")
    except Exception as e:
        print(f"convert_to_inr failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # 3. Test with None amount (Another branch in convert_to_inr)
    print("\n3. Testing convert_to_inr with None amount...")
    try:
        converted = ExchangeRateService.convert_to_inr(None, "USD")
        print(f"Converted None to INR: {converted}")
    except Exception as e:
        print(f"convert_to_inr with None failed: {e}")
        return

    print("\n--- Verification Successful ---")

if __name__ == "__main__":
    verify()
