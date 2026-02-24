from deals.models import Deal
from django.template.loader import render_to_string
from django.utils import timezone
import traceback

try:
    deals = Deal.objects.all()
    html = render_to_string("deals/report_pdf.html", {"deals": deals, "now": timezone.now()})
    print("Template rendered successfully. String length:", len(html))
    from xhtml2pdf import pisa
    import io
    result = io.BytesIO()
    pisa.pisaDocument(io.StringIO(html), result)
    with open("debug_deals.pdf", "wb") as f:
        f.write(result.getvalue())
    print("xhtml2pdf generated PDF successfully.")
except Exception as e:
    with open("debug_error.log", "w") as f:
        traceback.print_exc(file=f)
    print("ERROR CAUGHT, checking debug_error.log")
