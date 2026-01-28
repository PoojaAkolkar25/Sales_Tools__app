from rest_framework import viewsets, status, decorators
from rest_framework.response import Response
from .models import SalesOrder, SalesOrderItem, IncomingEmail, PurchaseOrderFile
from .serializers import SalesOrderSerializer, SalesOrderItemSerializer, IncomingEmailSerializer, PurchaseOrderFileSerializer
from django.shortcuts import get_object_or_404

class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all().order_by('-created_at')
    serializer_class = SalesOrderSerializer

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        sales_order = self.get_object()
        
        # Validation Rules from BRD
        if not sales_order.customer:
            return Response({"error": "Customer is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.po_number:
            return Response({"error": "PO Number is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.order_date:
            return Response({"error": "Order Date is mandatory before submission."}, status=status.HTTP_400_BAD_REQUEST)
        if not sales_order.items.exists():
            return Response({"error": "At least one line item is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for duplicate PO numbers for same customer
        duplicates = SalesOrder.objects.filter(
            customer=sales_order.customer, 
            po_number=sales_order.po_number,
            status='SUBMITTED'
        ).exclude(pk=sales_order.pk)
        
        if duplicates.exists():
            return Response({"error": f"A Sales Order with PO Number {sales_order.po_number} already exists for this customer."}, status=status.HTTP_400_BAD_REQUEST)

        sales_order.status = 'SUBMITTED'
        sales_order.save() # save method handles SO number generation
        
        return Response(SalesOrderSerializer(sales_order).data)

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
            # Fallback: Create a blank draft if extraction fails completely
            from .models import SalesOrder, SalesOrderStatus
            draft_so = SalesOrder.objects.create(
                po_file=po_file,
                status=SalesOrderStatus.DRAFT,
                po_number="Extraction Failed",
                so_number=None
            )
            return Response({
                "message": "PO uploaded, but automated extraction failed. A blank draft has been created for manual entry.",
                "error": str(e),
                "file_id": po_file.id,
                "so_id": draft_so.id
            }, status=status.HTTP_201_CREATED)
