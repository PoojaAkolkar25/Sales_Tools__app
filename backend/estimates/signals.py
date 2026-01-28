from django.db.models.signals import post_save
from django.dispatch import receiver
from cost_sheets.models import CostSheet
from .models import Estimate, EstimateStatus

@receiver(post_save, sender=CostSheet)
def create_estimate_on_cost_sheet_submission(sender, instance, **kwargs):
    # BRD: An Estimate shall be automatically generated once the Cost Sheet is submitted.
    if instance.status == 'SUBMITTED':
        # Check if estimate already exists for this cost sheet
        if not Estimate.objects.filter(cost_sheet=instance).exists():
            Estimate.objects.create(
                cost_sheet=instance,
                deal=instance.deal,
                status=EstimateStatus.DRAFT,
                total_cost=instance.total_estimated_cost,
                total_margin=instance.total_estimated_margin,
                total_price=instance.total_estimated_price,
                version=1,
                is_latest=True
            )
