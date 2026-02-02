from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Milestone, MilestoneStatus
from .serializers import MilestoneSerializer
from finance.models import Invoice, InvoiceStatus
from sales_orders.models import SalesOrder
import datetime
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
             # The Customer model has a related_name='deals' from Deal model
             customer_deals = sales_order.customer.deals.all()
             if customer_deals.exists():
                 # Use the lead from the most recent deal
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
                 # Generate unique lead number
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

        # Generate Invoice
        # Simple Invoice No generation logic (can be improved)
        last_invoice = Invoice.objects.order_by('id').last()
        last_id = last_invoice.id if last_invoice else 0
        new_invoice_no = f"INV-M-{last_id + 1:04d}"
        
        try:
            invoice = Invoice.objects.create(
                invoice_no=new_invoice_no,
                invoice_date=datetime.date.today(),
                due_date=milestone.due_date,
                lead=lead, 
                total_amount=milestone.amount,
                open_balance=milestone.amount,
                status=InvoiceStatus.DRAFT
            )
            
            milestone.invoice = invoice
            milestone.status = MilestoneStatus.INVOICED
            milestone.save()
            
            return Response(MilestoneSerializer(milestone).data)
            
        except Exception as e:
             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
