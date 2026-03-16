from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
from xhtml2pdf import pisa
from pypdf import PdfWriter, PdfReader
import logging
from datetime import date
from finance.models import CompanyProfile, BankConnection

logger = logging.getLogger(__name__)

def generate_estimate_pdf(estimate):
    """
    Generates a PDF for the given estimate object using xhtml2pdf.
    Returns bytes content of the PDF.
    """
    try:
        # Prepare context for the template
        # Dynamic Issuer Selection Logic (Mirroring Invoice logic without Estimate field)
        from finance.models import CustomerPartner, CompanyProfile
        
        customer_name = estimate.deal.customer.name if estimate.deal and estimate.deal.customer else None
        company = None
        
        if customer_name:
            # Match customer name to a CompanyProfile to find the linked internal partner
            cp = CompanyProfile.objects.filter(name__iexact=customer_name).first()
            if cp and cp.linked_company_profile:
                company = cp.linked_company_profile
        
        if not company:
            # Fallback to the first AE India profile or the first CustomerPartner
            company = CustomerPartner.objects.filter(name__icontains='AutomationEdge').first() or \
                      CustomerPartner.objects.filter(name__icontains='PVT').first() or \
                      CustomerPartner.objects.first() or \
                      CompanyProfile.objects.first()
        
        items = estimate.items.all().order_by('sr_no')
        has_discount = any(float(item.discount or 0) > 0 for item in items)
        
        from finance.services import InvoiceService
        
        # Map currency codes to PDF-safe display symbols
        currency_symbols = {
            'INR': 'Rs.',
            'USD': '$',
            'EUR': 'EUR',
            'GBP': 'GBP',
            'AED': 'AED',
            'SGD': 'S$',
        }
        currency_code = getattr(estimate.deal, 'currency', 'INR')
        currency_symbol = currency_symbols.get(currency_code, currency_code)
        
        # Calculate grand total words (strip commas for clean display)
        grand_total_words = InvoiceService.number_to_words(estimate.total_price, currency_code).replace(',', '')

        bank = BankConnection.objects.filter(is_primary_for_invoices=True).first()
        if not bank:
            bank = BankConnection.objects.filter(is_active=True).first()
        
        # Determine PO Number and Date
        po_number = getattr(estimate, 'po_number', None)
        po_date = getattr(estimate, 'po_date', None)
        
        # If not on estimate, try to pull from deal/SO if exists (mirroring invoice logic)
        if not po_number and estimate.deal:
            from sales_orders.models import SalesOrder
            so = SalesOrder.objects.filter(customer=estimate.deal.customer).order_by('-created_at').first()
            if so:
                po_number = so.po_number
                po_date = so.po_date

        context = {
            'estimate': estimate,
            'items': items,
            'company': company,
            'bank': bank,
            'po_number': po_number,
            'po_date': po_date,
            'has_discount': has_discount,
            'currency_symbol': currency_symbol,
            'grand_total_words': grand_total_words,
            'now': date.today()
        }
        
        # Render HTML
        html_string = render_to_string('estimates/estimate_pdf.html', context)
        
        # HTML to PDF
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)
        
        if pisa_status.err:
            raise Exception("Error creating PDF with xhtml2pdf")
            
        return pdf_file.getvalue()
    except Exception as e:
        logger.error(f"Error generating estimate PDF: {e}")
        raise e

def merge_pdfs(estimate_pdf_bytes, proposal_file_path):
    """
    Merges the generated estimate PDF with the existing proposal PDF.
    estimate_pdf_bytes: bytes object of the estimate PDF
    proposal_file_path: local filesystem path to the proposal PDF
    
    Returns bytes content of the merged PDF.
    """
    try:
        writer = PdfWriter()
        
        # Add Estimate PDF pages
        estimate_pdf = PdfReader(BytesIO(estimate_pdf_bytes))
        for page in estimate_pdf.pages:
            writer.add_page(page)
            
        # Add Proposal PDF pages
        # proposal_file_path should be opened in rb mode
        with open(proposal_file_path, 'rb') as f:
            proposal_pdf = PdfReader(f)
            for page in proposal_pdf.pages:
                writer.add_page(page)
        
        output_pdf = BytesIO()
        writer.write(output_pdf)
        return output_pdf.getvalue()
        
    except Exception as e:
        logger.error(f"Error merging PDFs: {e}")
        raise e
