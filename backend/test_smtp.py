import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

print(f"EMAIL_HOST:      {settings.EMAIL_HOST}")
print(f"EMAIL_PORT:      {settings.EMAIL_PORT}")
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"USE_TLS:         {settings.EMAIL_USE_TLS}")
print(f"FROM:            {settings.DEFAULT_FROM_EMAIL}")
print()

try:
    send_mail(
        subject="AutomationEdge – SMTP Test",
        message="SMTP is working correctly. This is a test email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=['pooja.akolkar@valuedx.com'],
        fail_silently=False,
    )
    print("✓ Test email sent successfully to pooja.akolkar@valuedx.com")
except Exception as e:
    print(f"✗ SMTP ERROR: {type(e).__name__}: {e}")
