import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.template.loader import get_template

templates = [
    'finance/report_pdf.html',
    'deals/report_pdf.html',
    'milestones/report_pdf.html'
]

for t in templates:
    try:
        print(f"Loading {t}...")
        template = get_template(t)
        print("Success.")
    except Exception as e:
        print(f"FAILED on {t}:")
        import traceback
        traceback.print_exc()
