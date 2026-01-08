from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
import csv
from .models import CostSheet, CostSheetStatus, CostSheetAttachment
from .serializers import CostSheetSerializer, CostSheetAttachmentSerializer

class CostSheetViewSet(viewsets.ModelViewSet):
    queryset = CostSheet.objects.all()
    serializer_class = CostSheetSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        instance = self.get_object()
        if instance.status != CostSheetStatus.SUBMITTED:
            return Response({'error': 'Only submitted cost sheets can be approved'}, status=status.HTTP_400_BAD_REQUEST)
        
        instance.status = CostSheetStatus.APPROVED
        instance.save()
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
        return super().update(request, *args, **kwargs)

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

        queryset = self.queryset.select_related('lead')
        if start_date:
            queryset = queryset.filter(cost_sheet_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(cost_sheet_date__lte=end_date)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="cost_sheets_report_{today}.csv"'

        writer = csv.writer(response)
        writer.writerow(['CS Number', 'Lead Number', 'Customer', 'Project', 'Date', 'Status', 'Total Price'])
        
        for cs in queryset:
            writer.writerow([
                cs.cost_sheet_no,
                cs.lead.lead_no if cs.lead else '—',
                cs.lead.customer_name if cs.lead else '—',
                cs.lead.project_name if cs.lead else '—',
                cs.cost_sheet_date.strftime('%Y-%m-%d') if cs.cost_sheet_date else '—',
                cs.status,
                cs.total_estimated_price
            ])
            
        return response
