from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from leads.models import Lead

class DealStage(models.TextChoices):
    PROSPECTING = 'PROSPECTING', 'Prospecting'
    QUALIFICATION = 'QUALIFICATION', 'Qualification'
    PROPOSAL = 'PROPOSAL', 'Proposal'
    NEGOTIATION = 'NEGOTIATION', 'Negotiation'
    CLOSED_WON = 'CLOSED_WON', 'Closed Won'
    CLOSED_LOST = 'CLOSED_LOST', 'Closed Lost'

class Currency(models.TextChoices):
    INR = 'INR', 'INR'
    USD = 'USD', 'USD'

class Region(models.TextChoices):
    AMERICAS = 'AMERICAS', 'Americas'
    ANZ = 'ANZ', 'ANZ'
    BRAZIL = 'BRAZIL', 'Brazil'
    ROW = 'ROW', 'RoW'
    ISAARC = 'ISAARC', 'ISAARC (India, Nepal...)'

class ClientType(models.TextChoices):
    NEW = 'NEW', 'New'
    EXISTING = 'EXISTING', 'Existing'

class DealType(models.TextChoices):
    ARR = 'ARR', 'Annual Recurring Revenue'
    FIXED_BID = 'FIXED_BID', 'Fixed Bid'
    NEW_LICENSE = 'NEW_LICENSE', 'New License'
    LICENSE_RENEWAL = 'LICENSE_RENEWAL', 'License Renewal'
    T_M = 'T_M', 'T&M'

class DealOwner(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    contact_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

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

class OpportunitySourceMaster(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class IndustryMaster(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class CountryMaster(models.Model):
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
    deal_id = models.CharField(max_length=50, unique=True, blank=True)
    deal_name = models.CharField(max_length=255)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    stage = models.CharField(max_length=50, choices=DealStage.choices, default=DealStage.PROSPECTING)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, choices=Currency.choices, default=Currency.INR)
    
    # Updated Deal Owner to link to DealOwner master
    deal_owner = models.ForeignKey(DealOwner, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_deals')
    
    deal_type = models.CharField(max_length=50, choices=DealType.choices, blank=True, default='')
    priority = models.CharField(max_length=50, blank=True, default='')
    implementation_partner = models.ForeignKey(ImplementationPartner, on_delete=models.SET_NULL, null=True, blank=True)
    
    project_name = models.CharField(max_length=255, blank=True, default='')
    country = models.ForeignKey(CountryMaster, on_delete=models.SET_NULL, null=True, blank=True)
    region = models.CharField(max_length=50, choices=Region.choices, blank=True, default='')
    
    # Changed from CharField to ForeignKey for Master Data management
    industry = models.ForeignKey(IndustryMaster, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True, default='')
    
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    customer_email = models.EmailField(blank=True, default='')
    
    products = models.ManyToManyField(Product, blank=True)
    product_name_manual = models.CharField(max_length=255, blank=True, default='', help_text="Manual fallback or display")
    
    client_type = models.CharField(max_length=20, choices=ClientType.choices, blank=True, default='')
    opportunity_source = models.ForeignKey(OpportunitySourceMaster, on_delete=models.SET_NULL, null=True, blank=True)
    
    associate_contact = models.CharField(max_length=255, blank=True, default='')
    inside_salesperson = models.CharField(max_length=255, blank=True, default='')
    inside_sales_head = models.CharField(max_length=255, blank=True, default='')
    salesperson_name = models.CharField(max_length=255, blank=True, default='')
    sales_head = models.CharField(max_length=255, blank=True, default='')
    project_manager = models.CharField(max_length=255, blank=True, default='')
    project_manager_head = models.CharField(max_length=255, blank=True, default='')
    
    expected_close_date = models.DateField(null=True, blank=True)
    probability = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Probability in percentage (0-100)")
    
    remark = models.TextField(blank=True, default='')
    won_lost_reason = models.TextField(blank=True, default='')
    
    # HubSpot Integration Fields
    hubspot_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.deal_id:
            import re
            all_deal_ids = Deal.objects.values_list('deal_id', flat=True)
            max_num = 0
            for d_id in all_deal_ids:
                if d_id:
                    match = re.search(r'DEAL-(\d+)', d_id)
                    if match:
                        try:
                            num = int(match.group(1))
                            if num > max_num:
                                max_num = num
                        except ValueError:
                            continue
            self.deal_id = f'DEAL-{max_num + 1:03d}'
        
        super().save(*args, **kwargs)
        
        from cost_sheets.models import CostSheet
        if not CostSheet.objects.filter(deal=self).exists():
            from django.utils import timezone
            CostSheet.objects.create(
                lead=self.lead,
                deal=self,
                project_name=self.project_name or self.deal_name,
                customer_name=self.customer.name if self.customer else '',
                sales_person=self.salesperson_name or (self.deal_owner.name if self.deal_owner else ''),
                project_manager=self.project_manager,
                cost_sheet_date=timezone.now().date(),
                overall_remarks=f"Auto-generated from Deal: {self.deal_name} ({self.deal_type}) - Description: {self.description[:100]}..."
            )

    def __str__(self):
        return f"{self.deal_id} - {self.deal_name}"
