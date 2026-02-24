from deals.models import Deal
from django.template.loader import render_to_string
from django.utils import timezone
import traceback

try:
    deals = Deal.objects.all()
    html = render_to_string("deals/report_pdf.html", {"deals": deals, "now": timezone.now()})
    print("Template rendered successfully. String length:", len(html))
    import weasyprint
    weasyprint.HTML(string=html).write_pdf("debug_deals.pdf")
    print("Weasyprint generated PDF successfully.")
except Exception as e:
    with open("debug_error.log", "w") as f:
        traceback.print_exc(file=f)
    print("ERROR CAUGHT, checking debug_error.log")
