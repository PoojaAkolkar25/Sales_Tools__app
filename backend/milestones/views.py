from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Milestone, MilestoneStatus
from .serializers import MilestoneSerializer
from finance.models import Invoice, InvoiceStatus
from sales_orders.models import SalesOrder
import datetime
import io
import csv
import xlsxwriter
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal, InvalidOperation

class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['milestone_no', 'description', 'sales_order__so_number']

    def get_queryset(self):
        queryset = super().get_queryset()
        customer_id = self.request.query_params.get('customer')
        sales_order_id = self.request.query_params.get('sales_order')
        
        if customer_id and customer_id.isdigit():
            queryset = queryset.filter(sales_order__customer_id=customer_id)
        if sales_order_id and sales_order_id.isdigit():
            queryset = queryset.filter(sales_order_id=sales_order_id)
            
        return queryset

    def _apply_filters(self, request):
        queryset = Milestone.objects.all().select_related('sales_order', 'sales_order__customer', 'invoice')
        
        # Period filtering
        period = request.query_params.get('period')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        today = timezone.now().date()
        
        start_date = None
        end_date = None

        if period == 'last_month':
            first_of_this_month = today.replace(day=1)
            end_date = first_of_this_month - timedelta(days=1)
            start_date = end_date.replace(day=1)
        elif period == 'last_3_months':
            first_of_this_month = today.replace(day=1)
            end_date = first_of_this_month - timedelta(days=1)
            temp_date = end_date - timedelta(days=60)
            start_date = temp_date.replace(day=1)
        elif period == 'last_6_months':
            first_of_this_month = today.replace(day=1)
            end_date = first_of_this_month - timedelta(days=1)
            temp_date = end_date - timedelta(days=150)
            start_date = temp_date.replace(day=1)
        elif period == 'last_year':
            last_year = today.year - 1
            start_date = datetime.date(last_year, 1, 1)
            end_date = datetime.date(last_year, 12, 31)
        elif period == 'last_financial_year':
            if today.month >= 4:
                start_year = today.year - 1
            else:
                start_year = today.year - 2
            start_date = datetime.date(start_year, 4, 1)
            end_date = datetime.date(start_year + 1, 3, 31)
        elif start_date_str and end_date_str:
            try:
                start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        if start_date:
            queryset = queryset.filter(due_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(due_date__lte=end_date)

        # Field filtering
        milestone_no = request.query_params.get('milestone_no')
        so_number = request.query_params.get('so_number')
        customer_name = request.query_params.get('customer_name')
        status = request.query_params.get('status')

        if milestone_no:
            queryset = queryset.filter(milestone_no__icontains=milestone_no)
        if so_number:
            queryset = queryset.filter(sales_order__so_number__icontains=so_number)
        if customer_name:
            queryset = queryset.filter(sales_order__customer__name__icontains=customer_name)
        if status:
            queryset = queryset.filter(status=status)

        return queryset

    @action(detail=False, methods=['get'])
    def export_report(self, request):
        queryset = self._apply_filters(request)
        today = timezone.now().date()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="milestones_report_{today}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Milestone No', 'Description', 'Sales Order', 'Customer', 'Due Date', 'Amount', 'Status', 'Invoice No'])
        
        for m in queryset:
            writer.writerow([
                m.milestone_no,
                m.description,
                m.sales_order.so_number if m.sales_order else '—',
                m.sales_order.customer.name if m.sales_order and m.sales_order.customer else '—',
                m.due_date.strftime('%Y-%m-%d') if m.due_date else '—',
                m.amount,
                m.status,
                m.invoice.invoice_no if m.invoice else '—'
            ])
            
        return response

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        queryset = self._apply_filters(request)
        today = timezone.now().date()
        
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Milestones Report")

        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#FF6B00',
            'font_color': 'white',
            'border': 1
        })

        headers = ['Milestone No', 'Description', 'Sales Order', 'Customer', 'Due Date', 'Amount', 'Status', 'Invoice No']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        for row, m in enumerate(queryset, start=1):
            worksheet.write(row, 0, m.milestone_no)
            worksheet.write(row, 1, m.description)
            worksheet.write(row, 2, m.sales_order.so_number if m.sales_order else '—')
            worksheet.write(row, 3, m.sales_order.customer.name if m.sales_order and m.sales_order.customer else '—')
            worksheet.write(row, 4, m.due_date.strftime('%Y-%m-%d') if m.due_date else '—')
            worksheet.write(row, 5, float(m.amount))
            worksheet.write(row, 6, m.status)
            worksheet.write(row, 7, m.invoice.invoice_no if m.invoice else '—')

        workbook.close()
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="milestones_report_{today}.xlsx"'
        return response

    def _validate_milestone_amount(self, sales_order_id, amount, instance=None):
        if not sales_order_id:
            return None

        try:
            so = SalesOrder.objects.get(pk=sales_order_id)
        except SalesOrder.DoesNotExist:
            return f"Sales Order with ID {sales_order_id} does not exist."

        # Handle empty/falsy amount
        if amount == "" or amount is None:
            amount = Decimal('0')
            
        try:
            amount_dec = Decimal(str(amount))
        except (ValueError, TypeError, InvalidOperation):
            return f"Invalid amount format: {amount}"

        queryset = Milestone.objects.filter(sales_order=so)
        if instance:
            queryset = queryset.exclude(pk=instance.pk)
            
        existing_total = queryset.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        new_total = Decimal(str(existing_total)) + amount_dec
        
        if new_total > Decimal(str(so.total_amount)):
            return f"Total milestones amount ({new_total}) exceeds Sales Order value ({so.total_amount})"
        return None

    def create(self, request, *args, **kwargs):
        try:
            sales_order_id = request.data.get('sales_order')
            amount = request.data.get('amount', 0)
            
            error = self._validate_milestone_amount(sales_order_id, amount)
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
                    
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return Response({"error": f"Internal Server Error during creation: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            sales_order_id = request.data.get('sales_order') or instance.sales_order_id
            amount = request.data.get('amount', instance.amount)
            
            error = self._validate_milestone_amount(sales_order_id, amount, instance=instance)
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
                
            return super().update(request, *args, **kwargs)
        except Exception as e:
            return Response({"error": f"Internal Server Error during update: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def create_invoice(self, request, pk=None):
        milestone = self.get_object()
        
        if milestone.status == MilestoneStatus.INVOICED:
            return Response({"error": "Invoice already created for this milestone"}, status=status.HTTP_400_BAD_REQUEST)
            
        sales_order = milestone.sales_order
        
        # Try to find a Lead to link to the Invoice
        lead = None
        
        # 1. Check if Sales Order has linked Estimates
        estimates = sales_order.estimates.all()
        if estimates.exists():
             estimate = estimates.first()
             # Estimates -> CostSheet -> Lead
             if estimate.cost_sheet and estimate.cost_sheet.lead:
                 lead = estimate.cost_sheet.lead
        
        if not lead and sales_order.customer:
             # 2. Try to find Lead via Deals associated with this Customer
             customer_deals = sales_order.customer.deals.all()
             if customer_deals.exists():
                 latest_deal = customer_deals.order_by('-created_at').first()
                 if latest_deal and latest_deal.lead:
                     lead = latest_deal.lead
             
             if not lead:
                 # 3. Try to find Lead by Customer Name as fallback
                 from leads.models import Lead
                 lead = Lead.objects.filter(customer_name__iexact=sales_order.customer.name).first()

        if not lead:
             # 4. Auto-create Lead if missing (Final Fallback)
             try:
                 from leads.models import Lead
                 import time
                 timestamp = int(time.time())
                 new_lead_no = f"L-AUTO-{timestamp}"
                 
                 customer_name = sales_order.customer.name if sales_order.customer else sales_order.customer_name
                 if not customer_name:
                     customer_name = "Unknown Customer"

                 lead = Lead.objects.create(
                    lead_no=new_lead_no,
                    customer_name=customer_name,
                    project_name=f"Generated from SO {sales_order.so_number}",
                    sales_person=sales_order.assigned_to.username if sales_order.assigned_to else 'System'
                 )
             except Exception as e:
                  return Response({"error": f"Failed to auto-generate Lead for Invoice: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        from finance.services import InvoiceService
        from finance.models import Invoice, InvoiceLineItem, InvoiceStatus, CompanyProfile
        import datetime
        
        # Generate Invoice
        new_invoice_no = InvoiceService.generate_invoice_number()
        
        try:
            # Prepare line items for tax calculation
            line_items_data = [{
                'type': 'Service',
                'description': f"{milestone.milestone_no}: {milestone.description}",
                'hsn_sac': '998311',
                'quantity': milestone.qty or 1,
                'rate': milestone.rate or 0,
                'discount': 0,
                'gst_rate': 18
            }]
            
            # Prepare dummy invoice_data for calculation (billing/shipping handles might needed)
            invoice_data = {
                'lead': lead.id if lead else None,
                'is_gst_applicable': True,
                'customer_state': lead.state.id if lead and lead.state else None
            }
            
            # Use fallback state if lead doesn't have one
            if not invoice_data['customer_state'] and sales_order.customer and sales_order.customer.state:
                invoice_data['customer_state'] = sales_order.customer.state.id

            calc_results = InvoiceService.calculate_taxes(invoice_data, line_items_data)
            
            invoice = Invoice.objects.create(
                invoice_no=new_invoice_no,
                invoice_date=datetime.date.today(),
                due_date=milestone.due_date or datetime.date.today(),
                lead=lead, 
                billing_address=sales_order.billing_address,
                shipping_address=sales_order.shipping_address,
                currency=sales_order.currency,
                invoice_type=calc_results['invoice_type'],
                subtotal=calc_results['subtotal'],
                total_discount=calc_results['total_discount'],
                taxable_amount=calc_results['taxable_amount'],
                total_tax=calc_results['total_tax'],
                sales_tax_rate=calc_results['sales_tax_rate'],
                sales_tax_amount=calc_results['sales_tax_amount'],
                round_off=calc_results['round_off'],
                total_amount=calc_results['total_amount'],
                open_balance=calc_results['total_amount'],
                grand_total_words=calc_results['grand_total_words'],
                status=InvoiceStatus.DRAFT
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
            
            milestone.invoice = invoice
            milestone.status = MilestoneStatus.INVOICED
            milestone.save()
            
            return Response(MilestoneSerializer(milestone).data)
            
        except Exception as e:
            import traceback
            with open("debug_invoice_error.txt", "w") as f:
                f.write(str(e) + "\n" + traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        from .services import MilestoneService
        milestone = self.get_object()
        try:
            pdf_content = MilestoneService.generate_pdf(milestone)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="milestone_{milestone.milestone_no}.pdf"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
