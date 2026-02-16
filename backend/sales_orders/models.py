from django.db import models
from django.contrib.auth.models import User
from leads.models import Lead
from deals.models import Customer, Product

class SalesOrderStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    CANCELLED = 'CANCELLED', 'Cancelled'

class IncomingEmail(models.Model):
    sender = models.EmailField()
    subject = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.sender} - {self.subject}"

class PurchaseOrderFile(models.Model):
    email = models.ForeignKey(IncomingEmail, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    file = models.FileField(upload_to='po_files/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name

class SalesOrder(models.Model):
    so_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    order_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=SalesOrderStatus.choices, default=SalesOrderStatus.DRAFT)
    
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    customer_name = models.CharField(max_length=255, blank=True)
    customer_code = models.CharField(max_length=50, blank=True)
    po_number = models.CharField(max_length=100, blank=True)
    po_date = models.DateField(null=True, blank=True)
    po_from_date = models.DateField(null=True, blank=True)
    po_to_date = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    
    billing_address = models.TextField(blank=True)
    shipping_address = models.TextField(blank=True)
    currency = models.CharField(max_length=10, default='INR')
    
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Reference to extraction source
    po_file = models.ForeignKey(PurchaseOrderFile, on_delete=models.SET_NULL, null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Link to Estimates (BRD Requirement: Traceability)
    estimates = models.ManyToManyField('estimates.Estimate', related_name='sales_orders', blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.status == SalesOrderStatus.SUBMITTED and not self.so_number:
            # Generate SO number on submission
            last_so = SalesOrder.objects.filter(so_number__startswith='SO-').order_by('so_number').last()
            # Simple increment logic for now
            count = SalesOrder.objects.filter(status=SalesOrderStatus.SUBMITTED).count() + 1
            self.so_number = f"SO-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.so_number or f"Draft SO ({self.po_number})"

class SalesOrderItem(models.Model):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=255, blank=True, default='') # Manual text entry support
    description = models.TextField(blank=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        initial = self.qty * self.rate
        # If discount_percent is provided, calculate absolute discount
        if self.discount_percent > 0:
            self.discount = initial * (self.discount_percent / 100)
        
        taxable_amount = initial - self.discount
        
        # If tax_percent is provided, calculate absolute tax
        if self.tax_percent > 0:
            self.tax = taxable_amount * (self.tax_percent / 100)
            
        self.amount = taxable_amount + self.tax
        super().save(*args, **kwargs)
