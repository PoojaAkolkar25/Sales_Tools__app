import re

# Simulate the HDFC PO text structure
hdfc_text = """Purchase Order

TO,
HDFC BANK

PO No: /IT/AUTOMATI/00229676/2025-26
Date: 07-11-2025

BILLING ADDRESS AS PER
GSTIN: 27AAACH6188F1ZW
HDFC BANK LTD.MUMBAI
ZENITH HOUSE, 2ND FLOOR, KESHAVRAO
KHADYE MARG, OPP. RACE COURSE,
MAHALAXMI, MUMBAI - 400 034

BILL TO/SHIP TO ADDRESS FOR
PAYMENT:
HDFC BANK LTD.
ZENITH HOUSE, 2ND FLOOR, KESHAVRAO
KHADYE MARG, OPP. RACE COURSE,
MAHALAXMI, MUMBAI - 400 034
"""

print("=" * 60)
print("TESTING CUSTOMER NAME EXTRACTION")
print("=" * 60)

# Pattern 1: TO, or TO: followed by company name (FIXED)
pattern1 = r'\\bTO[,:]\\s*\\n\\s*([A-Z][A-Z\\s&]+(?:BANK|LIMITED|LTD|PVT|PRIVATE|LLC|INC|CORP)?)\\b'
match1 = re.search(pattern1, hdfc_text, re.M)
if match1:
    print(f"✓ Pattern 1 matched: '{match1.group(1).strip()}'")
else:
    print("✗ Pattern 1 failed")

# Pattern 2: Bill To / Sold To
pattern2 = r'(?:Bill|Ship|Sold)\\s+(?:To|As Per)[:\\s]*\\n?([^\\n,]+)'
match2 = re.search(pattern2, hdfc_text, re.I)
if match2:
    print(f"✓ Pattern 2 matched: '{match2.group(1).strip()}'")
else:
    print("✗ Pattern 2 failed")

print("\\n" + "=" * 60)
print("TESTING BILLING ADDRESS EXTRACTION")
print("=" * 60)

# Billing address patterns (FIXED)
bill_patterns = [
    r'(?:BILLING\\s+ADDRESS|BILL\\s+TO)[:\\s]*(?:AS\\s+PER)?\\s*\\n(?:GSTIN[^\\n]*\\n)?([^\\n]+(?:\\n[^\\n]+){1,5}?)(?=\\n\\s*\\n|BILL\\s+TO|SHIP)',
    r'\\bTO[,:]\\s*\\n([A-Z][^\\n]+(?:\\n[^\\n]+){0,6}?)(?=\\n\\s*\\n|PO\\s+No|Date)',
    r'(?:Bill|Sold)\\s+(?:To|As Per)[:\\s]*\\n([^\\n]+(?:\\n[^\\n]+){1,5}?)(?=\\n\\s*\\n|Ship|GSTIN|PAN)'
]

for idx, pattern in enumerate(bill_patterns, 1):
    match = re.search(pattern, hdfc_text, re.I | re.M)
    if match:
        addr = match.group(1).strip()
        print(f"✓ Pattern {idx} matched:")
        print(f"  {addr[:150]}...")
        break
    else:
        print(f"✗ Pattern {idx} failed")
