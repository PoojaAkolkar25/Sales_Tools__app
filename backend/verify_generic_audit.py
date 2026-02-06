
import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from deals.models import Deal, AuditTrail
from datetime import date

def verify_generic_audit():
    print("Verifying Generic Audit Trail Implementation...")
    
    # 1. Create a dummy user
    user, created = User.objects.get_or_create(username='generic_audit_tester')
    if created:
        user.set_password('testpass')
        user.save()
    
    # 2. Create a Deal (Simulating generic tracking)
    print("Creating a new Deal to test generic logs...")
    deal = Deal.objects.create(
        deal_name="Generic Audit Deal",
        deal_amount=50000,
        stage="DEAL_CREATED",
        deal_date=date.today()
    )
    
    # Log creation using generic fields (Simulating ViewSet)
    ct = ContentType.objects.get_for_model(deal)
    AuditTrail.objects.create(
        content_type=ct,
        object_id=deal.id,
        user=user,
        field_name="Deal Created",
        old_value="",
        new_value=f"Deal created with ID {deal.deal_id}",
        action_type=AuditTrail.ActionType.CREATE
    )
    
    # 3. Verify Log Retrieval
    # Verify we can find it by content_type + object_id
    logs = AuditTrail.objects.filter(content_type=ct, object_id=deal.id)
    print(f"Generic Logs found: {logs.count()}")
    
    if logs.exists():
        log = logs.first()
        print(f"PASS: Log found for {log.content_object}. Action: {log.action_type}")
    else:
        print("FAIL: No generic logs found.")
        
    # 4. Cleanup
    deal.delete()
    print("Cleanup complete.")

if __name__ == '__main__':
    verify_generic_audit()
