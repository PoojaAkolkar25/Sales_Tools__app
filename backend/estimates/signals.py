from django.db.models.signals import post_save
from django.dispatch import receiver
from cost_sheets.models import CostSheet
from .models import Estimate, EstimateStatus

@receiver(post_save, sender=CostSheet)
def sync_estimate_on_cost_sheet_save(sender, instance, **kwargs):
    """
    Auto-create or update a draft Estimate whenever a Cost Sheet is saved as PENDING (Draft) or SUBMITTED.
    """
    if instance.status in ['PENDING', 'SUBMITTED'] and instance.deal:
        estimate, created = Estimate.objects.get_or_create(
            cost_sheet=instance,
            defaults={
                'deal': instance.deal,
                'status': EstimateStatus.DRAFT,
                'total_cost': instance.total_estimated_cost,
                'total_margin': instance.total_estimated_margin,
                'total_price': instance.total_estimated_price,
                'version': 1,
                'is_latest': True,
                'column_labels': {
                    'sr_no': 'Sr.No.',
                    'particulars': 'Particulars',
                    'description': 'Description',
                    'hsn_sac': 'HSN/SAC',
                    'qty': 'Qty',
                    'rate': 'Rate',
                    'amount': 'Amount'
                }
            }
        )
        
        if not created:
            # Sync values if estimate already exists
            estimate.total_cost = instance.total_estimated_cost
            estimate.total_margin = instance.total_estimated_margin
            estimate.total_price = instance.total_estimated_price
            # Ensure deal is synced if it changed
            estimate.deal = instance.deal
            estimate.save()
