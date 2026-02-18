import datetime
from django.template.loader import render_to_string
from io import BytesIO
from xhtml2pdf import pisa
from finance.models import CompanyProfile

class MilestoneService:
    @staticmethod
    def generate_pdf(milestone):
        """
        Generates PDF using xhtml2pdf and the HTML template.
        """
        company = CompanyProfile.objects.first()
        
        context = {
            'milestone': milestone,
            'company': company,
            'now': datetime.date.today(),
            'currency_symbol': '₹' if milestone.sales_order.currency == 'INR' else '$'
        }
        
        html_string = render_to_string('milestones/milestone_pdf.html', context)
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)
        
        if pisa_status.err:
            raise Exception("Error creating PDF with xhtml2pdf")
            
        return pdf_file.getvalue()
