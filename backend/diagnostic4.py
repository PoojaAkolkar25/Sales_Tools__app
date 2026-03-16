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
    with open('diagnostic4.txt', 'w', encoding='utf-8') as f:
        f.write("--- Find Deals with USD and EUR ---\n")
        
        # Look for USD deals
        usd_deals = Deal.objects.filter(currency='USD').order_by('-id')[:3]
        for d in usd_deals:
            f.write(f"Deal {d.deal_id} (USD): Amount {d.deal_amount}. amount_inr calculated by serializer: ")
            c = ExchangeRateService.convert_to_inr(d.deal_amount, d.currency, d.deal_date)
            f.write(f"{c}\n")

        # Look for EUR deals
        eur_deals = Deal.objects.filter(currency__in=['EUR', 'EURO']).order_by('-id')[:3]
        for d in eur_deals:
            f.write(f"Deal {d.deal_id} (EUR): Amount {d.deal_amount}. amount_inr calculated by serializer: ")
            c = ExchangeRateService.convert_to_inr(d.deal_amount, d.currency, d.deal_date)
            f.write(f"{c}\n")

if __name__ == '__main__':
    test()
