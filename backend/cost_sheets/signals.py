from django.db.models.signals import post_save
from django.dispatch import receiver
from deals.models import Deal
from .models import CostSheet, CostSheetStatus

@receiver(post_save, sender=Deal)
def create_cost_sheet_on_deal_creation(sender, instance, created, **kwargs):
    """
    Automatically creates a draft Cost Sheet when a new Deal is created.
    """
    if created:
        print(f"DEBUG: Deal created: {instance.deal_id}. Creating Cost Sheet...")
        from django.utils import timezone
        if not CostSheet.objects.filter(deal=instance).exists():
            cs = CostSheet.objects.create(
                deal=instance,
                lead=instance.lead,
                customer_name=instance.customer.name if instance.customer else '',
                project_name=instance.deal_name,
                sales_person=instance.salesperson_name,
                project_manager=instance.project_manager,
                cost_sheet_date=timezone.now().date(),
                status=CostSheetStatus.PENDING,
                overall_remarks=f"Auto-generated from Project: {instance.deal_name}"
            )
            print(f"DEBUG: Cost Sheet created: {cs.cost_sheet_no}")
        else:
            print(f"DEBUG: Cost Sheet already exists for Deal {instance.deal_id}")
