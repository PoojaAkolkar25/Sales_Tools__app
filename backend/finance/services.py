import re
from datetime import date
from django.db import transaction
from django.db.models import Max
from .models import Invoice, InvoiceType, CompanyProfile, StateMaster, BankConnection

class InvoiceService:
    @staticmethod
    def generate_invoice_number():
        """
        Generates sequential invoice number: INV/2024-25/001
        """
        today = date.today()
        year = today.year
        if today.month < 4:
            fy = f"{year-1}-{str(year)[2:]}"
        else:
            fy = f"{year}-{str(year+1)[2:]}"
        
        prefix = f"INV/{fy}/"
        
        last_invoice = Invoice.objects.filter(invoice_no__startswith=prefix).order_by('id').last()
        
        if not last_invoice:
            new_no = "001"
        else:
            try:
                last_no_str = last_invoice.invoice_no.split('/')[-1]
                new_no = f"{int(last_no_str) + 1:03d}"
            except (ValueError, IndexError):
                new_no = "001"
        
        return f"{prefix}{new_no}"

    @staticmethod
    def calculate_taxes(invoice_data, line_items, company_profile=None):
        """
        Logic to determine invoice type and calculate tax amounts.
        """
        if not company_profile:
            company_profile = CompanyProfile.objects.first()
        
        # Auto-selection logic
        customer_state_id = invoice_data.get('customer_state')
        deal_id = invoice_data.get('deal')
        is_gst_applicable = invoice_data.get('is_gst_applicable', True)
        
        invoice_type = InvoiceType.DOMESTIC
        
        if not is_gst_applicable:
             invoice_type = InvoiceType.USA # Or a generic Non-GST type if we had one, but USA fits the BRD for Non-GST
        else:
            country_name = "India" # Default
            if deal_id:
                from deals.models import Deal
                deal = Deal.objects.filter(id=deal_id).first()
                if deal:
                    # Try getting country from deal attribute if it exists
                    deal_country = getattr(deal, 'country', None)
                    if deal_country:
                        if hasattr(deal_country, 'name'):
                            country_name = deal_country.name
                        else:
                            country_name = str(deal_country)
                    # Fallback to company field logic
                    elif getattr(deal, 'company', '') == 'AE USA':
                        country_name = 'USA'
            
            if country_name.lower() == 'usa':
                invoice_type = InvoiceType.USA
            elif country_name.lower() != 'india':
                invoice_type = InvoiceType.EXPORT
            elif customer_state_id:
                customer_state = StateMaster.objects.get(id=customer_state_id)
                if company_profile and company_profile.state:
                    if customer_state.id != company_profile.state.id:
                        invoice_type = InvoiceType.INTER_STATE
                    else:
                        invoice_type = InvoiceType.DOMESTIC
        
        # Calculate totals
        subtotal = 0
        total_tax = 0
        
        processed_items = []
        for item in line_items:
            qty = float(item.get('quantity', 1))
            rate = float(item.get('rate', 0))
            discount = float(item.get('discount', 0))
            taxable_value = (qty * rate) - discount
            
            cgst_rate = 0
            cgst_amount = 0
            sgst_rate = 0
            sgst_amount = 0
            igst_rate = 0
            igst_amount = 0
            
            gst_rate = float(item.get('gst_rate', 18)) # Default 18%
            
            if invoice_type == InvoiceType.DOMESTIC:
                cgst_rate = gst_rate / 2
                sgst_rate = gst_rate / 2
                cgst_amount = round(taxable_value * (cgst_rate / 100), 2)
                sgst_amount = round(taxable_value * (sgst_rate / 100), 2)
            elif invoice_type == InvoiceType.INTER_STATE:
                igst_rate = gst_rate
                igst_amount = round(taxable_value * (igst_rate / 100), 2)
            elif invoice_type == InvoiceType.EXPORT:
                pass # Zero Rated
            elif invoice_type == InvoiceType.USA:
                pass # Non-GST, but handle optional sales tax below
                
            line_total = taxable_value + cgst_amount + sgst_amount + igst_amount
            
            processed_items.append({
                **item,
                'taxable_value': taxable_value,
                'cgst_rate': cgst_rate,
                'cgst_amount': cgst_amount,
                'sgst_rate': sgst_rate,
                'sgst_amount': sgst_amount,
                'igst_rate': igst_rate,
                'igst_amount': igst_amount,
                'total_amount': line_total
            })
            
            subtotal += (qty * rate)
            total_tax += (cgst_amount + sgst_amount + igst_amount)

        total_discount = sum(float(i.get('discount', 0)) for i in line_items)
        taxable_amount = subtotal - total_discount
        
        # Handle USA Sales Tax
        sales_tax_rate = float(invoice_data.get('sales_tax_rate', 0))
        sales_tax_amount = round(taxable_amount * (sales_tax_rate / 100), 2) if invoice_type == InvoiceType.USA else 0
        
        grand_total = taxable_amount + total_tax + sales_tax_amount
        
        # Rounding
        rounded_total = round(grand_total)
        round_off = rounded_total - grand_total
        
        return {
            'invoice_type': invoice_type,
            'subtotal': subtotal,
            'total_discount': total_discount,
            'taxable_amount': taxable_amount,
            'total_tax': total_tax,
            'sales_tax_rate': sales_tax_rate,
            'sales_tax_amount': sales_tax_amount,
            'round_off': round_off,
            'total_amount': rounded_total,
            'processed_items': processed_items,
            'grand_total_words': InvoiceService.number_to_words(rounded_total, invoice_data.get('currency', 'INR'))
        }

    @staticmethod
    def number_to_words(number, currency='INR'):
        """
        Simple number to words converter for INR and USD.
        Commas are stripped so the output reads cleanly (e.g. "Twenty Six Lakh" not "Twenty-Six Lakh,").
        """
        try:
            from num2words import num2words
            if currency == 'INR':
                words = num2words(int(number), lang='en_IN').title()
            else:
                words = num2words(int(number), lang='en').title()
            # Remove commas from the words output
            words = words.replace(',', '')
            return words + " Only"
        except ImportError:
            return f"{number} Only"

    @staticmethod
    def generate_pdf(invoice):
        """
        Generates PDF using xhtml2pdf and the HTML template.
        """
        from django.template.loader import render_to_string
        from io import BytesIO
        from xhtml2pdf import pisa
        
        company = CompanyProfile.objects.first()
        items = invoice.line_items.all().order_by('sr_no')
        
        bank = BankConnection.objects.filter(is_primary_for_invoices=True).first()
        if not bank:
            bank = BankConnection.objects.filter(is_active=True).first()
        
        # Determine PO Number and Date (with fallback to linked Sales Order)
        po_number = invoice.po_number
        po_date = invoice.po_date
        
        if not po_number and invoice.deal:
            from sales_orders.models import SalesOrder
            # Try to find a sales order for the same deal/customer
            so = SalesOrder.objects.filter(customer=invoice.deal.customer).order_by('-created_at').first()
            if so:
                po_number = so.po_number
                po_date = so.po_date

        # Map currency codes to PDF-safe display symbols
        # Note: xhtml2pdf default fonts do not support ₹ (U+20B9) — use 'Rs.' instead
        currency_symbols = {
            'INR': 'Rs.',
            'USD': '$',
            'EUR': 'EUR',
            'GBP': 'GBP',
            'AED': 'AED',
            'SGD': 'S$',
        }
        currency_symbol = currency_symbols.get(invoice.currency, invoice.currency)

        # Strip commas from grand_total_words (DB may have old values with commas)
        grand_total_words_clean = (invoice.grand_total_words or '').replace(',', '')

        context = {
            'invoice': invoice,
            'items': items,
            'company': company,
            'bank': bank,
            'po_number': po_number,
            'po_date': po_date,
            'now': date.today(),
            'currency_symbol': currency_symbol,
            'grand_total_words': grand_total_words_clean,
        }
        
        html_string = render_to_string('finance/invoice_pdf.html', context)
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)
        
        if pisa_status.err:
            raise Exception("Error creating PDF with xhtml2pdf")
            
        return pdf_file.getvalue()
