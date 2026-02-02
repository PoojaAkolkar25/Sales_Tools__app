from django.core.management.base import BaseCommand
from leads.models import Lead
from deals.models import Deal
from estimates.models import Estimate, Renewal
from cost_sheets.models import CostSheet
from finance.models import Invoice

class Command(BaseCommand):
    help = 'Cleans up accidental "Format: DD/MMM/YYYY" strings from database fields'

    def handle(self, *args, **options):
        unwanted_strings = [
            "Format: DD/MMM/YYYY",
            "Format: DD/MMM/YYYY (current date)"
        ]
        
        models_to_clean = [
            (Lead, ['project_manager', 'sales_person']),
            (Deal, ['description', 'remark', 'won_lost_reason', 'inside_salesperson', 'inside_sales_head', 'salesperson_name', 'sales_head', 'project_manager', 'project_manager_head']),
            (Estimate, ['description_memo', 'terms_conditions', 'commercial_terms', 'approval_notes']),
            (Renewal, ['notes']),
            (CostSheet, ['license_remarks', 'implementation_remarks', 'support_remarks', 'infra_remarks', 'other_remarks', 'overall_remarks']),
            (Invoice, ['billing_address', 'shipping_address', 'approval_comments'])
        ]
        
        for model, fields in models_to_clean:
            self.stdout.write(f"Cleaning model: {model.__name__}")
            objects = model.objects.all()
            for obj in objects:
                updated = False
                for field in fields:
                    val = getattr(obj, field)
                    if val:
                        original_val = val
                        for unwanted in unwanted_strings:
                            val = val.replace(unwanted, "").strip()
                        
                        if val != original_val:
                            setattr(obj, field, val)
                            updated = True
                
                if updated:
                    obj.save()
                    self.stdout.write(self.style.SUCCESS(f"  Cleaned {model.__name__} ID: {obj.id}"))

        self.stdout.write(self.style.SUCCESS("Cleanup complete."))
