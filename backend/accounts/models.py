from django.db import models
from django.contrib.auth.models import User


class UserStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'
    ON_LEAVE = 'ON_LEAVE', 'On Leave'
    EXITED = 'EXITED', 'Exited'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    employee_id = models.CharField(max_length=50, unique=True, blank=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    reporting_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    region = models.CharField(max_length=100, blank=True, null=True)
    state = models.ForeignKey('finance.StateMaster', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE)

    def save(self, *args, **kwargs):
        if not self.employee_id:
            from django.db.models import Max
            import re
            
            # Filter for IDs that follow the EMP pattern and get the max
            last_emp = UserProfile.objects.filter(
                employee_id__startswith='EMP'
            ).aggregate(max_id=Max('employee_id'))['max_id']
            
            if last_emp:
                # Find the numeric part to increment
                match = re.search(r'(\d+)$', last_emp)
                if match:
                    last_num = int(match.group(1))
                    self.employee_id = f"EMP{last_num + 1:04d}"
                else:
                    self.employee_id = "EMP0001"
            else:
                self.employee_id = "EMP0001"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Profile for {self.user.username} ({self.employee_id})"
