from django.db import models

class Lead(models.Model):
    lead_no = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=255)
    project_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.lead_no} - {self.customer_name}"
