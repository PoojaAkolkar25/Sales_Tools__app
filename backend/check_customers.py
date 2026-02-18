import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from deals.models import Customer

print("=" * 60)
print("CUSTOMER DATABASE CHECK")
print("=" * 60)

customers = Customer.objects.all()
print(f"\nTotal customers in database: {customers.count()}\n")

if customers.exists():
    print("Customer Names:")
    for idx, customer in enumerate(customers, 1):
        print(f"  {idx}. '{customer.name}' (ID: {customer.id})")
else:
    print("No customers found in database!")

print("\n" + "=" * 60)
print("TESTING CUSTOMER MATCHING LOGIC")
print("=" * 60)

# Test cases
test_names = [
    "HDFC BANK",
    "HDFC Bank",
    "hdfc bank",
    "MIRAE ASSET CAPITAL MARKETS",
    "Mirae Asset Capital Markets (India) Private Limited"
]

for test_name in test_names:
    print(f"\nTesting: '{test_name}'")
    
    # Exact match
    exact = Customer.objects.filter(name__iexact=test_name).first()
    if exact:
        print(f"  ✓ Exact match: '{exact.name}'")
    else:
        print(f"  ✗ No exact match")
        
        # Word matching
        words = [w for w in test_name.split() if len(w) > 2]
        if words:
            first_word_match = Customer.objects.filter(name__icontains=words[0]).first()
            if first_word_match:
                print(f"  ✓ First word ('{words[0]}') match: '{first_word_match.name}'")
            else:
                print(f"  ✗ No match for first word: '{words[0]}'")
