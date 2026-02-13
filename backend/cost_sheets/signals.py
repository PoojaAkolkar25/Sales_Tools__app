from django.db.models.signals import post_save
from django.dispatch import receiver
from deals.models import Deal, DealStage
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

@receiver(post_save, sender=CostSheet)
def update_deal_stage_on_cost_sheet_save(sender, instance, created, **kwargs):
    """
    Update the deal stage to COST_SHEET when a cost sheet is saved.
    """
    print(f"DEBUG: Cost sheet signal triggered. Created={created}, Deal={instance.deal}")
    if instance.deal:
        # Define stage hierarchy
        STAGE_HIERARCHY = {
            DealStage.DEAL_CREATED: 1,
            DealStage.COST_SHEET: 2,
            DealStage.ESTIMATES: 3,
            DealStage.SALES_ORDER: 4,
            DealStage.INVOICE: 5,
            DealStage.PAYMENT: 6,
        }
        
        current_rank = STAGE_HIERARCHY.get(instance.deal.stage, 0)
        target_rank = STAGE_HIERARCHY.get(DealStage.COST_SHEET, 0)
        
        if target_rank > current_rank:
            print(f"DEBUG: Updating Deal {instance.deal.deal_id} from {instance.deal.stage} to COST_SHEET")
            instance.deal.stage = DealStage.COST_SHEET
            instance.deal.save(update_fields=['stage', 'updated_at'])
            print(f"DEBUG: Deal stage updated successfully")
        else:
            print(f"DEBUG: Deal stage not updated. Current: {instance.deal.stage}, Target: COST_SHEET")

