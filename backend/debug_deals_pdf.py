import traceback
from deals.models import Deal
from django.template.loader import render_to_string
from django.utils import timezone
from xhtml2pdf import pisa
import io

try:
    deals = Deal.objects.all()
    html_string = render_to_string('deals/report_pdf.html', {'deals': deals, 'now': timezone.now()})
    result = io.BytesIO()
    pdf = pisa.pisaDocument(io.StringIO(html_string), result)
    print("pisaDocument worked.", not pdf.err)
except Exception as e:
    print("Error caught with pisaDocument:")
    traceback.print_exc()

try:
    result2 = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_string, dest=result2)
    print("CreatePDF worked.", not pisa_status.err)
except Exception as e:
    print("Error caught with CreatePDF:")
    traceback.print_exc()
