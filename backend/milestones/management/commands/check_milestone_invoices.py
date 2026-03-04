"""
Management command: check_milestone_invoices

Finds all DRAFT milestones whose due_date is within the next 7 days
and automatically creates a draft invoice for each one.

Usage:
    python manage.py check_milestone_invoices

Schedule via cron / Windows Task Scheduler to run daily:
    0 8 * * * /path/to/venv/bin/python manage.py check_milestone_invoices
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-creates draft invoices for milestones due within the next 7 days'

    def handle(self, *args, **options):
        from milestones.models import Milestone, MilestoneStatus
        from milestones.views import MilestoneViewSet
        from finance.models import InvoiceStatus

        today = timezone.now().date()
        seven_days_from_now = today + timedelta(days=7)

        # Find all DRAFT milestones with due_date within the next 7 days that don't have an invoice
        due_milestones = Milestone.objects.filter(
            status=MilestoneStatus.DRAFT,
            due_date__lte=seven_days_from_now,
            due_date__gte=today,
            invoice__isnull=True
        ).select_related('sales_order', 'sales_order__customer')

        count = due_milestones.count()
        self.stdout.write(f'Found {count} milestone(s) due within 7 days needing invoice creation.')

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No milestones to process.'))
            return

        # Use the ViewSet helper method to create invoices
        viewset = MilestoneViewSet()
        success_count = 0
        error_count = 0

        for milestone in due_milestones:
            try:
                viewset._internal_create_invoice(milestone)
                success_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Created draft invoice for Milestone {milestone.milestone_no} '
                        f'(SO: {milestone.sales_order.so_number}, Due: {milestone.due_date})'
                    )
                )
            except Exception as e:
                error_count += 1
                logger.error(
                    f'Failed to create invoice for Milestone {milestone.id} '
                    f'({milestone.milestone_no}): {e}',
                    exc_info=True
                )
                self.stdout.write(
                    self.style.ERROR(
                        f'  ✗ Failed for Milestone {milestone.milestone_no}: {e}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. Created: {success_count} invoice(s). Errors: {error_count}.'
            )
        )
