from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from leads.models import Lead

class DealStage(models.TextChoices):
    DEAL_CREATED = 'DEAL_CREATED', 'Deal created'
    COST_SHEET = 'COST_SHEET', 'Cost Sheet'
    ESTIMATES = 'ESTIMATES', 'Estimates'
    SALES_ORDER = 'SALES_ORDER', 'Sales Order'
    INVOICE = 'INVOICE', 'Invoice'
    PAYMENT = 'PAYMENT', 'Payment'

class Currency(models.TextChoices):
    INR = 'INR', 'INR'
    USD = 'USD', 'USD'
    EURO = 'EURO', 'EURO'

class ClientType(models.TextChoices):
    NEW = 'NEW', 'New'
    EXISTING = 'EXISTING', 'Existing'

class DealType(models.TextChoices):
    LICENSE = 'LICENSE', 'License'
    SERVICES = 'SERVICES', 'Services'

class ImplementationPartner(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class CustomerType(models.TextChoices):
    PARTNER = 'PARTNER', 'Partner'
    CUSTOMER = 'CUSTOMER', 'Customer'

class Customer(models.Model):
    name = models.CharField(max_length=255, unique=True)
    email = models.EmailField(blank=True, default='')
    customer_type = models.CharField(max_length=20, choices=CustomerType.choices, default=CustomerType.CUSTOMER)
    is_active = models.BooleanField(default=True)
    contact_person = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    address = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Deal(models.Model):
    class CompanyChoices(models.TextChoices):
        AE_IND = 'AE IND', 'AE IND'
        AE_USA = 'AE USA', 'AE USA'

    company = models.CharField(max_length=10, choices=CompanyChoices.choices, default=CompanyChoices.AE_IND)
    deal_id = models.CharField(max_length=50, unique=True, blank=True)
    deal_name = models.CharField(max_length=255) # This is "Project Name" in UI
    deal_date = models.DateField(default=timezone.localdate)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    stage = models.CharField(max_length=50, choices=DealStage.choices, default=DealStage.DEAL_CREATED)
    
    currency = models.CharField(max_length=10, choices=Currency.choices, default=Currency.INR)
    fx_rate = models.DecimalField(max_digits=15, decimal_places=4, default=1.0)
    deal_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    deal_type = models.CharField(max_length=50, choices=DealType.choices, blank=True, default='')
    priority = models.CharField(max_length=50, blank=True, default='')
    
    description = models.TextField(blank=True, default='')
    
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    customer_email = models.EmailField(blank=True, default='')
    end_customer = models.CharField(max_length=255, blank=True, default='')
    
    # Attachments stored as JSON array of file paths
    attachments = models.JSONField(default=list, blank=True)
    
    client_type = models.CharField(max_length=20, choices=ClientType.choices, blank=True, default='')
    
    inside_salesperson = models.CharField(max_length=255, blank=True, default='')
    inside_sales_head = models.CharField(max_length=255, blank=True, default='')
    salesperson_name = models.CharField(max_length=255, blank=True, default='')
    sales_head = models.CharField(max_length=255, blank=True, default='')
    project_manager = models.CharField(max_length=255, blank=True, default='')
    project_manager_head = models.CharField(max_length=255, blank=True, default='')
    
    expected_close_date = models.DateField(null=True, blank=True)
    
    remark = models.TextField(blank=True, default='')
    won_lost_reason = models.TextField(blank=True, default='')
    hubspot_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.deal_id:
            prefix = "AEINDDL" if self.company == self.CompanyChoices.AE_IND else "AEUSADL"
            
            import re
            last_deal = Deal.objects.filter(deal_id__startswith=prefix).order_by('deal_id').last()
            if last_deal:
                match = re.search(r'(\d+)$', last_deal.deal_id)
                if match:
                    last_num = int(match.group(1))
                    self.deal_id = f"{prefix}{last_num + 1:04d}"
                else:
                    self.deal_id = f"{prefix}0001"
            else:
                self.deal_id = f"{prefix}0001"
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.deal_id} - {self.deal_name}"
    
    def get_current_stage(self):
        """Dynamically determine the current stage based on related records"""
        # Check in reverse order of workflow: Payment -> Invoice -> Sales Order -> Estimates -> Cost Sheet -> Deal Created
        
        # Check if any invoices exist and have payments
        if hasattr(self, 'invoices') and self.invoices.exists():
            # Check if any invoice has payments/receipts
            for invoice in self.invoices.all():
                if hasattr(invoice, 'receipt_vouchers') and invoice.receipt_vouchers.exists():
                    return DealStage.PAYMENT
            # If invoices exist but no payments, stage is INVOICE
            return DealStage.INVOICE
        
        # Check if sales orders exist
        if hasattr(self, 'sales_orders') and self.sales_orders.exists():
            return DealStage.SALES_ORDER
        
        # Check if estimates exist
        if hasattr(self, 'estimates') and self.estimates.exists():
            return DealStage.ESTIMATES
        
        # Check if cost sheets exist
        if hasattr(self, 'cost_sheets') and self.cost_sheets.exists():
            return DealStage.COST_SHEET
        
        # Default to deal created if nothing else exists
        return DealStage.DEAL_CREATED

class DealTypeEntry(models.Model):
    """Model to support multiple deal type rows (License/Services)"""
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='deal_types')
    type = models.CharField(max_length=50, choices=DealType.choices)
    description = models.TextField(blank=True, default='')
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    quantity = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.deal.deal_id} - {self.type} - {self.description[:30]}"

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class AuditTrail(models.Model):
    """Model to track all changes made to any model (Deals, Estimates, etc.)"""
    class ActionType(models.TextChoices):
        CREATE = 'CREATE', 'Created'
        UPDATE = 'UPDATE', 'Updated'
        DELETE = 'DELETE', 'Deleted'
    
    # Generic Foreign Key
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True)
    object_id = models.PositiveIntegerField(null=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, default='')
    new_value = models.TextField(blank=True, default='')
    action_type = models.CharField(max_length=10, choices=ActionType.choices, default=ActionType.UPDATE)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]
    
    def __str__(self):
        return f"{self.content_type} {self.object_id} - {self.field_name} - {self.timestamp}"
class DealAttachment(models.Model):
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='deal_attachments')
    file = models.FileField(upload_to='deal_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename
