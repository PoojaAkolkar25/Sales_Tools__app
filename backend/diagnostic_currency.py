import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append('d:\\Sales_tools_application\\Sales_Tools__app\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from deals.models import Deal
from estimates.models import Estimate
from finance.models import ExchangeRate
from finance.services import ExchangeRateService
from django.utils import timezone

def run_diagnostic():
    print("--- Diagnostic Report ---")
    print(f"Current Date: {timezone.now().date()}")
    
    # 1. Check Exchange Rates
    print("\n[Exchange Rates]")
    rates = ExchangeRate.objects.filter(date=timezone.now().date())
    if not rates:
        print("No exchange rates found for today. Fatching latest available...")
        rates = ExchangeRate.objects.order_by('-date')[:5]
    
    for r in rates:
        print(f"{r.currency_code}: {r.rate_to_inr} (Date: {r.date})")
    
    # 2. Check Deals
    print("\n[Deals (Last 5)]")
    deals = Deal.objects.order_by('-created_at')[:5]
    for d in deals:
        converted = ExchangeRateService.convert_to_inr(d.deal_amount, d.currency, d.deal_date)
        print(f"Deal {d.deal_id}: {d.deal_amount} {d.currency} -> {converted} INR (Date: {d.deal_date})")
        if d.currency not in ['INR', 'USD', 'EUR']:
            print(f"  WARNING: Unusual currency code: {d.currency}")

    # 3. Check Estimates
    print("\n[Estimates (Last 5)]")
    estimates = Estimate.objects.order_by('-created_at')[:5]
    for e in estimates:
        currency = e.deal.currency if e.deal else 'INR'
        converted = ExchangeRateService.convert_to_inr(e.total_price, currency, e.estimate_date)
        print(f"Estimate {e.estimate_id}: {e.total_price} {currency} -> {converted} INR (Date: {e.estimate_date})")

    # 4. Check for 'EURO' string
    print("\n[Search for 'EURO']")
    euro_deals = Deal.objects.filter(currency='EURO').count()
    print(f"Deals with 'EURO': {euro_deals}")
    
    if euro_deals > 0:
        print("Recommendation: Standardize 'EURO' to 'EUR'")

if __name__ == "__main__":
    run_diagnostic()
