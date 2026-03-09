from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum
from .models import Milestone, MilestoneStatus
from .serializers import MilestoneSerializer
from finance.models import Invoice, InvoiceStatus
from sales_orders.models import SalesOrder
import logging
import datetime
import io
import csv
import xlsxwriter
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from .services import MilestoneService
from finance.serializers import InvoiceSerializer

logger = logging.getLogger(__name__)

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
    def export_pdf(self, request):
        try:
            from django.template.loader import render_to_string
            from django.http import HttpResponse
            from xhtml2pdf import pisa
            import io
            
            queryset = self._apply_filters(request)
            html_string = render_to_string('milestones/report_pdf.html', {'milestones': queryset, 'now': timezone.now()})
            
            result = io.BytesIO()
            pdf = pisa.pisaDocument(io.StringIO(html_string), result)
            
            if not pdf.err:
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Milestones_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
                return response
            else:
                return Response({
                    "status": "error",
                    "message": "PDF generation errors occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in export_pdf: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
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

    @action(detail=False, methods=['get'])
    def categorized(self, request):
        """Return milestones bifurcated into categories:
        - yet_to_due: due date > today + 5 days
        - due_1_5days: due date > today and <= today+5 days
        - due: due today or past due
        - billed: already invoiced milestones
        - all: all milestones from applied filters
        """
        try:
            queryset = self._apply_filters(request)
            today = timezone.now().date()
            soon_cutoff = today + timedelta(days=5)

            yet_to_due = []
            due_1_5days = []
            due = []
            billed = []

            for m in queryset:
                # billed/invoiced first
                if m.invoice or m.status == MilestoneStatus.INVOICED:
                    billed.append(m)
                    continue

                if m.due_date and m.due_date > soon_cutoff:
                    yet_to_due.append(m)
                elif m.due_date and m.due_date > today and m.due_date <= soon_cutoff:
                    due_1_5days.append(m)
                else:
                    # due today or overdue
                    due.append(m)

            data = {
                'yet_to_due': MilestoneSerializer(yet_to_due, many=True, context={'request': request}).data,
                'due_1_5days': MilestoneSerializer(due_1_5days, many=True, context={'request': request}).data,
                'due': MilestoneSerializer(due, many=True, context={'request': request}).data,
                'billed': MilestoneSerializer(billed, many=True, context={'request': request}).data,
                'all': MilestoneSerializer(queryset, many=True, context={'request': request}).data,
            }
            return Response(data)
        except Exception as e:
            logger.error(f"Error in categorized: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def issue_invoice(self, request, pk=None):
        """Trigger invoice creation for a single milestone (manual 'Issue invoice')."""
        try:
            milestone = self.get_object()

            if milestone.status == MilestoneStatus.INVOICED or milestone.invoice:
                return Response({'status': 'already_invoiced', 'invoice': InvoiceSerializer(milestone.invoice, context={'request': request}).data if milestone.invoice else None})

            # create invoice via service
            invoice = MilestoneService.create_invoice_for_milestone(milestone)

            return Response({'status': 'created', 'invoice': InvoiceSerializer(invoice, context={'request': request}).data}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error issuing invoice for milestone {pk}: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        try:
            sales_order_id = request.data.get('sales_order')
            amount = request.data.get('amount', 0)
            
            error = self._validate_milestone_amount(sales_order_id, amount)
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
                    
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in create milestone: {str(e)}", exc_info=True)
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
            logger.error(f"Error in update milestone: {str(e)}", exc_info=True)
            return Response({"error": f"Internal Server Error during update: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    @action(detail=False, methods=['post'])
    def bulk_save(self, request):
        sales_order_id = request.data.get('sales_order')
        milestones_data = request.data.get('milestones', [])

        if not sales_order_id:
            return Response({"error": "Sales Order ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sales_order = SalesOrder.objects.get(pk=sales_order_id)
        except SalesOrder.DoesNotExist:
            return Response({"error": "Sales Order not found"}, status=status.HTTP_404_NOT_FOUND)

        # 1. Validate total amount
        total_amount = sum(Decimal(str(m.get('amount', 0))) for m in milestones_data)
        if abs(total_amount - Decimal(str(sales_order.total_amount))) > Decimal('0.01'):
            return Response({
                "error": f"Total milestone amount ({total_amount}) must equal Sales Order value ({sales_order.total_amount})"
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Track existing milestones to delete ones not in payload
        existing_ids = list(Milestone.objects.filter(sales_order=sales_order).values_list('id', flat=True))
        incoming_ids = [m.get('id') for m in milestones_data if m.get('id')]
        
        to_delete = [mid for mid in existing_ids if mid not in incoming_ids]
        Milestone.objects.filter(id__in=to_delete).delete()

        saved_milestones = []
        invoices_created = 0
        already_invoiced = False
        today = timezone.now().date()
        seven_days_from_now = today + timedelta(days=7)

        from .services import MilestoneService
        
        for m_data in milestones_data:
            milestone_id = m_data.get('id')
            due_date_str = m_data.get('due_date')

            # Parse due_date
            due_date_val = None
            if due_date_str:
                try:
                    if isinstance(due_date_str, str):
                        due_date_val = datetime.datetime.strptime(due_date_str, '%Y-%m-%d').date()
                    else:
                        due_date_val = due_date_str
                except (ValueError, TypeError):
                    pass

            # Determine appropriate status:
            # - If already INVOICED, keep INVOICED
            # - Otherwise, save as DRAFT
            incoming_status = m_data.get('status', MilestoneStatus.DRAFT)
            if incoming_status == MilestoneStatus.INVOICED or incoming_status == 'INVOICED':
                save_status = MilestoneStatus.INVOICED
            else:
                save_status = MilestoneStatus.DRAFT

            # Prepare internal data structure
            payload = {
                'sales_order': sales_order,
                'milestone_no': m_data.get('milestone_no'),
                'period_from': m_data.get('period_from'),
                'period_to': m_data.get('period_to'),
                'due_date': due_date_str,
                'description': m_data.get('description'),
                'qty': m_data.get('qty', 1),
                'rate': m_data.get('rate', 0),
                'amount': m_data.get('amount', 0),
                'status': save_status
            }

            if milestone_id:
                # Preserve INVOICED status if already invoiced
                existing = Milestone.objects.filter(id=milestone_id).first()
                if existing and (existing.status == MilestoneStatus.INVOICED or existing.status == 'INVOICED'):
                    payload.pop('status', None)  # Don't downgrade from INVOICED
                Milestone.objects.filter(id=milestone_id).update(**payload)
                milestone = Milestone.objects.get(id=milestone_id)
            else:
                milestone = Milestone.objects.create(**payload)

            # Auto-create draft invoice if due date is within 7 days and not already invoiced
            if not milestone.invoice and milestone.status != MilestoneStatus.INVOICED and milestone.status != 'INVOICED':
                if due_date_val and due_date_val <= seven_days_from_now:
                    MilestoneService.create_invoice_for_milestone(milestone)
                    invoices_created += 1
            elif getattr(milestone, 'invoice', None) or milestone.status == MilestoneStatus.INVOICED or milestone.status == 'INVOICED':
                already_invoiced = True

            saved_milestones.append(milestone)

        if invoices_created > 0:
            msg = f"Milestones saved as draft. {invoices_created} draft invoice(s) generated (due within 7 days)."
            if already_invoiced:
                msg += " Some milestones were already invoiced."
        elif already_invoiced:
            msg = "Milestones saved. Note: Invoices were already created for these milestones."
        else:
            msg = "Milestones saved as draft. Invoices will be automatically generated 1 week before the due date."

        return Response({
            "message": msg,
            "data": MilestoneSerializer(saved_milestones, many=True).data
        })

    @action(detail=True, methods=['post'])
    def create_invoice(self, request, pk=None):
        from .services import MilestoneService
        milestone = self.get_object()
        if milestone.status == MilestoneStatus.INVOICED:
            return Response({"error": "Invoice already created for this milestone"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            MilestoneService.create_invoice_for_milestone(milestone)
            return Response(MilestoneSerializer(milestone).data)
        except Exception as e:
            logger.error(f"Error in create_invoice action: {str(e)}", exc_info=True)
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
