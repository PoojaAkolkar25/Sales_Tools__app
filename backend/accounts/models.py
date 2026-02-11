from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    state = models.ForeignKey('finance.StateMaster', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Profile for {self.user.username}"
