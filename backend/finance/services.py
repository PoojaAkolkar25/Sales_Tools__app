import re
from datetime import date
from types import SimpleNamespace

try:
    import django  # type: ignore
except ImportError:
    pass

from .models import Invoice, InvoiceType, CompanyProfile, StateMaster, BankConnection  # type: ignore

class InvoiceService:
    @staticmethod
    def generate_invoice_number():
        """
        Generates sequential invoice number: INV/2024-25/001
        """
        today = date.today()
        year = today.year
        if today.month < 4:
            fy = f"{year-1}-{year % 100:02d}"
        else:
            fy = f"{year}-{(year+1) % 100:02d}"
        
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
        Invoice types:
          - DOMESTIC: Same state as AE India -> CGST 9% + SGST 9%
          - INTER_STATE: Different state -> IGST 18%
          - EXPORT: Export customer -> IGST 0%
          - SEZ: SEZ Unit customer -> IGST 0% (mapped as INTER_STATE with 0 rate)
          - USA: Non-GST invoice
        """
        if not company_profile:
            company_profile = CompanyProfile.objects.first()
        
        # Auto-selection logic
        customer_state_id = invoice_data.get('customer_state')
        customer_country = invoice_data.get('customer_country', 'India')
        deal_id = invoice_data.get('deal')
        is_gst_applicable = invoice_data.get('is_gst_applicable', True)
        
        invoice_type = InvoiceType.DOMESTIC
        gst_override_zero = False  # For SEZ/Export: same structure as IGST but 0%
        
        if not is_gst_applicable:
             invoice_type = InvoiceType.USA
        else:
            country_name = customer_country or "India"  # DEFAULT
            gst_customer_type = invoice_data.get('gst_customer_type', 'CGST_SGST_9') or 'CGST_SGST_9'
            
            if deal_id:
                from deals.models import Deal  # type: ignore
                deal = Deal.objects.filter(id=deal_id).select_related('customer').first()
                if deal:
                    # Get gst_customer_type from deal's customer
                    if deal.customer:
                        gst_customer_type = getattr(deal.customer, 'gst_customer_type', 'CGST_SGST_9') or 'CGST_SGST_9'
                    
                    deal_country = getattr(deal, 'country', None)
                    if deal_country:
                        if hasattr(deal_country, 'name'):
                            country_name = deal_country.name
                        else:
                            country_name = str(deal_country)
                    elif getattr(deal, 'company', '') == 'AE USA':
                        country_name = 'USA'
            
            if country_name.lower() == 'usa':
                invoice_type = InvoiceType.USA
            elif gst_customer_type in ('EXPORT', 'IGST_0_EXPORT') or country_name.lower() not in ('india', ''):
                invoice_type = InvoiceType.EXPORT
            elif gst_customer_type in ('SEZ', 'IGST_0_SEZ'):
                invoice_type = InvoiceType.SEZ
            elif gst_customer_type == 'IGST_18':
                invoice_type = InvoiceType.INTER_STATE
            elif gst_customer_type == 'CGST_SGST_9':
                invoice_type = InvoiceType.DOMESTIC
            elif customer_state_id:
                try:
                    customer_state = StateMaster.objects.get(id=customer_state_id)
                    if company_profile and company_profile.state:
                        if customer_state.id != company_profile.state.id:
                            invoice_type = InvoiceType.INTER_STATE
                        else:
                            invoice_type = InvoiceType.DOMESTIC
                except StateMaster.DoesNotExist:
                    pass

        
        # Calculate totals
        subtotal = 0
        total_tax = 0
        total_cgst = 0
        total_sgst = 0
        total_igst = 0
        
        def to_float(val, default=0):
            if val is None or val == '':
                return float(default)
            try:
                return float(val)
            except ValueError:
                return float(default)

        processed_items = []
        for item in line_items:
            qty = to_float(item.get('quantity'), 1)
            rate = to_float(item.get('rate'), 0)
            discount = to_float(item.get('discount'), 0)
            taxable_value = (qty * rate) - discount
            
            cgst_rate = 0
            cgst_amount = 0
            sgst_rate = 0
            sgst_amount = 0
            igst_rate = 0
            igst_amount = 0
            
            gst_rate = to_float(item.get('gst_rate'), 18) # Default 18%
            
            if invoice_type == InvoiceType.DOMESTIC:
                cgst_rate = gst_rate / 2
                sgst_rate = gst_rate / 2
                cgst_amount = round(taxable_value * (cgst_rate / 100) * 100) / 100.0
                sgst_amount = round(taxable_value * (sgst_rate / 100) * 100) / 100.0
            elif invoice_type == InvoiceType.INTER_STATE:
                igst_rate = gst_rate
                igst_amount = round(taxable_value * (igst_rate / 100) * 100) / 100.0
            elif invoice_type == InvoiceType.SEZ:
                # SEZ: IGST 0%
                igst_rate = 0
                igst_amount = 0
            elif invoice_type == InvoiceType.EXPORT:
                # Export: IGST 0%
                igst_rate = 0
                igst_amount = 0
            elif invoice_type == InvoiceType.USA:
                pass  # Non-GST, handle optional sales tax below
                
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
            total_cgst += cgst_amount
            total_sgst += sgst_amount
            total_igst += igst_amount

        total_discount = sum(to_float(i.get('discount'), 0) for i in line_items)
        taxable_amount = subtotal - total_discount
        
        # Handle USA Sales Tax
        sales_tax_rate = to_float(invoice_data.get('sales_tax_rate'), 0)
        # Taxation is not applicable to AE USA
        sales_tax_amount = 0
        
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
            'cgst_total': total_cgst,
            'sgst_total': total_sgst,
            'igst_total': total_igst,
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
        Prefuxes with currency code (e.g., INR, USD) to match images.
        """
        try:
            from num2words import num2words  # type: ignore
            if currency == 'INR':
                words = num2words(int(number), lang='en_IN').title()
            else:
                words = num2words(int(number), lang='en').title()
            
            # Remove commas from the words output
            words = words.replace(',', '')
            return f"{currency} {words} Only"
        except ImportError:
            return f"{currency} {number} Only"

    @staticmethod
    def generate_pdf(invoice):
        """
        Generates PDF using xhtml2pdf and the HTML template.
        """
        from django.template.loader import render_to_string  # type: ignore
        from io import BytesIO
        from xhtml2pdf import pisa  # type: ignore
        import os
        
        company = CompanyProfile.objects.first()
        
        # Handle Logo Path (Absolute path needed for xhtml2pdf)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        logo_path = os.path.join(base_dir, 'frontend', 'public', 'Ae_Logo.png')
        if not os.path.exists(logo_path):
            logo_path = company.logo.path if company and company.logo else None
        items = invoice.line_items.all().order_by('sr_no')
        
        bank = BankConnection.objects.filter(is_primary_for_invoices=True).first()
        if not bank:
            bank = BankConnection.objects.filter(is_active=True).first()
        
        # Determine PO Number and Date (with fallback to linked Sales Order)
        po_number = invoice.po_number
        po_date = invoice.po_date
        
        if not po_number:
            from sales_orders.models import SalesOrder  # type: ignore
            target_customer = None
            if invoice.deal and invoice.deal.customer:
                target_customer = invoice.deal.customer
            elif invoice.customer:
                target_customer = invoice.customer
                
            if target_customer:
                so = SalesOrder.objects.filter(customer=target_customer).order_by('-created_at').first()
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
            'logo_path': logo_path,
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

    @staticmethod
    def generate_preview_pdf(invoice_data, line_items_data):
        """
        Generates a preview PDF from unsaved data.
        """
        from django.template.loader import render_to_string  # type: ignore
        from io import BytesIO
        from xhtml2pdf import pisa  # type: ignore
        from types import SimpleNamespace
        import os
        from django.conf import settings
        
        # Calculate taxes using existing logic
        calc_results = InvoiceService.calculate_taxes(invoice_data, line_items_data)
        
        # Determine Entity (AE India vs AE USA)
        is_usa = invoice_data.get('invoice_type') == 'USA' or invoice_data.get('currency') == 'USD'
        
        # Select correct company profile
        if is_usa:
            company = CompanyProfile.objects.filter(name__icontains='INC').first() or \
                      CompanyProfile.objects.filter(name__icontains='Technologies INC').first()
        else:
            company = CompanyProfile.objects.filter(name__icontains='PVT').first() or \
                      CompanyProfile.objects.filter(name__icontains='Technologies PVT').first() or \
                      CompanyProfile.objects.filter(name__icontains='AutomationEdge').first()
            
        if not company:
            company = CompanyProfile.objects.first()

        # Using the logo provided by user in frontend/public: Ae_Logo.png
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        logo_path = os.path.join(base_dir, 'frontend', 'public', 'Ae_Logo.png')
        
        # If the file doesn't exist, fallback to company.logo.path or None
        if not os.path.exists(logo_path):
            logo_path = company.logo.path if company and company.logo else None
        
        def safe_date(date_str):
            if not date_str:
                return date.today()
            try:
                return date.fromisoformat(date_str)
            except ValueError:
                return date.today()

        # Mocking the invoice object for the template
        invoice_mock = SimpleNamespace(
            invoice_no=invoice_data.get('invoice_no', 'PREVIEW'),
            invoice_date=safe_date(invoice_data.get('invoice_date')),
            due_date=safe_date(invoice_data.get('due_date')),
            payment_terms_days=invoice_data.get('payment_terms_days', 30),
            invoice_type=calc_results['invoice_type'],
            subtotal=calc_results['subtotal'],
            total_discount=calc_results['total_discount'],
            taxable_amount=calc_results['taxable_amount'],
            total_tax=calc_results['total_tax'],
            cgst_total=calc_results['cgst_total'],
            sgst_total=calc_results['sgst_total'],
            igst_total=calc_results['igst_total'],
            sales_tax_rate=calc_results['sales_tax_rate'],
            sales_tax_amount=calc_results['sales_tax_amount'],
            round_off=calc_results['round_off'],
            total_amount=calc_results['total_amount'],
            currency=invoice_data.get('currency', 'INR'),
            memo=invoice_data.get('memo', ''),
            billing_address=invoice_data.get('billing_address', ''),
            shipping_address=invoice_data.get('shipping_address', ''),
            signature_image=None, company_seal=None,
            get_customer_name=invoice_data.get('customer_name', '---'),
            get_customer_address=invoice_data.get('billing_address') or invoice_data.get('customer_address') or '---',
            get_customer_gstin=invoice_data.get('customer_gstin') or invoice_data.get('gstin') or invoice_data.get('billing_gstin') or '',
            get_customer_pan=invoice_data.get('customer_pan') or invoice_data.get('pan') or invoice_data.get('billing_pan') or '',
            get_customer_cin=invoice_data.get('customer_cin') or invoice_data.get('cin') or '',
            get_customer_msme=invoice_data.get('customer_msme') or invoice_data.get('msme_number') or '',
            get_customer_address_line_2=invoice_data.get('customer_address_line_2', ''),
            get_customer_city=invoice_data.get('customer_city', ''),
            get_customer_pincode=invoice_data.get('customer_pincode', ''),
            get_customer_state_name=invoice_data.get('customer_state_name') or invoice_data.get('billing_state_name') or invoice_data.get('customer_state') or '',
            get_customer_state_code=invoice_data.get('customer_state_code') or invoice_data.get('billing_state_code') or '',
            # Keep aliases used by template directly
            customer_cin=invoice_data.get('customer_cin'),
            customer_msme=invoice_data.get('customer_msme'),
            gst_declaration=invoice_data.get('gst_declaration', "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This invoice is issued under Rule 46 of the CGST Rules, 2017."),
            lut_declaration=invoice_data.get('lut_declaration', "Supply meant for export under Letter of Undertaking (LUT) without payment of Integrated Tax as per Section 16(3) of the IGST Act, 2017 and Rule 96A of the CGST Rules, 2017."),
            irn=invoice_data.get('irn'),
            ack_no=invoice_data.get('ack_no'),
            ack_date=safe_date(invoice_data.get('ack_date')) if invoice_data.get('ack_date') else None,
        )

        # Mock methods required by template
        # Line items are processed below

        # Process line items for template
        items_mock = []
        processed_items = calc_results.get('processed_items', [])
        if not isinstance(processed_items, list):
            processed_items = []
        for i, item in enumerate(processed_items):
            items_mock.append(SimpleNamespace(sr_no=i+1, **item))

        # Select correct bank based on entity
        if is_usa:
            bank = BankConnection.objects.filter(bank_name__icontains='America').first()
        else:
            bank = BankConnection.objects.filter(bank_name__icontains='ICICI').first()

        if not bank:
            bank = BankConnection.objects.filter(is_primary_for_invoices=True).first()
        if not bank:
            bank = BankConnection.objects.filter(is_active=True).first()

        currency_symbols = {
            'INR': 'Rs.',
            'USD': '$',
            'EUR': 'EUR',
            'GBP': 'GBP',
            'AED': 'AED',
            'SGD': 'S$',
        }
        invoice_currency = getattr(invoice_mock, 'currency', 'INR')
        currency_symbol = currency_symbols.get(invoice_currency, invoice_currency)

        context = {
            'invoice': invoice_mock,
            'items': items_mock,
            'company': company,
            'bank': bank,
            'logo_path': logo_path,
            'po_number': invoice_data.get('po_number'),
            'po_date': safe_date(invoice_data.get('po_date')) if invoice_data.get('po_date') else None,
            'now': date.today(),
            'currency_symbol': currency_symbol,
            'grand_total_words': calc_results['grand_total_words'],
        }
        
        html_string = render_to_string('finance/invoice_pdf.html', context)
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)
        
        if pisa_status.err:
            raise Exception("Error creating preview PDF with xhtml2pdf")
            
        return pdf_file.getvalue()
