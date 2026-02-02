from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
from xhtml2pdf import pisa
from pypdf import PdfWriter, PdfReader
import logging

logger = logging.getLogger(__name__)

def generate_estimate_pdf(estimate):
    """
    Generates a PDF for the given estimate object using xhtml2pdf.
    Returns bytes content of the PDF.
    """
    try:
        # Prepare context for the template
        context = {
            'estimate': estimate,
            'items': estimate.items.all().order_by('sr_no'),
            'company_name': "Sales Tools App",
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
