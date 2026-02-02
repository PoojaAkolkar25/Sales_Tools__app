import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
# django.setup() # Not needed for requests, but good if using models

# Mocking a request to create a deal without country
# Note: This requires a running server and valid token.
# Since I can't easily run a server and get a token in this environment, 
# I will check the serializer logic directly using Django shell if possible.

def verify_serializer():
    from deals.serializers import DealSerializer
    from deals.models import DealOwner, ClientType, DealStage, Currency, DealType
    
    # Get a deal owner
    owner = DealOwner.objects.first()
    if not owner:
        owner = DealOwner.objects.create(name="Test Owner", email="test@example.com")
        
    data = {
        "deal_name": "Test Deal Without Country",
        "stage": "PROSPECTING",
        "amount": "1000.00",
        "currency": "INR",
        "deal_owner": owner.id,
        "deal_type": "FIXED_BID",
        # country is omitted
    }
    
    serializer = DealSerializer(data=data)
    if serializer.is_valid():
        print("Success: Serializer is valid without country field.")
        # deal = serializer.save()
        # print(f"Deal created with ID: {deal.id}")
    else:
        print("Error: Serializer validation failed.")
        print(serializer.errors)

if __name__ == "__main__":
    import django
    django.setup()
    verify_serializer()
