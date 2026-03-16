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
    with open('diagnostic3.txt', 'w', encoding='utf-8') as f:
        f.write("--- Currency Diagnostic ---\n")
        today = timezone.now().date()
        f.write(f"Today's Rates:\n")
        f.write(f"USD: {ExchangeRateService.get_rate('USD', today)}\n")
        f.write(f"EUR: {ExchangeRateService.get_rate('EUR', today)}\n")

        f.write("\nDeals:\n")
        for d in Deal.objects.filter(currency__in=['USD', 'EUR', 'EURO']).order_by('-id')[:3]:
            hist_rate = ExchangeRateService.get_rate(d.currency, d.deal_date)
            curr_rate = ExchangeRateService.get_rate(d.currency, today)
            f.write(f"Deal {d.deal_id} ({d.deal_date}): Amount {d.deal_amount} {d.currency}. "
                  f"Hist Rate {hist_rate} -> {float(d.deal_amount) * float(hist_rate)} INR. "
                  f"Curr Rate {curr_rate} -> {float(d.deal_amount) * float(curr_rate)} INR.\n")

        f.write("\nEstimates:\n")
        for e in Estimate.objects.all().order_by('-id')[:3]:
            c = e.deal.currency if e.deal else 'INR'
            if c in ['USD', 'EUR', 'EURO']:
                hist_rate = ExchangeRateService.get_rate(c, e.estimate_date)
                curr_rate = ExchangeRateService.get_rate(c, today)
                f.write(f"Est {e.estimate_id} ({e.estimate_date}): Total {e.total_price} {c}. "
                      f"Hist Rate {hist_rate} -> {float(e.total_price) * float(hist_rate)} INR. "
                      f"Curr Rate {curr_rate} -> {float(e.total_price) * float(curr_rate)} INR.\n")

if __name__ == '__main__':
    test()
