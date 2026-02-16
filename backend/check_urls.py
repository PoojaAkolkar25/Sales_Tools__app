import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from cost_sheets.models import CostSheetAttachment
from deals.models import DealAttachment

print("--- Cost Sheet Attachments ---")
for att in CostSheetAttachment.objects.all():
    print(f"ID: {att.id}, File: {att.file.url}, Filename: {att.filename}")

print("\n--- Deal Attachments ---")
for att in DealAttachment.objects.all():
    print(f"ID: {att.id}, File: {att.file.url}, Filename: {att.filename}")
