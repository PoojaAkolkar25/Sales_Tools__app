from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.http import HttpResponse
import io
import xlsxwriter
from .models import Deal, DealOwner, ImplementationPartner, Product, OpportunitySourceMaster, IndustryMaster, Customer, CountryMaster
from .serializers import (
    DealSerializer, DealOwnerSerializer, ImplementationPartnerSerializer,
    ProductSerializer, OpportunitySourceMasterSerializer, IndustryMasterSerializer, CustomerSerializer,
    CountryMasterSerializer
)

class DealOwnerViewSet(viewsets.ModelViewSet):
    queryset = DealOwner.objects.all().order_by('name')
    serializer_class = DealOwnerSerializer
    permission_classes = [permissions.IsAuthenticated]

class ImplementationPartnerViewSet(viewsets.ModelViewSet):
    queryset = ImplementationPartner.objects.all().order_by('name')
    serializer_class = ImplementationPartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

class OpportunitySourceMasterViewSet(viewsets.ModelViewSet):
    queryset = OpportunitySourceMaster.objects.all().order_by('name')
    serializer_class = OpportunitySourceMasterSerializer
    permission_classes = [permissions.IsAuthenticated]

class IndustryMasterViewSet(viewsets.ModelViewSet):
    queryset = IndustryMaster.objects.all().order_by('name')
    serializer_class = IndustryMasterSerializer
    permission_classes = [permissions.IsAuthenticated]

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

class CountryMasterViewSet(viewsets.ModelViewSet):
    queryset = CountryMaster.objects.all().order_by('name')
    serializer_class = CountryMasterSerializer
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
            queryset = queryset.filter(Q(deal_owner__email=self.request.user.email))
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
            
        owner = self.request.query_params.get('owner', None)
        if owner:
            queryset = queryset.filter(deal_owner_id=owner)
            
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(deal_name__icontains=search) |
                Q(deal_id__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(industry__name__icontains=search) |
                Q(country__name__icontains=search)
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
            'Deal ID', 'Deal Name', 'Customer', 'Customer Email', 'Stage',
            'Amount', 'Currency', 'Probability (%)', 'Owner', 'Close Date',
            'HubSpot ID', 'Last Synced'
        ]
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
            
        for row, deal in enumerate(deals, start=1):
            worksheet.write(row, 0, deal.deal_id)
            worksheet.write(row, 1, deal.deal_name)
            worksheet.write(row, 2, deal.customer.name if deal.customer else "N/A")
            worksheet.write(row, 3, deal.customer_email)
            worksheet.write(row, 4, deal.stage)
            worksheet.write(row, 5, float(deal.amount))
            worksheet.write(row, 6, deal.currency)
            worksheet.write(row, 7, float(deal.probability))
            worksheet.write(row, 8, deal.deal_owner.name if deal.deal_owner else "N/A")
            worksheet.write(row, 9, str(deal.expected_close_date) if deal.expected_close_date else "N/A")
            worksheet.write(row, 10, deal.hubspot_id or "N/A")
            worksheet.write(row, 11, str(deal.last_synced_at) if deal.last_synced_at else "Not Synced")
            
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
            import weasyprint
            
            deals = self.get_queryset()
            html_string = render_to_string('deals/report_pdf.html', {'deals': deals, 'now': timezone.now()})
            pdf_file = weasyprint.HTML(string=html_string).write_pdf()
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Deals_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
        except ImportError:
             return Response({
                "status": "error",
                "message": "PDF export failed: WeasyPrint not installed or properly configured in this environment."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
