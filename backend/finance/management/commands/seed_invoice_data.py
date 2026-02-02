from django.core.management.base import BaseCommand
from finance.models import StateMaster, CompanyProfile
from django.db import transaction

class Command(BaseCommand):
    help = 'Seed StateMaster and a default CompanyProfile'

    def handle(self, *args, **kwargs):
        states = [
            ("Jammu & Kashmir", "01"), ("Himachal Pradesh", "02"), ("Punjab", "03"),
            ("Chandigarh", "04"), ("Uttarakhand", "05"), ("Haryana", "06"),
            ("Delhi", "07"), ("Rajasthan", "08"), ("Uttar Pradesh", "09"),
            ("Bihar", "10"), ("Sikkim", "11"), ("Arunachal Pradesh", "12"),
            ("Nagaland", "13"), ("Manipur", "14"), ("Mizoram", "15"),
            ("Tripura", "16"), ("Meghalaya", "17"), ("Assam", "18"),
            ("West Bengal", "19"), ("Jharkhand", "20"), ("Odisha", "21"),
            ("Chhattisgarh", "22"), ("Madhya Pradesh", "23"), ("Gujarat", "24"),
            ("Daman & Diu", "25"), ("Dadra & Nagar Haveli", "26"), ("Maharashtra", "27"),
            ("Andhra Pradesh (Old)", "28"), ("Karnataka", "29"), ("Goa", "30"),
            ("Lakshadweep", "31"), ("Kerala", "32"), ("Tamil Nadu", "33"),
            ("Puducherry", "34"), ("Andaman & Nicobar Islands", "35"), ("Telangana", "36"),
            ("Andhra Pradesh (New)", "37"), ("Ladakh", "38")
        ]

        with transaction.atomic():
            for name, code in states:
                StateMaster.objects.get_or_create(name=name, code=code)
            
            self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(states)} states'))

            # Create default Company Profile
            maha = StateMaster.objects.filter(name="Maharashtra").first()
            CompanyProfile.objects.get_or_create(
                name="AutomationEdge Technologies",
                defaults={
                    'registered_address': "Office No. 101, 1st Floor, Pride Gateway, Baner Road, Pune - 411045",
                    'gstin': "27AAACA1234A1Z5",
                    'pan': "AAACA1234A",
                    'website_url': "https://automationedge.com",
                    'state': maha
                }
            )
            self.stdout.write(self.style.SUCCESS('Successfully seeded default CompanyProfile'))
