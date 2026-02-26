from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class ResourceStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    ALLOCATED = 'ALLOCATED', 'Allocated'
    MAINTENANCE = 'MAINTENANCE', 'Under Maintenance'

class ResourceCategory(models.TextChoices):
    PHYSICAL = 'PHYSICAL', 'Physical'
    VIRTUAL = 'VIRTUAL', 'Virtual'

class Resource(models.Model):
    resource_type = models.CharField(max_length=50, default='Server')
    server_name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=ResourceCategory.choices, default=ResourceCategory.VIRTUAL)
    configuration = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=ResourceStatus.choices, default=ResourceStatus.AVAILABLE)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.server_name} ({self.category})"

class RequestStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    PENDING_IT = 'PENDING_IT', 'Pending IT Head Approval'
    PENDING_FINANCE = 'PENDING_FINANCE', 'Pending Finance Head Approval'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    ISSUED = 'ISSUED', 'Issued'

class ResourceRequest(models.Model):
    # Request Information
    request_date = models.DateField(default=timezone.now)
    form_number = models.CharField(max_length=50, unique=True, blank=True)
    status = models.CharField(max_length=50, choices=RequestStatus.choices, default=RequestStatus.DRAFT)
    
    # Requestor Details
    requestor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resource_requests')
    employee_id = models.CharField(max_length=50) 
    department = models.CharField(max_length=100)
    designation = models.CharField(max_length=100, blank=True, null=True)
    
    # Project Details
    project_name = models.CharField(max_length=255)
    project_code = models.CharField(max_length=100, blank=True, null=True)
    client_name = models.CharField(max_length=255, blank=True, null=True)
    environment = models.CharField(max_length=50, choices=[
        ('DEVELOPMENT', 'Development'),
        ('QA', 'QA'),
        ('PRODUCTION', 'Production')
    ])
    
    # Resource Details - Server Configuration
    resource_type_requested = models.CharField(max_length=50, default='Server')
    quantity = models.IntegerField(default=1)
    server_type = models.CharField(max_length=50) # e.g., EC2
    server_category = models.CharField(max_length=50) # Physical/Virtual
    cloud_provider = models.CharField(max_length=50, blank=True, null=True)
    region = models.CharField(max_length=50, blank=True, null=True)
    instance_type = models.CharField(max_length=50, blank=True, null=True)
    os = models.CharField(max_length=100)
    cpu_cores = models.IntegerField()
    ram_gb = models.IntegerField()
    storage_type = models.CharField(max_length=50)
    storage_size_gb = models.IntegerField()

    # 5. Database / RDS Details
    database_required = models.BooleanField(default=False)
    rds_type = models.CharField(max_length=100, blank=True, null=True)
    database_engine = models.CharField(max_length=100, blank=True, null=True)
    db_storage_gb = models.IntegerField(null=True, blank=True)
    backup_required = models.BooleanField(default=False)
    
    # Usage & Justification
    purpose_of_request = models.TextField()
    business_justification = models.TextField()
    expected_start_date = models.DateField()
    expected_end_date = models.DateField(blank=True, null=True)
    
    # 7. Approval Section (System Controlled)
    # IT Head Approval
    it_head_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='it_approvals')
    it_head_remarks = models.TextField(blank=True, null=True)
    it_head_approved_at = models.DateTimeField(null=True, blank=True)
    
    # Finance Head Approval
    finance_head_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='finance_approvals')
    finance_head_remarks = models.TextField(blank=True, null=True)
    finance_head_approved_at = models.DateTimeField(null=True, blank=True)
    
    # 8. Issuance Details
    resource_assigned = models.ForeignKey(Resource, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments')
    remarks = models.TextField(blank=True, null=True) # General remarks
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_requests')
    issued_at = models.DateTimeField(null=True, blank=True)
    
    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.form_number:
            import re
            prefix = "SRV-REQ-"
            last_req = ResourceRequest.objects.filter(form_number__startswith=prefix).order_by('form_number').last()
            if last_req:
                match = re.search(r'(\d+)$', last_req.form_number)
                if match:
                    last_num = int(match.group(1))
                    self.form_number = f"{prefix}{last_num + 1:06d}"
                else:
                    self.form_number = f"{prefix}000001"
            else:
                self.form_number = f"{prefix}000001"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.form_number} - {self.requestor.get_full_name()}"
