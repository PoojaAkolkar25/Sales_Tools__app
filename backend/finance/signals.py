from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CompanyProfile
from deals.models import Customer, CustomerType

@receiver(post_save, sender=CompanyProfile)
def sync_company_profile_to_customer(sender, instance, created, **kwargs):
    """
    Automatically create or update a Customer record whenever a CompanyProfile is saved.
    """
    # Find existing customer by name (unique constraint in Customer)
    customer, created_customer = Customer.objects.get_or_create(
        name=instance.name,
        defaults={
            'email': instance.email or '',
            'phone': instance.phone_number or '',
            'address': instance.address_line_1 or '',
            'gstin': instance.gstin or '',
            'pan': instance.pan or '',
            'customer_type': CustomerType.CUSTOMER,
            'is_active': True
        }
    )
    
    if not created_customer:
        # Update existing customer fields if they have changed and were empty or if we want to force sync
        # Here we force sync basic details to keep them consistent
        customer.email = instance.email or customer.email
        customer.phone = instance.phone_number or customer.phone
        customer.address = instance.address_line_1 or customer.address
        customer.gstin = instance.gstin or customer.gstin
        customer.pan = instance.pan or customer.pan
        customer.save()
