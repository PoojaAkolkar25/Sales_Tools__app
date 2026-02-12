import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from finance.models import CompanyProfile
from deals.models import Customer, CustomerType

def sync_existing():
    companies = CompanyProfile.objects.all()
    print(f"Found {companies.count()} company profiles. Syncing...")
    
    synced_count = 0
    created_count = 0
    
    for company in companies:
        customer, created = Customer.objects.get_or_create(
            name=company.name,
            defaults={
                'email': company.email or '',
                'phone': company.phone_number or '',
                'address': company.address_line_1 or '',
                'gstin': company.gstin or '',
                'pan': company.pan or '',
                'customer_type': CustomerType.CUSTOMER,
                'is_active': True
            }
        )
        if created:
            created_count += 1
        else:
            # Update existing
            customer.email = company.email or customer.email
            customer.phone = company.phone_number or customer.phone
            customer.address = company.address_line_1 or customer.address
            customer.gstin = company.gstin or customer.gstin
            customer.pan = company.pan or customer.pan
            customer.save()
            synced_count += 1
            
    print(f"Sync complete! Created: {created_count}, Updated: {synced_count}")

if __name__ == "__main__":
    sync_existing()
