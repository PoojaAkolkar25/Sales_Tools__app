from django.db import models
from sales_orders.models import SalesOrder
from finance.models import Invoice

class MilestoneStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    INVOICED = 'INVOICED', 'Invoiced'

class Milestone(models.Model):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='milestones')
    milestone_no = models.CharField(max_length=50) # e.g., "M1", "Down Payment"
    
    period_from = models.DateField(null=True, blank=True)
    period_to = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    
    description = models.TextField()
    
    qty = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=15, decimal_places=2)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    status = models.CharField(
        max_length=20, 
        choices=MilestoneStatus.choices, 
        default=MilestoneStatus.DRAFT
    )
    
    # Link to Invoice when created
    invoice = models.ForeignKey(
        Invoice, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='milestone_ref'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.milestone_no} - {self.sales_order.so_number}"
