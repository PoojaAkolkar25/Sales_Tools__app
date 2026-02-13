from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from .models import Deal, DealStage
from cost_sheets.models import CostSheet
from estimates.models import Estimate
from sales_orders.models import SalesOrder
from finance.models import Invoice, ReceiptAdjustment

# Define hierarchy for linear progression
STAGE_HIERARCHY = {
    DealStage.DEAL_CREATED: 1,
    DealStage.COST_SHEET: 2,
    DealStage.ESTIMATES: 3,
    DealStage.SALES_ORDER: 4,
    DealStage.INVOICE: 5,
    DealStage.PAYMENT: 6,
}

def update_deal_stage(deal, target_stage):
    """
    Updates the deal stage only if the new stage is strictly 'higher'
    in the defined workflow hierarchy.
    """
    if not deal:
        return

    current_rank = STAGE_HIERARCHY.get(deal.stage, 0)
    target_rank = STAGE_HIERARCHY.get(target_stage, 0)

    if target_rank > current_rank:
        print(f"DEBUG: Updating Deal {deal.deal_id} status from {deal.stage} to {target_stage}")
        deal.stage = target_stage
        deal.save(update_fields=['stage', 'updated_at'])

# 0. Deal Created -> Set stage to DEAL_CREATED
@receiver(post_save, sender=Deal)
def deal_post_save(sender, instance, created, **kwargs):
    if created:
        # Ensure the stage is set to DEAL_CREATED when first created
        if instance.stage != DealStage.DEAL_CREATED:
            instance.stage = DealStage.DEAL_CREATED
            instance.save(update_fields=['stage', 'updated_at'])

# 1. Cost Sheet Created/Updated -> Update Deal to COST_SHEET
@receiver(post_save, sender=CostSheet)
def cost_sheet_post_save(sender, instance, created, **kwargs):
    print(f"DEBUG: Cost sheet signal triggered. Created={created}, Deal={instance.deal}")
    if instance.deal:
        print(f"DEBUG: Updating deal {instance.deal.deal_id} to COST_SHEET stage")
        update_deal_stage(instance.deal, DealStage.COST_SHEET)


# 2. Estimate Created/Updated -> Update Deal to ESTIMATES
@receiver(post_save, sender=Estimate)
def estimate_post_save(sender, instance, created, **kwargs):
    if instance.deal:
        update_deal_stage(instance.deal, DealStage.ESTIMATES)

# 3. Sales Order Created (linked to Estimate) -> Update Deal to SALES_ORDER
# Since SalesOrder links to Estimate via M2M, we listen to m2m_changed
@receiver(m2m_changed, sender=SalesOrder.estimates.through)
def sales_order_estimates_changed(sender, instance, action, reverse, model, pk_set, **kwargs):
    if action == 'post_add':
        # instance is the SalesOrder
        # We need to find the related deals from the added estimates
        # pk_set contains the IDs of the added estimates
        estimates = model.objects.filter(pk__in=pk_set)
        for estimate in estimates:
            if estimate.deal:
                update_deal_stage(estimate.deal, DealStage.SALES_ORDER)

# 4. Invoice Created -> Update Deal to INVOICE
@receiver(post_save, sender=Invoice)
def invoice_post_save(sender, instance, created, **kwargs):
    if created and instance.deal:
        update_deal_stage(instance.deal, DealStage.INVOICE)

# 5. Payment Applied (ReceiptAdjustment created) -> Update Deal to PAYMENT
@receiver(post_save, sender=ReceiptAdjustment)
def receipt_adjustment_post_save(sender, instance, created, **kwargs):
    if created and instance.invoice and instance.invoice.deal:
        update_deal_stage(instance.invoice.deal, DealStage.PAYMENT)
