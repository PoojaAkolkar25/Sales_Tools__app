from rest_framework import viewsets, decorators, permissions, status
from rest_framework.response import Response
from .models import SalesOrder, SalesOrderItem, IncomingEmail, PurchaseOrderFile
from .serializers import SalesOrderSerializer, SalesOrderItemSerializer, IncomingEmailSerializer, PurchaseOrderFileSerializer
from django.shortcuts import get_object_or_404, render
from django.db import models
from django.http import HttpResponse
from django.utils import timezone
import io
import xlsxwriter
from django.template.loader import render_to_string
from xhtml2pdf import pisa
from django.contrib.contenttypes.models import ContentType
from deals.models import AuditTrail
import logging

logger = logging.getLogger(__name__)

class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer

    def get_queryset(self):
        queryset = SalesOrder.objects.all().order_by('-updated_at')
        customer_id = self.request.query_params.get('customer')
        status_filter = self.request.query_params.get('status_filter')

        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create sales order and log audit trail"""
        try:
            sales_order = serializer.save()
            
            # Create audit log for creation
            content_type = ContentType.objects.get_for_model(SalesOrder)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=sales_order.id,
                user=self.request.user,
                action_type='CREATE',
                field_name='created',
                old_value='',
                new_value=f'Sales Order {sales_order.so_number or sales_order.id} created'
            )
        except Exception as e:
            logger.error(f"Error in perform_create (SalesOrderViewSet): {str(e)}", exc_info=True)
            raise

    def update(self, request, *args, **kwargs):
        """Update sales order and log field changes"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Track original values for key fields
        original_data = {
            'po_number': instance.po_number or '',
            'customer_name': instance.customer_name or '',
            'cust_id': instance.cust_id or '',
            'total_amount': str(instance.total_amount),
            'currency': instance.currency,
            'status': instance.status,
        }
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log changes
        content_type = ContentType.objects.get_for_model(SalesOrder)
        new_data = {
            'po_number': instance.po_number or '',
            'customer_name': instance.customer_name or '',
            'cust_id': instance.cust_id or '',
            'total_amount': str(instance.total_amount),
            'currency': instance.currency,
            'status': instance.status,
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
        
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        sales_order = self.get_object()
        
        # Validation Rules from BRD
        if not sales_order.customer and not sales_order.customer_name:
            return Response({"error": "Customer is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.po_number:
            return Response({"error": "PO Number is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.po_from_date:
            return Response({"error": "PO Valid From Date is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.po_to_date:
            return Response({"error": "PO Valid To Date is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.order_date:
            return Response({"error": "Order Date is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.items.exists():
            return Response({"error": "At least one line item is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for duplicate PO numbers (any non-cancelled SO with same PO number for this customer)
        duplicate_query = models.Q(po_number__iexact=sales_order.po_number)
        duplicate_query &= ~models.Q(status='CANCELLED')
        
        if sales_order.customer:
            duplicate_query &= models.Q(customer=sales_order.customer)
        else:
            duplicate_query &= models.Q(customer_name=sales_order.customer_name)
            
        duplicates = SalesOrder.objects.filter(duplicate_query).exclude(pk=sales_order.pk)
        
        if duplicates.exists():
            existing = duplicates.first()
            status_desc = existing.get_status_display()
            customer_desc = existing.customer.name if existing.customer else existing.customer_name
            return Response({"error": f"PO Number {sales_order.po_number} already exists for this customer. Check first PO (ID: {existing.id}, Status: {status_desc})."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sales_order.status = 'PENDING_APPROVAL'
            sales_order.save() # save method handles SO number generation
            
            # Log audit trail for submission
            content_type = ContentType.objects.get_for_model(SalesOrder)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=sales_order.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value='DRAFT',
                new_value='PENDING_APPROVAL'
            )
            
            return Response(SalesOrderSerializer(sales_order).data)
        except Exception as e:
            logger.error(f"Error in submit (SalesOrderViewSet): {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @decorators.action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        sales_order = self.get_object()
        if sales_order.status != 'PENDING_APPROVAL':
             return Response({"error": "Only pending orders can be approved."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            sales_order.status = 'APPROVED'
            sales_order.save()
            
            # Log audit trail for approval
            content_type = ContentType.objects.get_for_model(SalesOrder)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=sales_order.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value='PENDING_APPROVAL',
                new_value='APPROVED'
            )
            
            return Response(SalesOrderSerializer(sales_order).data)
        except Exception as e:
            logger.error(f"Error in approve (SalesOrderViewSet): {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @decorators.action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        sales_order = self.get_object()
        if sales_order.status != 'PENDING_APPROVAL':
             return Response({"error": "Only pending orders can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            sales_order.status = 'REJECTED'
            sales_order.save()
            
            # Log audit trail for rejection
            content_type = ContentType.objects.get_for_model(SalesOrder)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=sales_order.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value='PENDING_APPROVAL',
                new_value='REJECTED'
            )
            
            return Response(SalesOrderSerializer(sales_order).data)
        except Exception as e:
            logger.error(f"Error in reject (SalesOrderViewSet): {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @decorators.action(detail=False, methods=['get'])
    def export_excel(self, request):
        sales_orders = self.get_queryset()
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Sales Orders Report")
        
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#0066CC',
            'font_color': 'white',
            'border': 1
        })
        
        headers = [
            'Deal ID', 'SO Number', 'Order Date', 'Customer', 'Customer ID', 
            'PO Number', 'Items (Summary)', 'Status', 'Total Amount', 'Currency', 'PO Date'
        ]
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
            
        for row, so in enumerate(sales_orders, start=1):
            worksheet.write(row, 0, so.estimates.first().deal.deal_id if so.estimates.exists() and so.estimates.first().deal else '—')
            worksheet.write(row, 1, so.so_number or '—')
            worksheet.write(row, 2, so.order_date.strftime("%Y-%m-%d") if so.order_date else '—')
            worksheet.write(row, 3, so.customer_name or (so.customer.name if so.customer else '—'))
            worksheet.write(row, 4, so.cust_id or '—')
            worksheet.write(row, 5, so.po_number or '—')
            
            # Items Summary
            items = so.items.all()
            if items.exists():
                summary = items.first().description or (items.first().product.name if items.first().product else 'Unmapped Item')
                if items.count() > 1:
                    summary += f" (+{items.count() - 1} more)"
            else:
                summary = '—'
            worksheet.write(row, 6, summary)
            
            worksheet.write(row, 7, so.get_status_display())
            worksheet.write(row, 8, float(so.total_amount))
            worksheet.write(row, 9, so.currency)
            worksheet.write(row, 10, so.po_date.strftime("%Y-%m-%d") if so.po_date else '—')
            
        workbook.close()
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Sales_Orders_Report_{timezone.now().strftime("%Y%m%d")}.xlsx"'
        return response

    @decorators.action(detail=False, methods=['get'])
    def export_pdf(self, request):
        try:
            sales_orders = self.get_queryset()
            html_string = render_to_string('sales_orders/report_pdf.html', {
                'sales_orders': sales_orders, 
                'now': timezone.now()
            })
            
            result = io.BytesIO()
            pisa_status = pisa.CreatePDF(html_string, dest=result)
            
            if pisa_status.err:
                logger.error("PDF generation error occurred in export_pdf (SalesOrderViewSet)")
                return Response({
                    "status": "error",
                    "message": "PDF generation error occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Sales_Orders_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
        except Exception as e:
            logger.error(f"Error in export_pdf (SalesOrderViewSet): {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @decorators.action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        try:
            sales_order = self.get_object()
            html_string = render_to_string('sales_orders/report_pdf.html', {
                'sales_orders': [sales_order], 
                'now': timezone.now()
            })
            
            result = io.BytesIO()
            pisa_status = pisa.CreatePDF(html_string, dest=result)
            
            if pisa_status.err:
                logger.error("PDF generation error occurred in download_pdf (SalesOrderViewSet)")
                return Response({
                    "status": "error",
                    "message": "PDF generation error occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            filename = f"Sales_Order_{sales_order.so_number or sales_order.id}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            logger.error(f"Error in download_pdf (SalesOrderViewSet): {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"Individual PDF download failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IncomingEmailViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IncomingEmail.objects.all().order_by('-received_at')
    serializer_class = IncomingEmailSerializer

class PurchaseOrderFileViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderFile.objects.all()
    serializer_class = PurchaseOrderFileSerializer

    @decorators.action(detail=False, methods=['post'])
    def process_po(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "File is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from .vertex_model import is_model_ready
        if not is_model_ready():
            return Response({"error": "Vertex AI key is not valid or configuration is missing."}, status=status.HTTP_400_BAD_REQUEST)
            
        po_file = PurchaseOrderFile.objects.create(file=file)
        
        # Trigger Extraction using the new service
        from .services import SalesOrderCreator
        try:
            draft_so = SalesOrderCreator.create_from_po(po_file)
            return Response({
                "message": "PO uploaded and Draft Sales Order created.",
                "file_id": po_file.id,
                "so_id": draft_so.id
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Automated PO extraction failed in process_po: {str(e)}", exc_info=True)
            
            # Specific handling for duplicate POs
            error_str = str(e)
            if "already exists" in error_str.lower():
                return Response({
                    "error": error_str,
                    "message": "PO Number already exists. Please check if this PO has already been uploaded."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Fallback: Create a blank draft if extraction fails completely for other reasons
            from .models import SalesOrder, SalesOrderStatus
            draft_so = SalesOrder.objects.create(
                po_file=po_file,
                status=SalesOrderStatus.DRAFT,
                po_number="Extraction Failed",
                so_number=None
            )
            return Response({
                "message": "PO uploaded, but automated extraction failed. A blank draft has been created for manual entry.",
                "error": error_str,
                "file_id": po_file.id,
                "so_id": draft_so.id
            }, status=status.HTTP_201_CREATED)
