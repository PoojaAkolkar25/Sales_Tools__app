from django.db.models.signals import post_save
from django.dispatch import receiver
from cost_sheets.models import CostSheet
from .models import Estimate, EstimateStatus, EstimateItem

import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=CostSheet)
def sync_estimate_on_cost_sheet_save(sender, instance, **kwargs):
    """
    Auto-create or update a draft Estimate whenever a Cost Sheet is saved as PENDING (Draft) or SUBMITTED.
    """
    try:
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
                # Sync values if estimate already exists and is still in draft
                if estimate.status == EstimateStatus.DRAFT:
                    estimate.total_cost = instance.total_estimated_cost
                    estimate.total_margin = instance.total_estimated_margin
                    estimate.total_price = instance.total_estimated_price
                    # Ensure deal is synced if it changed
                    estimate.deal = instance.deal
                    estimate.save()

            # Now sync items if it's a draft
            if estimate.status == EstimateStatus.DRAFT:
                # Clear existing items
                estimate.items.all().delete()
                sr_no = 1
                
                # Helper to create estimate item
                def add_item(particulars, description, qty, rate, amount):
                    nonlocal sr_no
                    EstimateItem.objects.create(
                        estimate=estimate,
                        sr_no=sr_no,
                        particulars=particulars,
                        description=description,
                        qty=qty,
                        rate=rate,
                        amount=amount
                    )
                    sr_no += 1

                # License Items
                for item in instance.license_items.all():
                    add_item(
                        f"License - {item.name}",
                        f"{item.type} {item.period}".strip(),
                        item.qty,
                        item.estimated_price / item.qty if item.qty > 0 else 0,
                        item.estimated_price
                    )

                # Implementation Items
                for item in instance.implementation_items.all():
                    add_item(
                        f"Implementation - {item.category}",
                        f"{item.num_resources} resources x {item.num_days} days. {item.remark}".strip(),
                        item.num_days,
                        item.estimated_price / item.num_days if item.num_days > 0 else 0,
                        item.estimated_price
                    )

                # Support Items
                for item in instance.support_items.all():
                    add_item(
                        f"Support - {item.category}",
                        f"{item.num_resources} resources x {item.num_days} days. {item.remark}".strip(),
                        item.num_days,
                        item.estimated_price / item.num_days if item.num_days > 0 else 0,
                        item.estimated_price
                    )

                # Infra Items
                for item in instance.infra_items.all():
                    add_item(
                        f"Infra - {item.name}",
                        f"{item.months} months. {item.remark}".strip(),
                        item.qty,
                        item.estimated_price / item.qty if item.qty > 0 else 0,
                        item.estimated_price
                    )

                # Other Items
                for item in instance.other_items.all():
                    add_item(
                        item.description or "Other Item",
                        item.remark,
                        1,
                        item.estimated_price,
                        item.estimated_price
                    )
    except Exception as e:
        logger.error(f"Error syncing estimate for CostSheet {instance.id}: {str(e)}")
