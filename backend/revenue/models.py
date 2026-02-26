from django.db import models
from django.utils import timezone
from deals.models import Deal
from finance.models import CustomerPartner

class RevenueType(models.TextChoices):
    LICENSE_PERIOD = 'LICENSE_PERIOD', 'License subscription on period basis'
    LICENSE_CONSUMPTION = 'LICENSE_CONSUMPTION', 'License subscription on consumption basis'
    LICENSE_PERPETUAL = 'LICENSE_PERPETUAL', 'License subscription on perpetual basis'
    AMC_PERPETUAL = 'AMC_PERPETUAL', 'Annual maintenance fees against perpetual license'
    PS_FIXED_BID = 'PS_FIXED_BID', 'Professional services – Fixed Bid'
    PS_TM = 'PS_TM', 'Professional services – Time & Material'

class RevenueContract(models.Model):
    contract_id = models.CharField(max_length=50, unique=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='revenue_contracts')
    customer = models.ForeignKey(CustomerPartner, on_delete=models.CASCADE, related_name='revenue_contracts')
    revenue_type = models.CharField(max_length=50, choices=RevenueType.choices)
    
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # For Consumption basis
    rate_per_unit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    unit_name = models.CharField(max_length=50, blank=True, null=True, default='Referral')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.contract_id:
            import re
            prefix = "REV"
            last = RevenueContract.objects.filter(contract_id__startswith=prefix).order_by('contract_id').last()
            if last:
                match = re.search(r'(\d+)$', last.contract_id)
                if match:
                    last_num = int(match.group(1))
                    self.contract_id = f"{prefix}{last_num + 1:04d}"
                else:
                    self.contract_id = f"{prefix}0001"
            else:
                self.contract_id = f"{prefix}0001"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.contract_id} - {self.revenue_type} - {self.deal.deal_name}"

class RevenueSchedule(models.Model):
    contract = models.ForeignKey(RevenueContract, on_delete=models.CASCADE, related_name='schedules')
    period_month = models.DateField() # Representing the month, e.g., 2025-04-01
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    recognized_at = models.DateTimeField(null=True, blank=True)
    is_posted = models.BooleanField(default=False)
    gl_entry_reference = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        unique_together = ('contract', 'period_month')
        ordering = ['period_month']

    def __str__(self):
        return f"{self.contract.contract_id} - {self.period_month.strftime('%b-%y')} - {self.amount}"

class ConsumptionRecord(models.Model):
    contract = models.ForeignKey(RevenueContract, on_delete=models.CASCADE, related_name='consumptions')
    period_month = models.DateField()
    quantity = models.DecimalField(max_digits=15, decimal_places=2)
    billed_amount = models.DecimalField(max_digits=15, decimal_places=2)
    billing_date = models.DateField()
    
    class Meta:
        unique_together = ('contract', 'period_month')

class FixedBidProgress(models.Model):
    contract = models.ForeignKey(RevenueContract, on_delete=models.CASCADE, related_name='progress_entries')
    period_month = models.DateField()
    cumulative_progress_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    revenue_for_month = models.DecimalField(max_digits=15, decimal_places=2)
    
    class Meta:
        unique_together = ('contract', 'period_month')

class PeriodLock(models.Model):
    period_month = models.DateField(unique=True) # e.g. 2025-04-01
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.period_month.strftime('%b-%y')} - {'Locked' if self.is_locked else 'Open'}"
