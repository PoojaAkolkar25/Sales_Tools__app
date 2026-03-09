from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'DEPRECATED: Auto-invoicing is now disabled as per user requirements.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Auto-invoicing management command is disabled. Milestones must be invoiced manually via 'Issue Invoice' facility."))
