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

class Customer(models.Model):
    name = models.CharField(max_length=255, unique=True)
    email = models.EmailField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Deal(models.Model):
    class CompanyChoices(models.TextChoices):
        AE_IND = 'AE IND', 'AE IND'
        AE_USA = 'AE USA', 'AE USA'

    company = models.CharField(max_length=10, choices=CompanyChoices.choices, default=CompanyChoices.AE_IND)
    deal_id = models.CharField(max_length=50, unique=True, blank=True)
    deal_name = models.CharField(max_length=255) # This is "Project Name" in UI
    deal_date = models.DateField(default=timezone.now)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    stage = models.CharField(max_length=50, choices=DealStage.choices, default=DealStage.DEAL_CREATED)
    
    currency = models.CharField(max_length=10, choices=Currency.choices, default=Currency.INR)
    fx_rate = models.DecimalField(max_digits=15, decimal_places=4, default=1.0)
    deal_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    deal_type = models.CharField(max_length=50, choices=DealType.choices, blank=True, default='')
    priority = models.CharField(max_length=50, blank=True, default='')
    implementation_partner = models.ForeignKey(ImplementationPartner, on_delete=models.SET_NULL, null=True, blank=True)
    
    description = models.TextField(blank=True, default='')
    
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    customer_email = models.EmailField(blank=True, default='')
    
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
        
        from cost_sheets.models import CostSheet
        if not CostSheet.objects.filter(deal=self).exists():
            from django.utils import timezone
            CostSheet.objects.create(
                lead=self.lead,
                deal=self,
                project_name=self.deal_name,
                customer_name=self.customer.name if self.customer else '',
                sales_person=self.salesperson_name,
                project_manager=self.project_manager,
                cost_sheet_date=timezone.now().date(),
                overall_remarks=f"Auto-generated from Project: {self.deal_name} ({self.deal_type})"
            )

    def __str__(self):
        return f"{self.deal_id} - {self.deal_name}"
