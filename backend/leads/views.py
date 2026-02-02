from rest_framework import viewsets
from django.db.models import Q
from .models import Lead
from .serializers import LeadSerializer

class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all().order_by('-created_at')
    serializer_class = LeadSerializer

    def get_queryset(self):
        queryset = Lead.objects.all().order_by('-created_at')
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(lead_no__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(project_name__icontains=search) |
                Q(sales_person__icontains=search)
            )
            
        company = self.request.query_params.get('company', None)
        if company:
            queryset = queryset.filter(company=company)
            
        return queryset
