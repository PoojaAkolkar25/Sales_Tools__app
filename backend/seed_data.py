import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from leads.models import Lead
from cost_sheets.models import CostSheet, LicenseItem, CostSheetStatus
from decimal import Decimal

from django.contrib.auth.models import User, Group

def seed():
    # Create Groups
    admin_group, _ = Group.objects.get_or_create(name='app_admin')
    user_group, _ = Group.objects.get_or_create(name='app_user')

    # Create Admin User
    if not User.objects.filter(username='admin').exists():
        admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
        admin_user.groups.add(admin_group)
        print("Created admin user")

    leads = [
        {'lead_no': 'LEAD-001', 'customer_name': 'Global Tech Solutions', 'project_name': 'Enterprise ERP Upgrade'},
        {'lead_no': 'LEAD-002', 'customer_name': 'Innovative Healthcare', 'project_name': 'Clinical Data Management'},
        {'lead_no': 'LEAD-003', 'customer_name': 'Future Finance', 'project_name': 'Mobile Banking App'},
    ]

    for lead_data in leads:
        lead, created = Lead.objects.get_or_create(lead_no=lead_data['lead_no'], defaults=lead_data)
        if created:
            print(f"Created lead: {lead.lead_no}")
        else:
            print(f"Lead {lead.lead_no} already exists")

    # Add a dummy Cost Sheet for LEAD-001
    lead1 = Lead.objects.get(lead_no='LEAD-001')
    cs, created = CostSheet.objects.get_or_create(
        cost_sheet_no='CS-001',
        lead=lead1,
        defaults={
            'status': CostSheetStatus.PENDING,
            'total_estimated_cost': Decimal('1000.00'),
            'total_estimated_margin': Decimal('200.00'),
            'total_estimated_price': Decimal('1200.00')
        }
    )
    if created:
        print(f"Created CostSheet: {cs.cost_sheet_no}")
        # Add a dummy License Item
        LicenseItem.objects.create(
            cost_sheet=cs,
            name='Standard License',
            type='Subscription',
            rate=Decimal('500.00'),
            qty=2,
            period='Annual',
            margin_percentage=Decimal('20.00'),
            estimated_cost=Decimal('1000.00'),
            estimated_margin_amount=Decimal('200.00'),
            estimated_price=Decimal('1200.00')
        )
        print(f"Created LicenseItem for {cs.cost_sheet_no}")
    else:
        print(f"CostSheet {cs.cost_sheet_no} already exists")

if __name__ == '__main__':
    seed()
