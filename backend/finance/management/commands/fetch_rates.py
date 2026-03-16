from django.core.management.base import BaseCommand
from finance.services import ExchangeRateService

class Command(BaseCommand):
    help = 'Fetches daily exchange rates for INR conversion'

    def handle(self, *args, **options):
        self.stdout.write('Fetching exchange rates...')
        success = ExchangeRateService.fetch_latest_rates()
        if success:
            from finance.models import ExchangeRate
            from django.utils import timezone
            today = timezone.now().date()
            
            usd_rate = ExchangeRate.objects.filter(currency_code='USD', date=today).first()
            eur_rate = ExchangeRate.objects.filter(currency_code='EUR', date=today).first()
            
            self.stdout.write(self.style.SUCCESS('Successfully fetched exchange rates'))
            if usd_rate:
                self.stdout.write(f"USD to INR: {usd_rate.rate_to_inr}")
            if eur_rate:
                self.stdout.write(f"EUR to INR: {eur_rate.rate_to_inr}")
        else:
            self.stdout.write(self.style.ERROR('Failed to fetch exchange rates'))
