import os
import sys

sys.path.append('d:\\Sales_tools_application\\Sales_Tools__app\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from finance.services import ExchangeRateService
from deals.models import Deal
from estimates.models import Estimate
from django.utils import timezone

def test():
    print("--- Currency Diagnostic ---")
    today = timezone.now().date()
    print("Today's Rates:")
    print("USD:", ExchangeRateService.get_rate('USD', today))
    print("EUR:", ExchangeRateService.get_rate('EUR', today))

    print("\nDeals:")
    for d in Deal.objects.filter(currency__in=['USD', 'EUR', 'EURO']).order_by('-id')[:3]:
        hist_rate = ExchangeRateService.get_rate(d.currency, d.deal_date)
        curr_rate = ExchangeRateService.get_rate(d.currency, today)
        print(f"Deal {d.deal_id} ({d.deal_date}): Amount {d.deal_amount} {d.currency}. "
              f"Hist Rate {hist_rate} -> {d.deal_amount * hist_rate} INR. "
              f"Curr Rate {curr_rate} -> {d.deal_amount * curr_rate} INR.")

    print("\nEstimates:")
    for e in Estimate.objects.all().order_by('-id')[:3]:
        c = e.deal.currency if e.deal else 'INR'
        if c in ['USD', 'EUR', 'EURO']:
            hist_rate = ExchangeRateService.get_rate(c, e.estimate_date)
            curr_rate = ExchangeRateService.get_rate(c, today)
            print(f"Est {e.estimate_id} ({e.estimate_date}): Total {e.total_price} {c}. "
                  f"Hist Rate {hist_rate} -> {e.total_price * hist_rate} INR. "
                  f"Curr Rate {curr_rate} -> {e.total_price * curr_rate} INR.")

if __name__ == '__main__':
    test()
