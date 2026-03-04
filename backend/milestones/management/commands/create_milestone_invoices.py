from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from milestones.models import Milestone, MilestoneStatus
from milestones.services import MilestoneService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Automatically create draft invoices for milestones due within 1 week'

    def handle(self, *args, **options):
        today = timezone.now().date()
        next_week = today + timedelta(days=7)
        
        # Find DRAFT milestones due within the next 7 days
        milestones = Milestone.objects.filter(
            status=MilestoneStatus.DRAFT,
            due_date__lte=next_week,
            invoice__isnull=True
        )
        
        self.stdout.write(f"Found {milestones.count()} milestones for auto-invoice creation.")
        
        count = 0
        for milestone in milestones:
            try:
                MilestoneService.create_invoice_for_milestone(milestone)
                self.stdout.write(self.style.SUCCESS(f"Created invoice for Milestone: {milestone.milestone_no} (SO: {milestone.sales_order.so_number})"))
                count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to create invoice for Milestone {milestone.id}: {str(e)}"))
                logger.error(f"Auto-invoice creation failed for milestone {milestone.id}: {str(e)}", exc_info=True)
                
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {count} milestones."))
