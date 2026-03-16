import os
import sys

sys.path.append('d:\\Sales_tools_application\\Sales_Tools__app\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from finance.services import ExchangeRateService
from finance.models import ExchangeRate
from django.utils import timezone

def test():
    with open('diagnostic5.txt', 'w', encoding='utf-8') as f:
        f.write("--- Exchange Rate API Math ---\n")
        today = timezone.now().date()
        
        # Get raw USD to INR
        usd_inr = ExchangeRate.objects.get(currency_code='USD', date=today).rate_to_inr
        f.write(f"USD to INR Rate: {usd_inr}\n")
        
        # Get raw EUR (actually USD to EUR)
        try:
            usd_eur = ExchangeRate.objects.get(currency_code='EUR', date=today).rate_to_inr
            f.write(f"Wait, is EUR stored as USD->EUR or EUR->INR? Value stored for EUR today: {usd_eur}\n")
        except ExchangeRate.DoesNotExist:
            f.write("No EUR rate found for today\n")

if __name__ == '__main__':
    test()
