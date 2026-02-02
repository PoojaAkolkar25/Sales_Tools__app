from django.db import models
from django.utils import timezone

class Lead(models.Model):
    class CompanyChoices(models.TextChoices):
        AE_IND = 'AE IND', 'AE IND'
        AE_USA = 'AE USA', 'AE USA'

    company = models.CharField(max_length=10, choices=CompanyChoices.choices, default=CompanyChoices.AE_IND)
    lead_no = models.CharField(max_length=50, unique=True, blank=True)
    customer_name = models.CharField(max_length=255)
    project_name = models.CharField(max_length=255)
    project_manager = models.CharField(max_length=255, blank=True, default='')
    sales_person = models.CharField(max_length=255, blank=True, default='')
    email = models.EmailField(blank=True, null=True)
    lead_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.lead_no:
            prefix = "AEINDLD" if self.company == self.CompanyChoices.AE_IND else "AEUSALD"
            
            import re
            last_lead = Lead.objects.filter(lead_no__startswith=prefix).order_by('lead_no').last()
            if last_lead:
                # Extract number from AEINDLD0001 or AEUSALD0001
                match = re.search(r'(\d+)$', last_lead.lead_no)
                if match:
                    last_num = int(match.group(1))
                    self.lead_no = f"{prefix}{last_num + 1:04d}"
                else:
                    self.lead_no = f"{prefix}0001"
            else:
                self.lead_no = f"{prefix}0001"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lead_no} - {self.customer_name}"
