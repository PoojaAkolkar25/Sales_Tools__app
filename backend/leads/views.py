from rest_framework import viewsets
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType
from .models import Lead
from .serializers import LeadSerializer
from deals.models import AuditTrail

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
    
    def perform_create(self, serializer):
        """Create lead and log audit trail"""
        lead = serializer.save()
        
        # Create audit log for creation
        content_type = ContentType.objects.get_for_model(Lead)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=lead.id,
            user=self.request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Lead {lead.lead_no} created'
        )
    
    def update(self, request, *args, **kwargs):
        """Update lead and log field changes"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Track original values
        original_data = {
            'company': instance.company,
            'lead_date': str(instance.lead_date) if instance.lead_date else '',
            'customer_name': instance.customer_name,
            'project_name': instance.project_name,
            'project_manager': instance.project_manager or '',
            'sales_person': instance.sales_person or '',
            'email': instance.email or '',
        }
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log changes
        content_type = ContentType.objects.get_for_model(Lead)
        new_data = {
            'company': instance.company,
            'lead_date': str(instance.lead_date) if instance.lead_date else '',
            'customer_name': instance.customer_name,
            'project_name': instance.project_name,
            'project_manager': instance.project_manager or '',
            'sales_person': instance.sales_person or '',
            'email': instance.email or '',
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
        
        return super().update(request, *args, **kwargs)
