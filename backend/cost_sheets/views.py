from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
import csv
import io
import xlsxwriter
from .models import CostSheet, CostSheetStatus, CostSheetAttachment
from .serializers import CostSheetSerializer, CostSheetAttachmentSerializer
from deals.models import AuditTrail

class CostSheetViewSet(viewsets.ModelViewSet):
    queryset = CostSheet.objects.all()
    serializer_class = CostSheetSerializer
    
    def perform_create(self, serializer):
        """Create cost sheet and log audit trail"""
        cost_sheet = serializer.save()
        
        # Create audit log for creation
        content_type = ContentType.objects.get_for_model(CostSheet)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=cost_sheet.id,
            user=self.request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Cost Sheet {cost_sheet.cost_sheet_no} created'
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        instance = self.get_object()
        if instance.status != CostSheetStatus.SUBMITTED:
            return Response({'error': 'Only submitted cost sheets can be approved'}, status=status.HTTP_400_BAD_REQUEST)
        
        instance.status = CostSheetStatus.APPROVED
        instance.save()
        
        # Log audit trail for approval
        content_type = ContentType.objects.get_for_model(CostSheet)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=instance.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value='SUBMITTED',
            new_value='APPROVED'
        )
        
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        instance = self.get_object()
        if instance.status != CostSheetStatus.SUBMITTED:
            return Response({'error': 'Only submitted cost sheets can be rejected'}, status=status.HTTP_400_BAD_REQUEST)
        
        comments = request.data.get('comments')
        if not comments:
            return Response({'error': 'Rejection comments are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        instance.status = CostSheetStatus.REJECTED
        instance.approval_comments = comments
        instance.save()
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def revert(self, request, pk=None):
        instance = self.get_object()
        if instance.status != CostSheetStatus.SUBMITTED:
            return Response({'error': 'Only submitted cost sheets can be reverted'}, status=status.HTTP_400_BAD_REQUEST)
        
        comments = request.data.get('comments')
        if not comments:
            return Response({'error': 'Revert comments are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        instance.status = CostSheetStatus.REVERTED
        instance.revert_comments = comments
        instance.save()
        return Response({'status': 'reverted'})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status not in [CostSheetStatus.PENDING, CostSheetStatus.REVERTED]:
            return Response({'error': 'Editing is restricted for this cost sheet status'}, status=status.HTTP_403_FORBIDDEN)
        
        # Track original values
        original_data = {
            'status': instance.status,
            'total_estimated_price': str(instance.total_estimated_price) if instance.total_estimated_price else '',
            'total_estimated_margin': str(instance.total_estimated_margin) if instance.total_estimated_margin else '',
        }
        
        result = super().update(request, *args, **kwargs)
        
        # Log changes
        content_type = ContentType.objects.get_for_model(CostSheet)
        new_data = {
            'status': instance.status,
            'total_estimated_price': str(instance.total_estimated_price) if instance.total_estimated_price else '',
            'total_estimated_margin': str(instance.total_estimated_margin) if instance.total_estimated_margin else '',
        }
        
        for field, old_value in original_data.items():
            new_value = new_data[field]
            if str(old_value) != str(new_value):
                AuditTrail.objects.create(
                    content_type=content_type,
                    object_id=instance.id,
                    user=request.user,
                    action_type='UPDATE',
                    field_name=field,
                    old_value=str(old_value),
                    new_value=str(new_value)
                )
        
        return result

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status not in [CostSheetStatus.PENDING, CostSheetStatus.REVERTED]:
            return Response({'error': 'Editing is restricted for this cost sheet status'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def upload_attachment(self, request, pk=None):
        instance = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        attachment = CostSheetAttachment.objects.create(
            cost_sheet=instance,
            file=file,
            filename=file.name
        )
        serializer = CostSheetAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def delete_attachment(self, request, pk=None):
        attachment_id = request.query_params.get('attachment_id')
        if not attachment_id:
            return Response({'error': 'attachment_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            attachment = CostSheetAttachment.objects.get(id=attachment_id, cost_sheet_id=pk)
            attachment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CostSheetAttachment.DoesNotExist:
            return Response({'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def export_report(self, request):
        period = request.query_params.get('period')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # Filters
        cs_number = request.query_params.get('cs_number')
        lead_no = request.query_params.get('lead_no')
        deal_no = request.query_params.get('deal_no')
        customer_name = request.query_params.get('customer_name')
        project_name = request.query_params.get('project_name')
        status_filter = request.query_params.get('status')

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
            start_date = datetime(last_year, 1, 1).date()
            end_date = datetime(last_year, 12, 31).date()
        elif period == 'last_financial_year':
            if today.month >= 4:
                start_year = today.year - 1
            else:
                start_year = today.year - 2
            start_date = datetime(start_year, 4, 1).date()
            end_date = datetime(start_year + 1, 3, 31).date()
        elif start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)

        queryset = self.queryset.select_related('lead', 'deal')
        
        # Apply Date Filters
        if start_date:
            queryset = queryset.filter(cost_sheet_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(cost_sheet_date__lte=end_date)
            
        # Apply Text Filters
        if cs_number:
            queryset = queryset.filter(cost_sheet_no__icontains=cs_number)
        if lead_no:
            queryset = queryset.filter(lead__lead_no__icontains=lead_no)
        if deal_no:
            queryset = queryset.filter(deal__deal_id__icontains=deal_no)
        if customer_name:
            queryset = queryset.filter(lead__customer_name__icontains=customer_name)
        if project_name:
            queryset = queryset.filter(lead__project_name__icontains=project_name)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="cost_sheets_report_{today}.csv"'

        writer = csv.writer(response)
        writer.writerow(['CS Number', 'Lead Number', 'Deal Number', 'Customer', 'Project', 'Date', 'Status', 'Currency', 'Margin %', 'Est. Margin', 'Total Price'])
        
        for cs in queryset:
            margin_pct = 0
            if cs.total_estimated_price and cs.total_estimated_price > 0:
                margin_pct = round((cs.total_estimated_margin / cs.total_estimated_price) * 100, 2)

            writer.writerow([
                cs.cost_sheet_no,
                cs.lead.lead_no if cs.lead else '—',
                cs.deal.deal_id if cs.deal else '—',
                cs.lead.customer_name if cs.lead else '—',
                cs.lead.project_name if cs.lead else '—',
                cs.cost_sheet_date.strftime('%Y-%m-%d') if cs.cost_sheet_date else '—',
                cs.status,
                cs.deal.currency if cs.deal and cs.deal.currency else '—',
                f"{margin_pct}%",
                cs.total_estimated_margin,
                cs.total_estimated_price
            ])
            
        return response

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        period = request.query_params.get('period')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # Filters
        cs_number = request.query_params.get('cs_number')
        lead_no = request.query_params.get('lead_no')
        deal_no = request.query_params.get('deal_no')
        customer_name = request.query_params.get('customer_name')
        project_name = request.query_params.get('project_name')
        status_filter = request.query_params.get('status')

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
            start_date = datetime(last_year, 1, 1).date()
            end_date = datetime(last_year, 12, 31).date()
        elif period == 'last_financial_year':
            if today.month >= 4:
                start_year = today.year - 1
            else:
                start_year = today.year - 2
            start_date = datetime(start_year, 4, 1).date()
            end_date = datetime(start_year + 1, 3, 31).date()
        elif start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)

        queryset = self.queryset.select_related('lead', 'deal')
        
        # Apply Date Filters
        if start_date:
            queryset = queryset.filter(cost_sheet_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(cost_sheet_date__lte=end_date)
            
        # Apply Text Filters
        if cs_number:
            queryset = queryset.filter(cost_sheet_no__icontains=cs_number)
        if lead_no:
            queryset = queryset.filter(lead__lead_no__icontains=lead_no)
        if deal_no:
            queryset = queryset.filter(deal__deal_id__icontains=deal_no)
        if customer_name:
            queryset = queryset.filter(lead__customer_name__icontains=customer_name)
        if project_name:
            queryset = queryset.filter(lead__project_name__icontains=project_name)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Cost Sheets Report")

        # Header formatting
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#FF6B00',
            'font_color': 'white',
            'border': 1
        })

        headers = ['CS Number', 'Lead Number', 'Deal Number', 'Customer', 'Project', 'Date', 'Status', 'Currency', 'Margin %', 'Est. Margin', 'Total Price']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        for row, cs in enumerate(queryset, start=1):
            margin_pct = 0
            if cs.total_estimated_price and cs.total_estimated_price > 0:
                margin_pct = float(round((cs.total_estimated_margin / cs.total_estimated_price) * 100, 2))

            worksheet.write(row, 0, cs.cost_sheet_no)
            worksheet.write(row, 1, cs.lead.lead_no if cs.lead else '—')
            worksheet.write(row, 2, cs.deal.deal_id if cs.deal else '—')
            worksheet.write(row, 3, cs.lead.customer_name if cs.lead else '—')
            worksheet.write(row, 4, cs.lead.project_name if cs.lead else '—')
            worksheet.write(row, 5, cs.cost_sheet_date.strftime('%Y-%m-%d') if cs.cost_sheet_date else '—')
            worksheet.write(row, 6, cs.status)
            worksheet.write(row, 7, cs.deal.currency if cs.deal and cs.deal.currency else '—')
            
            # Format numbers properly
            worksheet.write(row, 8, f"{margin_pct}%")
            worksheet.write(row, 9, float(cs.total_estimated_margin))
            worksheet.write(row, 10, float(cs.total_estimated_price))

        workbook.close()
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="cost_sheets_report_{today}.xlsx"'
        return response

    @action(detail=True, methods=['get'])
    def export_single_excel(self, request, pk=None):
        cost_sheet = self.get_object()
        
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Cost Sheet")

        # Header formatting
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#FF6B00',
            'font_color': 'white',
            'border': 1
        })

        headers = ['CS Number', 'Lead Number', 'Deal Number', 'Customer', 'Project', 'Date', 'Status', 'Currency', 'Margin %', 'Est. Margin', 'Total Price']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        margin_pct = 0
        if cost_sheet.total_estimated_price and cost_sheet.total_estimated_price > 0:
            margin_pct = float(round((cost_sheet.total_estimated_margin / cost_sheet.total_estimated_price) * 100, 2))

        worksheet.write(1, 0, cost_sheet.cost_sheet_no)
        worksheet.write(1, 1, cost_sheet.lead.lead_no if cost_sheet.lead else '—')
        worksheet.write(1, 2, cost_sheet.deal.deal_id if cost_sheet.deal else '—')
        worksheet.write(1, 3, cost_sheet.lead.customer_name if cost_sheet.lead else '—')
        worksheet.write(1, 4, cost_sheet.lead.project_name if cost_sheet.lead else '—')
        worksheet.write(1, 5, cost_sheet.cost_sheet_date.strftime('%Y-%m-%d') if cost_sheet.cost_sheet_date else '—')
        worksheet.write(1, 6, cost_sheet.status)
        worksheet.write(1, 7, cost_sheet.deal.currency if cost_sheet.deal and cost_sheet.deal.currency else '—')
        worksheet.write(1, 8, f"{margin_pct}%")
        worksheet.write(1, 9, float(cost_sheet.total_estimated_margin))
        worksheet.write(1, 10, float(cost_sheet.total_estimated_price))

        workbook.close()
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="CostSheet_{cost_sheet.cost_sheet_no}.xlsx"'
        return response
