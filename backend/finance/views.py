from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from .filters import InvoiceFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from .models import (
    Invoice, InvoiceLineItem, StateMaster, CompanyProfile,
    BankConnection, BankTransaction, ReceiptVoucher, ReceiptAdjustment, 
    BankTransactionStatus, ReceiptStatus, BankTransactionSource,
    CustomerPartner, EndCustomer, FinancialYear
)
from deals.models import AuditTrail
from .serializers import (
    InvoiceSerializer, InvoiceLineItemSerializer, StateMasterSerializer, 
    CompanyProfileSerializer, BankConnectionSerializer, BankTransactionSerializer, 
    ReceiptVoucherSerializer, ReceiptAdjustmentSerializer,
    CustomerPartnerSerializer, EndCustomerSerializer, FinancialYearSerializer
)
from .services import InvoiceService
import csv
import io
import logging

logger = logging.getLogger(__name__)

class StateMasterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StateMaster.objects.all().order_by('code')
    serializer_class = StateMasterSerializer

class CompanyProfileViewSet(viewsets.ModelViewSet):
    queryset = CompanyProfile.objects.all()
    serializer_class = CompanyProfileSerializer

    def perform_create(self, serializer):
        try:
            profile = serializer.save()
            
            # Log audit trail for company profile creation
            content_type = ContentType.objects.get_for_model(CompanyProfile)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=profile.id,
                user=self.request.user,
                action_type='CREATE',
                field_name='created',
                old_value='',
                new_value=f'Company Profile {profile.name} created'
            )
        except Exception as e:
            logger.error(f"Error creating company profile: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        try:
            profile = serializer.save()
            
            # Log audit trail for company profile update
            content_type = ContentType.objects.get_for_model(CompanyProfile)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=profile.id,
                user=self.request.user,
                action_type='UPDATE',
                field_name='company_name',
                old_value=profile.name,
                new_value=f'Company Profile {profile.name} updated'
            )
        except Exception as e:
            logger.error(f"Error updating company profile: {str(e)}", exc_info=True)
            raise

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-created_at')
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['invoice_no', 'lead__customer_name', 'deal__deal_name']
    filterset_class = InvoiceFilter
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        import json
        
        # Get line items data - could be in 'line_items' (JSON) or 'line_items_data' (FormData JSON string)
        line_items_raw = self.request.data.get('line_items', [])
        if not line_items_raw:
            line_items_raw = self.request.data.get('line_items_data', '[]')
            
        if isinstance(line_items_raw, str):
            try:
                line_items_data = json.loads(line_items_raw)
            except json.JSONDecodeError:
                line_items_data = []
        else:
            line_items_data = line_items_raw
            
        invoice_data = self.request.data
        calc_results = InvoiceService.calculate_taxes(invoice_data, line_items_data)
        
        # Determine invoice number
        invoice_no = self.request.data.get('invoice_no')
        # Auto-populate address from Customer if available
        billing_address = self.request.data.get('billing_address')
        shipping_address = self.request.data.get('shipping_address')
        customer_gstin = self.request.data.get('customer_gstin')
        
        deal_id = self.request.data.get('deal')
        if deal_id:
            from deals.models import Deal
            deal_obj = Deal.objects.filter(id=deal_id).select_related('customer').first()
            if deal_obj and deal_obj.customer:
                if not billing_address:
                    billing_address = deal_obj.customer.address
                if not shipping_address:
                    shipping_address = deal_obj.customer.address
                if not customer_gstin:
                    customer_gstin = deal_obj.customer.gstin

        # Save invoice with all calculated values
        invoice = serializer.save(
            invoice_no=invoice_no,
            billing_address=billing_address,
            shipping_address=shipping_address,
            customer_gstin=customer_gstin,
            invoice_type=calc_results['invoice_type'],
            subtotal=calc_results['subtotal'],
            total_discount=calc_results['total_discount'],
            taxable_amount=calc_results['taxable_amount'],
            total_tax=calc_results['total_tax'],
            sales_tax_rate=calc_results['sales_tax_rate'],
            sales_tax_amount=calc_results['sales_tax_amount'],
            round_off=calc_results['round_off'],
            total_amount=calc_results['total_amount'],
            open_balance=calc_results['total_amount'], # Initial open balance is full amount
            grand_total_words=calc_results['grand_total_words']
        )
        
        # Create line items
        for idx, item in enumerate(calc_results['processed_items'], 1):
            InvoiceLineItem.objects.create(
                invoice=invoice,
                sr_no=idx,
                description=item.get('description'),
                hsn_sac=item.get('hsn_sac'),
                quantity=item.get('quantity', 1),
                rate=item.get('rate', 0),
                taxable_value=item.get('taxable_value'),
                discount=item.get('discount', 0),
                cgst_rate=item.get('cgst_rate', 0),
                cgst_amount=item.get('cgst_amount', 0),
                sgst_rate=item.get('sgst_rate', 0),
                sgst_amount=item.get('sgst_amount', 0),
                igst_rate=item.get('igst_rate', 0),
                igst_amount=item.get('igst_amount', 0),
                total_amount=item.get('total_amount')
            )
        
        # Integration: Auto-update Deal and Cost Sheet with invoice reference
        if invoice.deal:
            # Note: Django's related_name 'invoices' handles this automatically via FK
            # But we could trigger signals or additional logic here if needed
            pass
        
        if invoice.cost_sheet:
            # Similarly, automatic via FK relationship 'invoices'
            pass
        
        # Log audit trail for invoice creation
        from deals.models import AuditTrail
        content_type = ContentType.objects.get_for_model(Invoice)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=invoice.id,
            user=self.request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Invoice {invoice.invoice_no} created'
        )
        
        return invoice

    def perform_update(self, serializer):
        import json
        
        # Get line items data - could be in 'line_items' (JSON) or 'line_items_data' (FormData JSON string)
        line_items_raw = self.request.data.get('line_items', [])
        if not line_items_raw:
            line_items_raw = self.request.data.get('line_items_data', '[]')
            
        if isinstance(line_items_raw, str):
            try:
                line_items_data = json.loads(line_items_raw)
            except json.JSONDecodeError:
                line_items_data = []
        else:
            line_items_data = line_items_raw
            
        invoice_data = self.request.data
        calc_results = InvoiceService.calculate_taxes(invoice_data, line_items_data)
        
        # Auto-populate address from Customer if available (for updates if missing)
        billing_address = self.request.data.get('billing_address')
        shipping_address = self.request.data.get('shipping_address')
        customer_gstin = self.request.data.get('customer_gstin')
        
        deal_id = self.request.data.get('deal')
        if deal_id:
            from deals.models import Deal
            deal_obj = Deal.objects.filter(id=deal_id).select_related('customer').first()
            if deal_obj and deal_obj.customer:
                if not billing_address:
                    billing_address = deal_obj.customer.address
                if not shipping_address:
                    shipping_address = deal_obj.customer.address
                if not customer_gstin:
                    customer_gstin = deal_obj.customer.gstin

        # Save invoice with all calculated values
        invoice = serializer.save(
            billing_address=billing_address,
            shipping_address=shipping_address,
            customer_gstin=customer_gstin,
            invoice_type=calc_results['invoice_type'],
            subtotal=calc_results['subtotal'],
            total_discount=calc_results['total_discount'],
            taxable_amount=calc_results['taxable_amount'],
            total_tax=calc_results['total_tax'],
            sales_tax_rate=calc_results['sales_tax_rate'],
            sales_tax_amount=calc_results['sales_tax_amount'],
            round_off=calc_results['round_off'],
            total_amount=calc_results['total_amount'],
            open_balance=calc_results['total_amount'], # Reset balance on update? Or keep old? Logically if amount changes, balance should adjust.
            grand_total_words=calc_results['grand_total_words']
        )
        
        # Update line items: Delete old and create new
        invoice.line_items.all().delete()
        for idx, item in enumerate(calc_results['processed_items'], 1):
            InvoiceLineItem.objects.create(
                invoice=invoice,
                sr_no=idx,
                description=item.get('description'),
                hsn_sac=item.get('hsn_sac'),
                quantity=item.get('quantity', 1),
                rate=item.get('rate', 0),
                taxable_value=item.get('taxable_value'),
                discount=item.get('discount', 0),
                cgst_rate=item.get('cgst_rate', 0),
                cgst_amount=item.get('cgst_amount', 0),
                sgst_rate=item.get('sgst_rate', 0),
                sgst_amount=item.get('sgst_amount', 0),
                igst_rate=item.get('igst_rate', 0),
                igst_amount=item.get('igst_amount', 0),
                total_amount=item.get('total_amount')
            )
        
        # Log audit trail for invoice update
        content_type = ContentType.objects.get_for_model(Invoice)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=invoice.id,
            user=self.request.user,
            action_type='UPDATE',
            field_name='invoice_no',
            old_value=invoice.invoice_no,
            new_value=f'Invoice {invoice.invoice_no} updated'
        )
        
        return invoice

    @action(detail=True, methods=['post'])
    def finalise(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != 'DRAFT':
            return Response({'error': 'Only draft invoices can be finalised'}, status=400)
        
        invoice.status = 'FINALISED'
        invoice.save()
        
        # Log audit trail for submission
        content_type = ContentType.objects.get_for_model(Invoice)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=invoice.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value='DRAFT',
            new_value='FINALISED'
        )
        
        return Response({'status': 'Invoice finalised successfully'})



    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        invoice = self.get_object()
        old_status = invoice.status
        comments = request.data.get('approval_comments', '').strip()
        
        # Require comments for rejection
        if not comments:
            return Response(
                {'error': 'Approval comments are required when rejecting an invoice'}, 
                status=400
            )
        
        invoice.status = 'DRAFT' # Or a REJECTED status if we add one
        invoice.approval_comments = comments
        invoice.save()
        
        # Log audit trail for rejection
        from deals.models import AuditTrail
        content_type = ContentType.objects.get_for_model(Invoice)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=invoice.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value=old_status,
            new_value='DRAFT'
        )
        
        return Response({'status': 'Invoice rejected', 'comments': comments})

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        from django.http import HttpResponse
        invoice = self.get_object()
        try:
            pdf_content = InvoiceService.generate_pdf(invoice)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_no}.pdf"'
            return response
        except Exception as e:
            logger.error(f"Error in download_pdf (finance): {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def email_draft(self, request, pk=None):
        invoice = self.get_object()
        
        # Determine email
        to_email = ""
        if invoice.lead and hasattr(invoice.lead, 'email') and invoice.lead.email:
            to_email = invoice.lead.email
        elif invoice.deal and invoice.deal.customer_email:
            to_email = invoice.deal.customer_email
        elif invoice.deal and invoice.deal.customer and invoice.deal.customer.email:
            to_email = invoice.deal.customer.email
            
        # Determine PO presence
        has_po = False
        po_filename = ""
        if invoice.sales_order and invoice.sales_order.po_file:
            has_po = True
            po_filename = invoice.sales_order.po_file.file.name.split('/')[-1]
            
        comp_profile = CompanyProfile.objects.first()
        company_name = comp_profile.name if comp_profile else "Our Company"
        subject = f"Invoice {invoice.invoice_no} from {company_name}"
        return Response({
            'to': to_email,
            'subject': subject,
            'has_po': has_po,
            'po_filename': po_filename
        })

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        from django.core.mail import EmailMessage
        from django.conf import settings
        
        invoice = self.get_object()
        if invoice.status not in ['FINALISED', 'SUBMITTED', 'PARTIAL', 'PAID']:
            return Response({'error': 'Invoice must be finalised before sending'}, status=400)
            
        try:
            pdf_content = InvoiceService.generate_pdf(invoice)
            
            # Read custom data if provided, fallback to defaults
            to_email = request.data.get('to')
            cc_emails = request.data.get('cc', '')
            bcc_emails = request.data.get('bcc', '')
            subject = request.data.get('subject')
            body = request.data.get('body')
            include_po = request.data.get('include_po', False)
            
            if not to_email:
                if invoice.lead and hasattr(invoice.lead, 'email') and invoice.lead.email:
                    to_email = invoice.lead.email
                elif invoice.deal and invoice.deal.customer_email:
                    to_email = invoice.deal.customer_email
                elif invoice.deal and invoice.deal.customer and invoice.deal.customer.email:
                    to_email = invoice.deal.customer.email
            
            if not to_email:
                return Response({'error': 'No email address found for this customer. Please update the Lead or Deal contact info, or provide it in the request.'}, status=400)
            
            if not subject:
                comp_profile = CompanyProfile.objects.first()
                subject = f"Invoice {invoice.invoice_no} from {comp_profile.name if comp_profile else 'Our Company'}"
                
            if not body:
                body_html = f"<p>Please find attached invoice {invoice.invoice_no} for your reference.</p>"
            else:
                body_html = body.replace('\\n', '<br>')
            
            # Construct HTML Table
            gst_total = float(invoice.total_tax)
            basic_amt = float(invoice.taxable_amount)
            currency_symbol = "₹" if invoice.currency == 'INR' else "$"
            
            table_html = f"""
            <br><br>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: sans-serif; width: 100%; font-size: 11px;">
                <thead>
                    <tr style="background-color: #f2f2f2; text-align: center;">
                        <th>Invoice Date</th>
                        <th>Customer Name</th>
                        <th>Invoice No.</th>
                        <th>Basic Amt.</th>
                        <th>GST</th>
                        <th>Invoice Amt.</th>
                        <th>Narration</th>
                        <th>PO Number</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="text-align: center;">
                        <td>{invoice.invoice_date.strftime('%B %d, %Y')}</td>
                        <td>{invoice.lead.customer_name if invoice.lead else ''}</td>
                        <td>{invoice.invoice_no}</td>
                        <td>{currency_symbol}{basic_amt:,.2f}</td>
                        <td>{currency_symbol}{gst_total:,.2f}</td>
                        <td><strong>{currency_symbol}{float(invoice.total_amount):,.2f}</strong></td>
                        <td>{invoice.memo or ''}</td>
                        <td>{invoice.po_number or (invoice.sales_order.po_number if invoice.sales_order else '')}</td>
                    </tr>
                </tbody>
            </table>
            """
            
            final_body = body_html + table_html
            
            cc_list = [e.strip() for e in cc_emails.split(',') if e.strip()]
            bcc_list = [e.strip() for e in bcc_emails.split(',') if e.strip()]
            
            if hasattr(settings, 'FINANCE_EMAIL') and settings.FINANCE_EMAIL:
                if settings.FINANCE_EMAIL not in cc_list:
                    cc_list.append(settings.FINANCE_EMAIL)

            email = EmailMessage(
                subject=subject,
                body=final_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
                cc=cc_list,
                bcc=bcc_list
            )
            email.content_subtype = "html" # Set main content type to HTML
            
            # Attach generated PDF
            email.attach(f"Invoice_{invoice.invoice_no}.pdf", pdf_content, 'application/pdf')
            
            # Attach PO if requested
            if include_po and invoice.sales_order and invoice.sales_order.po_file:
                po_file = invoice.sales_order.po_file.file
                email.attach(po_file.name.split('/')[-1], po_file.read(), 'application/pdf')
                po_file.seek(0)
                
            email.send()
            
            invoice.status = 'SUBMITTED'
            invoice.save()
            return Response({'status': 'Email sent successfully'})
        except Exception as e:
            logger.error(f"Error in send_email (finance): {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['get'])
    def report_register(self, request):
        invoices = self.filter_queryset(self.get_queryset())
        data = []
        for inv in invoices:
            data.append({
                'invoice_no': inv.invoice_no,
                'date': inv.invoice_date,
                'customer': inv.lead.customer_name,
                'type': inv.invoice_type,
                'status': inv.status,
                'amount': inv.total_amount
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def report_tax_summary(self, request):
        from django.db.models import Sum
        summary = Invoice.objects.filter(status__in=['FINALISED', 'SUBMITTED', 'PAID', 'PARTIAL']).aggregate(
            total_cgst=Sum('line_items__cgst_amount'),
            total_sgst=Sum('line_items__sgst_amount'),
            total_igst=Sum('line_items__igst_amount'),
            total_sales_tax=Sum('sales_tax_amount')
        )
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def report_customer_billing(self, request):
        """
        Customer-wise billing report showing total invoiced amount, paid amount, and outstanding balance per customer.
        """
        from django.db.models import Sum, Count, Q
        
        # Get customer-grouped data
        customer_billing = Invoice.objects.values(
            'lead__id',
            'lead__customer_name'
        ).annotate(
            total_invoices=Count('id'),
            total_billed=Sum('total_amount'),
            total_paid=Sum('total_amount', filter=Q(status='PAID')),
            total_partial=Sum('total_amount', filter=Q(status='PARTIAL')),
            total_outstanding=Sum('open_balance')
        ).order_by('-total_billed')
        
        # Format the response
        data = []
        for customer in customer_billing:
            data.append({
                'customer_id': customer['lead__id'],
                'customer_name': customer['lead__customer_name'],
                'total_invoices': customer['total_invoices'],
                'total_billed': float(customer['total_billed'] or 0),
                'total_paid': float(customer['total_paid'] or 0),
                'total_partial': float(customer['total_partial'] or 0),
                'total_outstanding': float(customer['total_outstanding'] or 0)
            })
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        import xlsxwriter
        from django.http import HttpResponse
        
        invoices = self.filter_queryset(self.get_queryset())
        today = timezone.now().date()
        
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Invoices Report")

        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#2F855A',
            'font_color': 'white',
            'border': 1
        })

        headers = ['Invoice No', 'Date', 'Due Date', 'Customer Name', 'Status', 'Total Amount', 'Open Balance']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        for row, inv in enumerate(invoices, start=1):
            customer_name = ""
            if inv.lead:
                customer_name = inv.lead.customer_name
            elif inv.deal and inv.deal.customer:
                customer_name = inv.deal.customer.name
                
            worksheet.write(row, 0, inv.invoice_no)
            worksheet.write(row, 1, str(inv.invoice_date) if inv.invoice_date else '—')
            worksheet.write(row, 2, str(inv.due_date) if inv.due_date else '—')
            worksheet.write(row, 3, customer_name or '—')
            worksheet.write(row, 4, inv.status)
            worksheet.write(row, 5, float(inv.total_amount) if inv.total_amount else 0)
            worksheet.write(row, 6, float(inv.open_balance) if inv.open_balance else 0)

        workbook.close()
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="invoices_report_{today}.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        try:
            from django.template.loader import render_to_string
            from django.http import HttpResponse
            from xhtml2pdf import pisa
            import io
            
            invoices = self.filter_queryset(self.get_queryset())
            html_string = render_to_string('finance/report_pdf.html', {'invoices': invoices, 'now': timezone.now()})
            
            result = io.BytesIO()
            pdf = pisa.pisaDocument(io.StringIO(html_string), result)
            
            if not pdf.err:
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Invoices_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
                return response
            else:
                logger.error("PDF generation errors occurred in export_pdf (finance)")
                return Response({
                    "status": "error",
                    "message": "PDF generation errors occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in export_pdf (finance): {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BankConnectionViewSet(viewsets.ModelViewSet):
    queryset = BankConnection.objects.all()
    serializer_class = BankConnectionSerializer

class BankTransactionViewSet(viewsets.ModelViewSet):
    queryset = BankTransaction.objects.all()
    serializer_class = BankTransactionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['description', 'customer_name']

    @action(detail=False, methods=['post'])
    def sync(self, request):
        import random
        from datetime import date, timedelta
        
        connections = BankConnection.objects.filter(is_active=True)
        if not connections.exists():
             return Response({'error': 'No active bank connections found'}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
            today = date.today()
            count = 0
            for conn in connections:
                # Create dummy transactions
                num_transactions = random.randint(1, 3)
                for i in range(num_transactions):
                    deposit = random.randint(5000, 50000)
                    withdrawal = 0
                    tx_date = today - timedelta(days=random.randint(0, 5))
                    
                    BankTransaction.objects.create(
                        bank_connection=conn,
                        transaction_date=tx_date,
                        description=f"Payment received - REF{random.randint(1000, 9999)}",
                        amount_received=deposit, # Keeping this for legacy compatibility
                        
                        # New Fields
                        transaction_id=f"TXN{random.randint(10000, 99999)}",
                        value_date=tx_date,
                        posted_date=tx_date,
                        cheque_ref_no=f"CHQ{random.randint(100,999)}",
                        transaction_remarks=f"Payment received",
                        withdrawal_amount=withdrawal,
                        deposit_amount=deposit,
                        balance=random.randint(100000, 500000),
                        
                        customer_name=f"Customer {random.randint(1, 10)}", # Mock customer extraction
                        source=BankTransactionSource.AUTO,
                        status=BankTransactionStatus.FOR_REVIEW
                    )
                    count += 1
                    
            return Response({'status': 'Synced successfully', 'count': count})
        except Exception as e:
            logger.error(f"Error in sync (finance): {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        file_obj = request.FILES.get('file')
        bank_type = request.data.get('bank_type', 'generic')
        
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        valid_extensions = ['.csv', '.xlsx', '.xls']
        if not any(file_obj.name.endswith(ext) for ext in valid_extensions):
             return Response({'error': 'Only CSV, XLSX, and XLS files are supported'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = []
            if file_obj.name.endswith('.csv'):
                decoded_file = file_obj.read().decode('utf-8-sig')
                lines = decoded_file.split('\n')
                
                # For BoFA CSV, find the actual header row
                header_line_idx = 0
                if bank_type == 'bofa':
                    for idx, line in enumerate(lines):
                        if 'Date,Description,Amount,Running Bal' in line:
                            header_line_idx = idx
                            break
                    # Skip to header and parse from there
                    csv_content = '\n'.join(lines[header_line_idx:])
                    io_string = io.StringIO(csv_content)
                else:
                    io_string = io.StringIO(decoded_file)
                    
                reader = csv.DictReader(io_string)
                data = list(reader)
            else:
                import pandas as pd
                
                # Detect Header Row Dynamically
                header_row = 0
                try:
                    # Read first 30 rows to scan for headers
                    if hasattr(file_obj, 'seek'):
                        file_obj.seek(0)
                    df_preview = pd.read_excel(file_obj, header=None, nrows=30)
                    
                    if bank_type == 'idfc':
                         for idx, row in df_preview.iterrows():
                            row_str = ' '.join(row.astype(str)).lower()
                            # Look for key IDFC columns
                            if ('trans date' in row_str or 'transaction date' in row_str) and ('debit' in row_str or 'credit' in row_str):
                                header_row = idx
                                break
                    elif bank_type == 'icici':
                        for idx, row in df_preview.iterrows():
                            # Row 16 in Excel is index 15. The preview has 0-based index.
                            row_str = ' '.join(row.astype(str)).lower()
                            if 'tran. id' in row_str or 'transaction posted date' in row_str:
                                header_row = idx
                                break
                    elif bank_type == 'bofa':
                         for idx, row in df_preview.iterrows():
                            row_str = ' '.join(row.astype(str)).lower()
                            if 'running bal.' in row_str or 'beginning balance' in row_str:
                                header_row = idx
                                break
                                
                    # Reset file pointer for full read
                    if hasattr(file_obj, 'seek'):
                        file_obj.seek(0)
                        
                except Exception as e:
                    print(f"Header detection failed: {e}")
                    # Fallback to defaults if detection fails
                    if bank_type == 'icici': header_row = 15
                    elif bank_type == 'idfc': header_row = 18  # Updated from 17 to 18
                    elif bank_type == 'bofa': header_row = 7

                df = pd.read_excel(file_obj, header=header_row)
                df = df.where(pd.notnull(df), None)
                data = df.to_dict('records')
            
            connection = BankConnection.objects.filter(is_active=True).first()
            if not connection:
                return Response({'error': 'No active bank connections found'}, status=status.HTTP_400_BAD_REQUEST)
            
            created_count = 0
            
            def parse_decimal(value):
                if value is None: return 0
                val_str = str(value).strip().replace(',', '')
                if val_str.lower() in ['', 'nan', 'none']: return 0
                try:
                    return float(val_str)
                except (ValueError, TypeError):
                    return 0
                    
            def parse_date(date_val, specific_formats=None):
                from datetime import datetime
                if not date_val: return None
                if hasattr(date_val, 'date'): return date_val.date()
                if hasattr(date_val, 'to_pydatetime'): return date_val.to_pydatetime().date()
                
                date_str = str(date_val).strip()
                if date_str.lower() in ['nan', 'nat', 'none', '']: return None

                # Handle IDFC "DD/MM/YYYY HH:MM:SS" format
                if ' ' in date_str and ':' in date_str:
                    try:
                        return datetime.strptime(date_str.split(' ')[0], '%d/%m/%Y').date()
                    except:
                        pass
                
                # Default formats (Indian/Global)
                default_formats = [
                    '%d/%b/%Y', '%d-%b-%Y', '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', 
                    '%d-%b-%y', '%m/%d/%Y', '%m-%d-%Y', '%b %d, %Y'
                ]
                
                formats_to_try = specific_formats if specific_formats else default_formats
                
                for fmt in formats_to_try:
                    try:
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
                
                # Fallback
                if specific_formats:
                    for fmt in default_formats:
                        try:
                            return datetime.strptime(date_str, fmt).date()
                        except ValueError:
                            continue
                            
                return None

            for row in data:
                try:
                    deposit = 0
                    withdrawal = 0
                    tx_date = None
                    remarks = ''
                    tx_id = ''
                    val_date = None
                    post_date = None
                    cheque_ref = ''
                    balance = 0

                    if bank_type == 'icici':
                        tx_date = parse_date(row.get('Transaction Date'))
                        val_date = parse_date(row.get('Value Date'))
                        post_date = parse_date(row.get('Transaction Posted Date'))
                        tx_id = str(row.get('Tran. Id') or '')
                        cheque_ref = str(row.get('Cheque. No./Ref. No.') or '')
                        remarks = str(row.get('Transaction Remarks') or '')
                        withdrawal = parse_decimal(row.get('Withdrawal Amt (INR)'))
                        deposit = parse_decimal(row.get('Deposit Amt (INR)'))
                        balance = parse_decimal(row.get('Balance (INR)'))
                    
                    elif bank_type == 'idfc':
                        # IDFC Columns: "Trans Date and Time", "Value Date", "Transaction Details", "Ref/Cheque No", "Debit", "Credit", "Balance"
                        tx_date = parse_date(row.get('Trans Date and Time'))
                        val_date = parse_date(row.get('Value Date'))
                        remarks = str(row.get('Transaction Details') or '')
                        cheque_ref = str(row.get('Ref/Cheque No') or '')
                        withdrawal = parse_decimal(row.get('Debit'))
                        deposit = parse_decimal(row.get('Credit'))
                        balance = parse_decimal(row.get('Balance'))

                    elif bank_type == 'bofa':
                        # BoA: "Date", "Description", "Amount", "Running Bal."
                        us_formats = ['%m/%d/%Y', '%m-%d-%Y', '%Y-%m-%d']
                        tx_date = parse_date(row.get('Date'), specific_formats=us_formats)
                        remarks = str(row.get('Description') or '')
                        amount = parse_decimal(row.get('Amount'))
                        if amount > 0:
                            deposit = amount
                            withdrawal = 0
                        else:
                            deposit = 0
                            withdrawal = abs(amount)
                        balance = parse_decimal(row.get('Running Bal.'))

                    else: # Generic
                        tx_date = parse_date(row.get('Date') or row.get('Transaction Date'))
                        remarks = str(row.get('Description') or row.get('Remarks') or '')
                        if 'Deposit' in row or 'Withdrawal' in row:
                            deposit = parse_decimal(row.get('Deposit'))
                            withdrawal = parse_decimal(row.get('Withdrawal'))
                        else:
                            amount = parse_decimal(row.get('Amount'))
                            deposit = amount if amount > 0 else 0
                            withdrawal = abs(amount) if amount < 0 else 0
                        balance = parse_decimal(row.get('Balance'))

                    if not tx_date:
                        continue
                     
                    val_date = val_date or tx_date
                    post_date = post_date or tx_date
                    
                    customer_name = str(remarks).split(' ')[0] if remarks else 'Unknown'
                    
                    BankTransaction.objects.create(
                        bank_connection=connection,
                        transaction_date=tx_date,
                        description=remarks,
                        amount_received=deposit,
                        transaction_id=tx_id,
                        value_date=val_date,
                        posted_date=post_date,
                        cheque_ref_no=cheque_ref,
                        transaction_remarks=remarks,
                        withdrawal_amount=withdrawal,
                        deposit_amount=deposit,
                        balance=balance,
                        customer_name=customer_name,
                        source=BankTransactionSource.MANUAL,
                        status=BankTransactionStatus.FOR_REVIEW
                    )
                    created_count += 1
                except Exception as row_err:
                    print(f"Error parsing row: {row_err}")
                    continue
                
            return Response({'status': 'Uploaded successfully', 'count': created_count})
            
        except Exception as e:
            logger.error(f"Error in upload (finance): {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['post'])
    def match(self, request, pk=None):
        transaction = self.get_object()
        receipt_ids = request.data.get('receipt_ids', [])
        
        if not receipt_ids:
            return Response({'error': 'No receipt vouchers selected'}, status=status.HTTP_400_BAD_REQUEST)
            
        receipts = ReceiptVoucher.objects.filter(id__in=receipt_ids)
        total_receipt_amount = sum(r.amount_received for r in receipts)
        
        if total_receipt_amount != transaction.amount_received:
            return Response({
                'error': f'Total receipt amount ({total_receipt_amount}) does not match transaction amount ({transaction.amount_received})'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        reconciliation_date = request.data.get('reconciliation_date')
        
        # Perform matching
        for receipt in receipts:
            receipt.bank_transaction = transaction
            receipt.status = ReceiptStatus.RECONCILED
            receipt.save()
            
        transaction.status = BankTransactionStatus.CATEGORIZED
        if reconciliation_date:
            transaction.reconciliation_date = reconciliation_date
        transaction.save()
        
        # Log audit trail for matching
        content_type = ContentType.objects.get_for_model(BankTransaction)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=transaction.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value=BankTransactionStatus.FOR_REVIEW,
            new_value=BankTransactionStatus.CATEGORIZED
        )
        
        return Response({'status': 'Transaction matched and categorized'})

    @action(detail=True, methods=['post'])
    def exclude(self, request, pk=None):
        transaction = self.get_object()
        reason = request.data.get('reason', 'Other')
        transaction.status = BankTransactionStatus.EXCLUDED
        transaction.exclusion_reason = reason
        transaction.save()
        
        # Log audit trail for exclusion
        content_type = ContentType.objects.get_for_model(BankTransaction)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=transaction.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value=BankTransactionStatus.FOR_REVIEW,
            new_value=BankTransactionStatus.EXCLUDED
        )
        return Response({'status': 'Excluded successfully'})

    @action(detail=True, methods=['post'])
    def undo_exclude(self, request, pk=None):
        transaction = self.get_object()
        transaction.status = BankTransactionStatus.FOR_REVIEW
        transaction.exclusion_reason = None
        transaction.save()
        
        # Log audit trail for undo exclusion
        content_type = ContentType.objects.get_for_model(BankTransaction)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=transaction.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value=BankTransactionStatus.EXCLUDED,
            new_value=BankTransactionStatus.FOR_REVIEW
        )
        return Response({'status': 'Transaction moved back to for review'})

class ReceiptVoucherViewSet(viewsets.ModelViewSet):
    queryset = ReceiptVoucher.objects.all()
    serializer_class = ReceiptVoucherSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['status', 'payment_date', 'customer_name']
    search_fields = ['receipt_no', 'lead__customer_name', 'customer_name', 'reference_number']

    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['receipt_no', 'lead__customer_name', 'customer_name', 'reference_number']

    def perform_create(self, serializer):
        from decimal import Decimal
        import json
        from leads.models import Lead

        # Try to find a matching lead if customer_name is provided
        customer_name = self.request.data.get('customer_name')
        lead = None
        if customer_name:
            lead = Lead.objects.filter(customer_name=customer_name).first()

        receipt = serializer.save(lead=lead)
        
        # Log audit trail for receipt creation
        content_type = ContentType.objects.get_for_model(ReceiptVoucher)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=receipt.id,
            user=self.request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Receipt Voucher {receipt.receipt_no} created'
        )
        # Handle adjustments
        adjustments_data = self.request.data.get('adjustments', [])
        if isinstance(adjustments_data, str):
            try:
                adjustments_data = json.loads(adjustments_data)
            except json.JSONDecodeError:
                adjustments_data = []
                
        for adj_data in adjustments_data:
            invoice_id = adj_data.get('invoice')
            payment_amount = Decimal(adj_data.get('payment_amount') or 0)
            tds_amount = Decimal(adj_data.get('tds_amount') or 0)
            bank_charges = Decimal(adj_data.get('bank_charges') or 0)
            
            if payment_amount == 0 and tds_amount == 0 and bank_charges == 0:
                continue

            invoice = Invoice.objects.get(id=invoice_id)
            ReceiptAdjustment.objects.create(
                receipt_voucher=receipt,
                invoice=invoice,
                payment_amount=payment_amount,
                tds_amount=tds_amount,
                bank_charges=bank_charges
            )
            
            # Update invoice balance
            old_balance = invoice.open_balance
            invoice.open_balance -= (payment_amount + tds_amount + bank_charges)
            if invoice.open_balance <= 0:
                invoice.open_balance = 0
                invoice.status = 'PAID'
            else:
                invoice.status = 'PARTIAL'
            invoice.save()
            
            # Log audit trail for invoice balance update
            invoice_ct = ContentType.objects.get_for_model(Invoice)
            AuditTrail.objects.create(
                content_type=invoice_ct,
                object_id=invoice.id,
                user=self.request.user,
                action_type='UPDATE',
                field_name='open_balance',
                old_value=str(old_balance),
                new_value=str(invoice.open_balance)
            )
            
        # Handle Attachments
        files = self.request.FILES.getlist('attachments')
        for f in files:
            ReceiptAttachment.objects.create(
                receipt_voucher=receipt,
                file=f,
                filename=f.name
            )

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        try:
            from django.template.loader import render_to_string
            from django.http import HttpResponse
            from xhtml2pdf import pisa
            import io
            import os
            from django.conf import settings
            from django.utils import timezone
            
            voucher = self.get_object()
            
            # Use same encoding fix as Deals and Sales Orders
            pdf_currency_symbol = '₹'
            if voucher.lead and hasattr(voucher.lead, 'currency') and voucher.lead.currency:
                if voucher.lead.currency == 'USD':
                    pdf_currency_symbol = '$'
                elif voucher.lead.currency == 'EUR':
                    pdf_currency_symbol = '€'
            elif hasattr(voucher, 'currency') and voucher.currency:
                if voucher.currency == 'USD':
                    pdf_currency_symbol = '$'
                elif voucher.currency == 'EUR':
                    pdf_currency_symbol = '€'

            html_string = render_to_string('finance/receipt_voucher_pdf.html', {
                'voucher': voucher,
                'pdf_currency_symbol': pdf_currency_symbol,
                'now': timezone.now(),
                'roboto_font_path': os.path.join(settings.BASE_DIR, 'static/fonts/Roboto-Regular.ttf')
            })
            
            result = io.BytesIO()
            # Encode correctly for UTF-8 Support
            pdf = pisa.pisaDocument(io.BytesIO(html_string.encode('utf-8')), result)
            
            if not pdf.err:
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{voucher.receipt_no}.pdf"'
                return response
            else:
                logger.error("PDF generation errors in Receipt Vouchers")
                return Response({'error': 'PDF generation failed'}, status=500)
                
        except Exception as e:
            logger.error(f"Error in download_pdf (ReceiptVoucher): {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=500)

class CustomerPartnerViewSet(viewsets.ModelViewSet):
    queryset = CustomerPartner.objects.all().order_by('-created_at')
    serializer_class = CustomerPartnerSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'code', 'email', 'primary_contact']
    filterset_fields = ['type', 'status', 'linked_company']

    def perform_create(self, serializer):
        try:
            partner = serializer.save()
            
            # Log audit trail for partner creation
            content_type = ContentType.objects.get_for_model(CustomerPartner)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=partner.id,
                user=self.request.user,
                action_type='CREATE',
                field_name='created',
                old_value='',
                new_value=f'Customer Partner {partner.name} created'
            )
        except Exception as e:
            logger.error(f"Error creating customer partner: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        try:
            partner = serializer.save()
            
            # Log audit trail for partner update
            content_type = ContentType.objects.get_for_model(CustomerPartner)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=partner.id,
                user=self.request.user,
                action_type='UPDATE',
                field_name='name',
                old_value=partner.name,
                new_value=f'Customer Partner {partner.name} updated'
            )
        except Exception as e:
            logger.error(f"Error updating customer partner: {str(e)}", exc_info=True)
            raise


class EndCustomerViewSet(viewsets.ModelViewSet):
    queryset = EndCustomer.objects.all().order_by('-created_at')
    serializer_class = EndCustomerSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'code', 'email', 'contact_person']
    filterset_fields = ['linked_partner', 'status', 'deal_type']

    def perform_create(self, serializer):
        try:
            customer = serializer.save()
            
            # Log audit trail for end customer creation
            content_type = ContentType.objects.get_for_model(EndCustomer)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=customer.id,
                user=self.request.user,
                action_type='CREATE',
                field_name='created',
                old_value='',
                new_value=f'End Customer {customer.name} created'
            )
        except Exception as e:
            logger.error(f"Error creating end customer: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        try:
            customer = serializer.save()
            
            # Log audit trail for end customer update
            content_type = ContentType.objects.get_for_model(EndCustomer)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=customer.id,
                user=self.request.user,
                action_type='UPDATE',
                field_name='name',
                old_value=customer.name,
                new_value=f'End Customer {customer.name} updated'
            )
        except Exception as e:
            logger.error(f"Error updating end customer: {str(e)}", exc_info=True)
            raise

class FinancialYearViewSet(viewsets.ModelViewSet):
    queryset = FinancialYear.objects.all().order_by('-start_date')
    serializer_class = FinancialYearSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['code', 'label']
    filterset_fields = ['status', 'is_current_fy']

    def perform_create(self, serializer):
        try:
            fy = serializer.save()
            
            # Log audit trail for financial year creation
            content_type = ContentType.objects.get_for_model(FinancialYear)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=fy.id,
                user=self.request.user,
                action_type='CREATE',
                field_name='created',
                old_value='',
                new_value=f'Financial Year {fy.code} created'
            )
        except Exception as e:
            logger.error(f"Error creating financial year: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        try:
            fy = serializer.save()
            
            # Log audit trail for financial year update
            content_type = ContentType.objects.get_for_model(FinancialYear)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=fy.id,
                user=self.request.user,
                action_type='UPDATE',
                field_name='code',
                old_value=fy.code,
                new_value=f'Financial Year {fy.code} updated'
            )
        except Exception as e:
            logger.error(f"Error updating financial year: {str(e)}", exc_info=True)
            raise
