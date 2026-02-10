# Helper script to add audit logging to Cost Sheets, Sales Orders, Milestones, and Finance modules
# This demonstrates the pattern that should be added to each ViewSet

AUDIT_LOGGING_TEMPLATE = """
# Add these imports at the top of the file:
from django.contrib.contenttypes.models import ContentType
from deals.models import AuditTrail

# Add these methods to the ViewSet:

def perform_create(self, serializer):
    \"\"\"Create {model_name} and log audit trail\"\"\"
    instance = serializer.save()
    
    # Create audit log for creation
    content_type = ContentType.objects.get_for_model({ModelClass})
    AuditTrail.objects.create(
        content_type=content_type,
        object_id=instance.id,
        user=self.request.user,
        action_type='CREATE',
        field_name='created',
        old_value='',
        new_value=f'{model_display} created'
    )

def update(self, request, *args, **kwargs):
    \"\"\"Update {model_name} and log field changes\"\"\"
    partial = kwargs.pop('partial', False)
    instance = self.get_object()
    
    # Track original values for key fields
    original_data = {{
        # Add relevant fields here
    }}
    
    serializer = self.get_serializer(instance, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    self.perform_update(serializer)
    
    # Log changes
    content_type = ContentType.objects.get_for_model({ModelClass})
    new_data = {{
        # Add same fields as original_data
    }}
    
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
"""

print("Audit logging pattern to be added to:")
print("1. cost_sheets/views.py - CostSheetViewSet")
print("2. sales_orders/views.py - SalesOrderViewSet")  
print("3. milestones/views.py - MilestoneViewSet")
print("4. finance/views.py - InvoiceViewSet and ReceiptVoucherViewSet")
