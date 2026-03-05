from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.http import HttpResponse
import io
import xlsxwriter
import logging
from .models import Deal, ImplementationPartner, Product, Customer, DealTypeEntry, AuditTrail, DealAttachment
from .serializers import (
    DealSerializer, ImplementationPartnerSerializer,
    ProductSerializer, CustomerSerializer, DealTypeEntrySerializer,
    AuditTrailSerializer, DealAttachmentSerializer
)

logger = logging.getLogger(__name__)

class ImplementationPartnerViewSet(viewsets.ModelViewSet):
    queryset = ImplementationPartner.objects.all().order_by('name')
    serializer_class = ImplementationPartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            serializer.save()
        except Exception as e:
            logger.error(f"Error creating product: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        try:
            serializer.save()
        except Exception as e:
            logger.error(f"Error updating product: {str(e)}", exc_info=True)
            raise

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            serializer.save()
        except Exception as e:
            logger.error(f"Error creating customer (deals): {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        try:
            serializer.save()
        except Exception as e:
            logger.error(f"Error updating customer (deals): {str(e)}", exc_info=True)
            raise

class DealTypeEntryViewSet(viewsets.ModelViewSet):
    queryset = DealTypeEntry.objects.all().order_by('created_at')
    serializer_class = DealTypeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

class AuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditTrail.objects.all().order_by('-timestamp')
    serializer_class = AuditTrailSerializer
    permission_classes = [permissions.IsAuthenticated]

class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all().order_by('-created_at')
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Deal.objects.all().order_by('-created_at')
        
        # Report type filtering
        report_type = self.request.query_params.get('report_type', None)
        if report_type == 'my_deals':
            # Note: deal_owner field was removed from Deal model. 
            # You might want to filter by salesperson or update this logic.
            # For now, returning all deals or filter by salesperson_name if applicable.
            pass
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
            logger.error(f"Error in sync_hubspot (DealViewSet): {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"HubSpot sync failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        deals = self.get_queryset()
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Deals Report")
        
        # Header formatting
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#0066CC',
            'font_color': 'white',
            'border': 1
        })
        
        headers = [
            'Deal ID', 'Project Name', 'Company', 'Lead No.', 'Stage',
            'Deal Date', 'Currency', 'Amount', 'Type',
            'Customer/Partner Name', 'Customer Email', 'End Customer',
            'Client Type', 'Inside Salesperson', 'Inside Sales Head',
            'Salesperson', 'Sales Head', 'Proj. Manager', 'PM Head',
            'Exp. Close Date', 'HubSpot ID', 'Last Synced'
        ]
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
            
        for row, deal in enumerate(deals, start=1):
            worksheet.write(row, 0, deal.deal_id)
            worksheet.write(row, 1, deal.deal_name)
            worksheet.write(row, 2, deal.company)
            worksheet.write(row, 3, deal.lead.lead_no if deal.lead else "N/A")
            worksheet.write(row, 4, deal.stage)
            worksheet.write(row, 5, str(deal.deal_date))
            worksheet.write(row, 6, deal.currency)
            worksheet.write(row, 7, float(deal.deal_amount))
            worksheet.write(row, 8, deal.deal_type)
            worksheet.write(row, 9, deal.customer.name if deal.customer else "N/A")
            worksheet.write(row, 10, deal.customer_email)
            worksheet.write(row, 11, deal.end_customer)
            worksheet.write(row, 12, deal.client_type)
            worksheet.write(row, 13, deal.inside_salesperson)
            worksheet.write(row, 14, deal.inside_sales_head)
            worksheet.write(row, 15, deal.salesperson_name)
            worksheet.write(row, 16, deal.sales_head)
            worksheet.write(row, 17, deal.project_manager)
            worksheet.write(row, 18, deal.project_manager_head)
            worksheet.write(row, 19, str(deal.expected_close_date) if deal.expected_close_date else "N/A")
            worksheet.write(row, 20, deal.hubspot_id or "N/A")
            worksheet.write(row, 21, str(deal.last_synced_at) if deal.last_synced_at else "Not Synced")
            
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
            from django.http import HttpResponse
            from xhtml2pdf import pisa
            import io
            
            deals = self.get_queryset()
            html_string = render_to_string('deals/report_pdf.html', {'deals': deals, 'now': timezone.now()})
            
            result = io.BytesIO()
            pdf = pisa.pisaDocument(io.StringIO(html_string), result)
            
            if not pdf.err:
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Deals_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
                return response
            else:
                return Response({
                    "status": "error",
                    "message": "PDF generation errors occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in export_pdf (DealViewSet): {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        try:
            from django.template.loader import render_to_string
            from django.http import HttpResponse
            from xhtml2pdf import pisa
            import os
            from django.conf import settings
            import urllib.parse
            import io
            
            font_path = os.path.join(settings.BASE_DIR, 'Roboto-Regular.ttf')
            font_path = font_path.replace('\\', '/')
            # Add a leading slash for windows paths if needed by xhtml2pdf
            if not font_path.startswith('/'):
                font_path = '/' + font_path
            
            deal = self.get_object()
            
            # Map currency codes to PDF-safe display symbols to avoid black boxes
            currency_symbols = {
                'INR': 'Rs.',
                'USD': '$',
                'EUR': 'EUR',
                'EURO': '€', # Helvetica supports Euro
                'GBP': '£',  # Helvetica supports Pound
                'AED': 'AED',
                'SGD': 'S$',
            }
            currency_code = deal.currency or 'INR'
            pdf_currency_symbol = currency_symbols.get(currency_code, currency_code)
            
            # Use the detailed deal template for a single deal
            html_string = render_to_string('deals/deal_detail_pdf.html', {
                'deal': deal, 
                'now': timezone.now(),
                'roboto_font_path': font_path,
                'pdf_currency_symbol': pdf_currency_symbol
            })
            
            result = io.BytesIO()
            pdf = pisa.pisaDocument(io.StringIO(html_string), result)
            
            if not pdf.err:
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                filename = f'Deal_{deal.deal_id or deal.id}.pdf'
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            else:
                return Response({
                    "status": "error",
                    "message": "PDF generation error occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in download_pdf (DealViewSet): {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"Individual PDF download failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export deal data as CSV."""
        import csv
        from io import StringIO

        deals = self.get_queryset()
        buf = StringIO()
        writer = csv.writer(buf)

        headers = [
            'Deal ID', 'Project Name', 'Company', 'Lead No.', 'Stage',
            'Deal Date', 'Currency', 'Amount', 'Type',
            'Customer/Partner Name', 'Customer Email', 'End Customer',
            'Client Type', 'Inside Salesperson', 'Inside Sales Head',
            'Salesperson', 'Sales Head', 'Proj. Manager', 'PM Head',
            'Exp. Close Date', 'Hubspot ID', 'Last Synced'
        ]
        writer.writerow(headers)

        for deal in deals:
            writer.writerow([
                deal.deal_id,
                deal.deal_name,
                deal.company,
                deal.lead.lead_no if deal.lead else "N/A",
                deal.stage,
                str(deal.deal_date),
                deal.currency,
                float(deal.deal_amount) if deal.deal_amount is not None else "",
                deal.deal_type,
                deal.customer.name if deal.customer else "N/A",
                deal.customer_email,
                deal.end_customer,
                deal.client_type,
                deal.inside_salesperson,
                deal.inside_sales_head,
                deal.salesperson_name,
                deal.sales_head,
                deal.project_manager,
                deal.project_manager_head,
                str(deal.expected_close_date) if deal.expected_close_date else "",
                deal.hubspot_id or "",
                str(deal.last_synced_at) if deal.last_synced_at else ""
            ])

        buf.seek(0)
        response = HttpResponse(buf.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="Deals_Report_{timezone.now().strftime("%Y%m%d")}.csv"'
        return response

    @action(detail=True, methods=['post'])
    def upload_attachment(self, request, pk=None):
        """Upload an attachment to a deal."""
        deal = self.get_object()
        file = request.FILES.get('file')
        
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            attachment = DealAttachment.objects.create(
                deal=deal,
                file=file,
                filename=file.name
            )
            
            serializer = DealAttachmentSerializer(attachment, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error in upload_attachment (DealViewSet): {str(e)}", exc_info=True)
            return Response({
                'error': f'File upload failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'])
    def delete_attachment(self, request, pk=None):
        """Delete an attachment from a deal."""
        attachment_id = request.query_params.get('attachment_id')
        if not attachment_id:
            return Response({'error': 'attachment_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            attachment = DealAttachment.objects.get(id=attachment_id, deal_id=pk)
            attachment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DealAttachment.DoesNotExist:
            return Response({'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)
