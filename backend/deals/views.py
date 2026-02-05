from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
import io
import xlsxwriter
from .models import Deal, ImplementationPartner, Product, Customer, DealTypeEntry, AuditTrail, DealAttachment
from .serializers import (
    DealSerializer, ImplementationPartnerSerializer, ProductSerializer, CustomerSerializer,
    DealTypeEntrySerializer, AuditTrailSerializer, DealAttachmentSerializer
)

class ImplementationPartnerViewSet(viewsets.ModelViewSet):
    queryset = ImplementationPartner.objects.all().order_by('name')
    serializer_class = ImplementationPartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

class DealTypeEntryViewSet(viewsets.ModelViewSet):
    queryset = DealTypeEntry.objects.all().order_by('-created_at')
    serializer_class = DealTypeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = DealTypeEntry.objects.all()
        deal_id = self.request.query_params.get('deal_id', None)
        if deal_id:
            queryset = queryset.filter(deal_id=deal_id)
        return queryset.order_by('-created_at')

class AuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditTrail.objects.all().order_by('-timestamp')
    serializer_class = AuditTrailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = AuditTrail.objects.all()
        deal_id = self.request.query_params.get('deal_id', None)
        if deal_id:
            queryset = queryset.filter(deal_id=deal_id)
        return queryset.order_by('-timestamp')

class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all().order_by('-created_at')
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Deal.objects.all().order_by('-created_at')
        
        # Report type filtering
        report_type = self.request.query_params.get('report_type', None)
        if report_type == 'my_deals':
            # Filter by salesperson_name matching user email or username
            queryset = queryset.filter(Q(salesperson_name__icontains=self.request.user.username))
        elif report_type == 'new_this_week':
            from datetime import timedelta
            one_week_ago = timezone.now() - timedelta(days=7)
            queryset = queryset.filter(created_at__gte=one_week_ago)
        elif report_type == 'closing_this_month':
            now = timezone.now()
            queryset = queryset.filter(
                expected_close_date__year=now.year,
                expected_close_date__month=now.month
            )
        elif report_type == 'unread':
            queryset = queryset.filter(is_read=False)

        # Simple filtering
        stage = self.request.query_params.get('stage', None)
        if stage:
            queryset = queryset.filter(stage=stage)
            
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(deal_name__icontains=search) |
                Q(deal_id__icontains=search) |
                Q(customer__name__icontains=search)
            )
                       
        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_read:
            instance.is_read = True
            instance.save(update_fields=['is_read'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Override update to create audit trail entries"""
        instance = self.get_object()
        old_data = {field: getattr(instance, field) for field in ['deal_name', 'deal_amount', 'currency', 'stage', 'customer_id', 'end_customer', 'salesperson_name', 'project_manager']}
        
        # Auto-fetch FX rate if currency is USD or EURO
        if 'currency' in request.data:
            currency = request.data.get('currency')
            if currency == 'USD':
                request.data['fx_rate'] = 83.50  # Mock rate, replace with actual API call
            elif currency == 'EURO':
                request.data['fx_rate'] = 90.25  # Mock rate, replace with actual API call
            else:
                request.data['fx_rate'] = 1.0
        
        response = super().update(request, *args, **kwargs)
        
        # Create audit trail entries for changed fields
        instance.refresh_from_db()
        for field, old_value in old_data.items():
            new_value = getattr(instance, field)
            if str(old_value) != str(new_value):
                AuditTrail.objects.create(
                    deal=instance,
                    user=request.user,
                    field_name=field,
                    old_value=str(old_value) if old_value is not None else '',
                    new_value=str(new_value) if new_value is not None else '',
                    action_type=AuditTrail.ActionType.UPDATE
                )
        
        return response

    @action(detail=True, methods=['post'])
    def sync_hubspot(self, request, pk=None):
        deal = self.get_object()
        # Mocking HubSpot Sync
        try:
            import random
            if not deal.hubspot_id:
                deal.hubspot_id = f"HS-{random.randint(100000, 999999)}"
            
            deal.last_synced_at = timezone.now()
            deal.save()
            
            return Response({
                "status": "success",
                "message": f"Deal '{deal.deal_name}' synced with HubSpot successfully.",
                "hubspot_id": deal.hubspot_id,
                "synced_at": deal.last_synced_at
            })
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"HubSpot sync failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        deals = self.get_queryset()
        
        # Apply Filters
        search_query = request.query_params.get('search', '')
        if search_query:
            deals = deals.filter(
                Q(deal_name__icontains=search_query) |
                Q(customer_name__icontains=search_query) |
                Q(deal_id__icontains=search_query)
            )

        deal_id = request.query_params.get('deal_id')
        if deal_id:
            deals = deals.filter(deal_id__icontains=deal_id)
            
        company = request.query_params.get('company')
        if company:
            deals = deals.filter(company=company)

        lead_no = request.query_params.get('lead_no')
        if lead_no:
            deals = deals.filter(lead__lead_no__icontains=lead_no)

        stage = request.query_params.get('stage')
        if stage:
            deals = deals.filter(stage=stage)

        currency = request.query_params.get('currency')
        if currency:
            deals = deals.filter(currency=currency)

        # Date Filtering
        period = request.query_params.get('period')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if period:
            today = timezone.localdate()
            if period == 'last_month':
                first = today.replace(day=1)
                last_month = first - timedelta(days=1)
                start = last_month.replace(day=1)
                deals = deals.filter(deal_date__range=[start, last_month])
            elif period == 'last_3_months':
                start = today - timedelta(days=90)
                deals = deals.filter(deal_date__gte=start)
            elif period == 'last_6_months':
                start = today - timedelta(days=180)
                deals = deals.filter(deal_date__gte=start)
            elif period == 'last_year':
                last_year = today.year - 1
                deals = deals.filter(deal_date__year=last_year)
            elif period == 'custom' and start_date and end_date:
                deals = deals.filter(deal_date__range=[start_date, end_date])
                
        # Other string filters
        for field in ['customer_name', 'end_customer', 'client_type', 
                      'inside_salesperson', 'inside_sales_head', 
                      'salesperson_name', 'sales_head', 
                      'project_manager', 'project_manager_head']:
            val = request.query_params.get(field)
            if val:
                kwargs = {f'{field}__icontains': val}
                deals = deals.filter(**kwargs)

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Deals Report")
        
        # Header formatting
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#FF6B00',
            'font_color': 'white',
            'border': 1
        })
        
        headers = [
            'Deal ID', 'Deal Date', 'Project Name', 'Company', 'Lead No.', 'Stage',
            'Currency', 'Amount', 'Type', 'Customer/Partner Name', 'Customer Email',
            'End Customer', 'Client Type', 'Inside Salesperson', 'Inside Sales Head',
            'Salesperson', 'Sales Head', 'Proj. Manager', 'PM Head',
            'Exp. Close Date', 'Remarks/Description', 'Won/Lost Reason',
            'HubSpot ID', 'Last Synced'
        ]
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
            
        for row, deal in enumerate(deals, start=1):
            worksheet.write(row, 0, deal.deal_id)
            worksheet.write(row, 1, deal.deal_date.strftime('%Y-%m-%d') if deal.deal_date else "N/A")
            worksheet.write(row, 2, deal.deal_name)
            worksheet.write(row, 3, deal.company)
            worksheet.write(row, 4, deal.lead.lead_no if deal.lead else "—")
            worksheet.write(row, 5, deal.stage)
            worksheet.write(row, 6, deal.currency)
            worksheet.write(row, 7, float(deal.deal_amount))
            worksheet.write(row, 8, deal.deal_type if deal.deal_type else "—")
            worksheet.write(row, 9, deal.customer.name if deal.customer else "—")
            worksheet.write(row, 10, deal.customer_email if deal.customer_email else "—")
            worksheet.write(row, 11, deal.end_customer if deal.end_customer else "—")
            worksheet.write(row, 12, deal.client_type if deal.client_type else "—")
            worksheet.write(row, 13, deal.inside_salesperson if deal.inside_salesperson else "—")
            worksheet.write(row, 14, deal.inside_sales_head if deal.inside_sales_head else "—")
            worksheet.write(row, 15, deal.salesperson_name if deal.salesperson_name else "—")
            worksheet.write(row, 16, deal.sales_head if deal.sales_head else "—")
            worksheet.write(row, 17, deal.project_manager if deal.project_manager else "—")
            worksheet.write(row, 18, deal.project_manager_head if deal.project_manager_head else "—")
            worksheet.write(row, 19, str(deal.expected_close_date) if deal.expected_close_date else "N/A")
            worksheet.write(row, 20, deal.remark if deal.remark else "—")
            worksheet.write(row, 21, deal.won_lost_reason if deal.won_lost_reason else "—")
            worksheet.write(row, 22, deal.hubspot_id if deal.hubspot_id else "—")
            worksheet.write(row, 23, str(deal.last_synced_at) if deal.last_synced_at else "Not Synced")
            
        workbook.close()
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Deals_Report_{timezone.now().strftime("%Y%m%d")}.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        try:
            from django.template.loader import render_to_string
            from xhtml2pdf import pisa
            
            deals = self.get_queryset()
            html_string = render_to_string('deals/report_pdf.html', {'deals': deals, 'now': timezone.now()})
            
            result = io.BytesIO()
            pisa_status = pisa.CreatePDF(html_string, dest=result)
            
            if pisa_status.err:
                return Response({
                    "status": "error",
                    "message": "PDF generation error occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Deals_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def export_single_pdf(self, request, pk=None):
        try:
            from django.template.loader import render_to_string
            from xhtml2pdf import pisa
            
            filename = f"Deal_{deal.deal_id}_{timezone.now().strftime('%Y%m%d')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Deal PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def upload_attachment(self, request, pk=None):
        instance = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        attachment = DealAttachment.objects.create(
            deal=instance,
            file=file,
            filename=file.name
        )
        serializer = DealAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def delete_attachment(self, request, pk=None):
        attachment_id = request.query_params.get('attachment_id')
        if not attachment_id:
            return Response({'error': 'attachment_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            attachment = DealAttachment.objects.get(id=attachment_id, deal_id=pk)
            attachment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DealAttachment.DoesNotExist:
            return Response({'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export deal data as CSV."""
        import csv
        from io import StringIO

        deals = self.get_queryset()

        # Apply Filters
        search_query = request.query_params.get('search', '')
        if search_query:
            deals = deals.filter(
                Q(deal_name__icontains=search_query) |
                Q(customer_name__icontains=search_query) |
                Q(deal_id__icontains=search_query)
            )

        deal_id = request.query_params.get('deal_id')
        if deal_id:
            deals = deals.filter(deal_id__icontains=deal_id)
            
        company = request.query_params.get('company')
        if company:
            deals = deals.filter(company=company)

        lead_no = request.query_params.get('lead_no')
        if lead_no:
            deals = deals.filter(lead__lead_no__icontains=lead_no)

        stage = request.query_params.get('stage')
        if stage:
            deals = deals.filter(stage=stage)

        currency = request.query_params.get('currency')
        if currency:
            deals = deals.filter(currency=currency)

        # Date Filtering
        period = request.query_params.get('period')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if period:
            today = timezone.localdate()
            if period == 'last_month':
                first = today.replace(day=1)
                last_month = first - timedelta(days=1)
                start = last_month.replace(day=1)
                deals = deals.filter(deal_date__range=[start, last_month])
            elif period == 'last_3_months':
                start = today - timedelta(days=90)
                deals = deals.filter(deal_date__gte=start)
            elif period == 'last_6_months':
                start = today - timedelta(days=180)
                deals = deals.filter(deal_date__gte=start)
            elif period == 'last_year':
                last_year = today.year - 1
                deals = deals.filter(deal_date__year=last_year)
            elif period == 'custom' and start_date and end_date:
                deals = deals.filter(deal_date__range=[start_date, end_date])

        # Other string filters
        for field in ['customer_name', 'end_customer', 'client_type', 
                      'inside_salesperson', 'inside_sales_head', 
                      'salesperson_name', 'sales_head', 
                      'project_manager', 'project_manager_head']:
            val = request.query_params.get(field)
            if val:
                kwargs = {f'{field}__icontains': val}
                deals = deals.filter(**kwargs)

        buf = StringIO()
        writer = csv.writer(buf)

        headers = [
            'Deal ID', 'Deal Date', 'Project Name', 'Company', 'Lead No.', 'Stage',
            'Currency', 'Amount', 'Type', 'Customer/Partner Name', 'Customer Email',
            'End Customer', 'Client Type', 'Inside Salesperson', 'Inside Sales Head',
            'Salesperson', 'Sales Head', 'Proj. Manager', 'PM Head',
            'Exp. Close Date', 'Remarks/Description', 'Won/Lost Reason',
            'HubSpot ID', 'Last Synced'
        ]
        writer.writerow(headers)

        for deal in deals:
            writer.writerow([
                deal.deal_id,
                deal.deal_date.strftime('%Y-%m-%d') if deal.deal_date else "N/A",
                deal.deal_name,
                deal.company,
                deal.lead.lead_no if deal.lead else "—",
                deal.stage,
                deal.currency,
                float(deal.deal_amount) if deal.deal_amount is not None else "",
                deal.deal_type if deal.deal_type else "—",
                deal.customer.name if deal.customer else "—",
                deal.customer_email if deal.customer_email else "—",
                deal.end_customer if deal.end_customer else "—",
                deal.client_type if deal.client_type else "—",
                deal.inside_salesperson if deal.inside_salesperson else "—",
                deal.inside_sales_head if deal.inside_sales_head else "—",
                deal.salesperson_name if deal.salesperson_name else "—",
                deal.sales_head if deal.sales_head else "—",
                deal.project_manager if deal.project_manager else "—",
                deal.project_manager_head if deal.project_manager_head else "—",
                str(deal.expected_close_date) if deal.expected_close_date else "N/A",
                deal.remark if deal.remark else "—",
                deal.won_lost_reason if deal.won_lost_reason else "—",
                deal.hubspot_id if deal.hubspot_id else "—",
                str(deal.last_synced_at) if deal.last_synced_at else "Not Synced"
            ])

        buf.seek(0)
        response = HttpResponse(buf.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="Deals_Report_{timezone.now().strftime("%Y%m%d")}.csv"'
        return response
