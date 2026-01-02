from django.db import models
from django.core.validators import MinValueValidator
from leads.models import Lead

class CostSheetStatus(models.TextChoices):
    PENDING = 'PENDING', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Pending for Approval'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'

class CostSheet(models.Model):
    cost_sheet_no = models.CharField(max_length=100, unique=True)
    cost_sheet_date = models.DateField(null=True, blank=True)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='cost_sheets')
    status = models.CharField(
        max_length=20, 
        choices=CostSheetStatus.choices, 
        default=CostSheetStatus.PENDING
    )
    approval_comments = models.TextField(null=True, blank=True)
    
    total_estimated_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_estimated_margin = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_estimated_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.cost_sheet_no} ({self.status})"

class LicenseItem(models.Model):
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='license_items')
    name = models.CharField(max_length=255, blank=True, default='')
    type = models.CharField(max_length=100, blank=True, default='')
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    qty = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    period = models.CharField(max_length=100, blank=True, default='')
    
    margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    estimated_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_margin_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

class ServiceImplementationItem(models.Model):
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='implementation_items')
    category = models.CharField(max_length=255, blank=True, default='')
    num_resources = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    num_days = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    rate_per_day = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    total_days = models.IntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_margin_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

class ServiceSupportItem(models.Model):
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='support_items')
    category = models.CharField(max_length=255, blank=True, default='')
    num_resources = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    num_days = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    rate_per_day = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    total_days = models.IntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_margin_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

class InfrastructureItem(models.Model):
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='infra_items')
    name = models.CharField(max_length=255, blank=True, default='')
    qty = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    months = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    rate_per_month = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    estimated_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_margin_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

class CostSheetAttachment(models.Model):
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='cost_sheet_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename

class OtherItem(models.Model):
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='other_items')
    description = models.CharField(max_length=500, blank=True, default='')
    
    margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    estimated_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_margin_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    estimated_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
