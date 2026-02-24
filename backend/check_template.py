import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.template.loader import get_template

try:
    print("Trying to load 'finance/invoice_pdf.html'...")
    template = get_template('finance/invoice_pdf.html')
    print("Loaded successfully without syntax errors!")
except Exception as e:
    import traceback
    traceback.print_exc()
