from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from cost_sheets.models import CostSheet
from deals.models import Deal

class EstimateStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Approval'
    SUBMITTED = 'SUBMITTED', 'Submitted to Customer'
    NEGOTIATION = 'NEGOTIATION', 'Negotiation'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    REWOUND = 'REWOUND', 'Rewound'

class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'

class Estimate(models.Model):
    estimate_id = models.CharField(max_length=50, blank=True)
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='estimates')
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='estimates')
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=EstimateStatus.choices, default=EstimateStatus.DRAFT)
    
    estimate_date = models.DateField(null=True, blank=True)
    subscription_from = models.DateField(null=True, blank=True)
    subscription_to = models.DateField(null=True, blank=True)
    description_memo = models.TextField(blank=True, default='')
    terms_conditions = models.TextField(blank=True, default='')
    
    markup_adjustment = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    commercial_terms = models.TextField(blank=True, default='')
    
    # Snapshot of Cost Sheet values at the time of creation/rewind
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_margin = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Rewind functionality - links to the previous version
    parent_estimate = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='negotiated_versions')
    is_latest = models.BooleanField(default=True)
    
    # Custom column labels for the items table
    column_labels = models.JSONField(default=dict, blank=True, help_text="Custom labels for items table headers")
    
    # Approval workflow fields
    approval_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_estimates')
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True, default='')
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.estimate_id:
            import re
            all_ids = Estimate.objects.values_list('estimate_id', flat=True)
            max_num = 0
            for est_id in all_ids:
                if est_id:
                    match = re.search(r'EST-(\d+)', est_id)
                    if match:
                        try:
                            num = int(match.group(1))
                            if num > max_num:
                                max_num = num
                        except ValueError:
                            continue
            self.estimate_id = f'EST-{max_num + 1:04d}'
        super().save(*args, **kwargs)

    @property
    def total_qty(self):
        return sum(item.qty for item in self.items.all())

    def __str__(self):
        return f"{self.estimate_id} v{self.version} ({self.status})"

class Proposal(models.Model):
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='proposals')
    file = models.FileField(upload_to='proposals/')
    filename = models.CharField(max_length=255)
    version = models.IntegerField(default=1)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} v{self.version}"

class EstimateItem(models.Model):
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='items')
    sr_no = models.IntegerField()
    particulars = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    subscription_from = models.DateField(null=True, blank=True)
    subscription_to = models.DateField(null=True, blank=True)
    hsn_sac = models.CharField(max_length=20, blank=True, default='', verbose_name="HSN/SAC")
    qty = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    unit = models.CharField(max_length=20, default='Nos')
    rate = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    
    def save(self, *args, **kwargs):
        # Ensure values are Decimal before calculation to avoid TypeError with floats
        qty = Decimal(str(self.qty)) if self.qty is not None else Decimal('0.00')
        rate = Decimal(str(self.rate)) if self.rate is not None else Decimal('0.00')
        discount = Decimal(str(self.discount)) if self.discount is not None else Decimal('0.00')
        
        self.amount = (qty * rate) - discount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.estimate.estimate_id} - {self.particulars}"

class RenewalFrequency(models.TextChoices):
    MONTHLY = 'MONTHLY', 'Monthly'
    QUARTERLY = 'QUARTERLY', 'Quarterly'
    YEARLY = 'YEARLY', 'Yearly'

class RenewalStatus(models.TextChoices):
    UPCOMING = 'UPCOMING', 'Upcoming'
    RENEWED = 'RENEWED', 'Renewed'
    CLOSED = 'CLOSED', 'Closed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class Renewal(models.Model):
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='renewals')
    proposal = models.ForeignKey(Proposal, on_delete=models.SET_NULL, null=True, blank=True)
    
    start_date = models.DateField()
    end_date = models.DateField()
    reminder_date = models.DateField()
    
    frequency = models.CharField(max_length=20, choices=RenewalFrequency.choices)
    status = models.CharField(max_length=20, choices=RenewalStatus.choices, default=RenewalStatus.UPCOMING)
    
    notes = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Renewal for {self.estimate.estimate_id} ({self.start_date} to {self.end_date})"

class EmailLog(models.Model):
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='email_logs')
    subject = models.CharField(max_length=255)
    recipient = models.EmailField()
    cc = models.TextField(blank=True, default='')
    bcc = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=[('SENT', 'Sent'), ('FAILED', 'Failed')])
    error_message = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(auto_now_add=True)
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Email to {self.recipient} for {self.estimate.estimate_id} - {self.status}"
