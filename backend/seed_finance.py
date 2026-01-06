import os
import django
import sys
from datetime import date, timedelta

# Setup Django environment
sys.path.append(r'd:\Sales_tools_application\Sales_Tools__app\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from leads.models import Lead
from finance.models import Invoice, BankConnection, BankTransaction, BankTransactionStatus

def seed():
    # 1. Create/Get Leads
    lead1, _ = Lead.objects.get_or_create(
        lead_no='LEAD-001',
        defaults={'customer_name': 'Global Corp', 'project_name': 'Cloud Migration'}
    )
    lead2, _ = Lead.objects.get_or_create(
        lead_no='LEAD-002',
        defaults={'customer_name': 'Tech Solutions', 'project_name': 'AI Integration'}
    )

    # 2. Create Invoices
    Invoice.objects.get_or_create(
        invoice_no='INV-2024-001',
        defaults={
            'lead': lead1,
            'invoice_date': date.today() - timedelta(days=30),
            'due_date': date.today(),
            'total_amount': 5000.00,
            'open_balance': 5000.00,
            'status': 'OPEN'
        }
    )
    Invoice.objects.get_or_create(
        invoice_no='INV-2024-002',
        defaults={
            'lead': lead2,
            'invoice_date': date.today() - timedelta(days=15),
            'due_date': date.today() + timedelta(days=15),
            'total_amount': 2500.00,
            'open_balance': 2500.00,
            'status': 'OPEN'
        }
    )

    # 3. Create Bank Connection
    bank, _ = BankConnection.objects.get_or_create(
        bank_name='ICICI Bank',
        account_number='1234567890',
        defaults={'is_active': True}
    )

    # 4. Create Bank Transactions
    BankTransaction.objects.get_or_create(
        bank_connection=bank,
        transaction_date=date.today(),
        description='NEFT FROM GLOBAL CORP UTR123456',
        defaults={
            'amount_received': 5000.00,
            'status': BankTransactionStatus.FOR_REVIEW
        }
    )
    BankTransaction.objects.get_or_create(
        bank_connection=bank,
        transaction_date=date.today() - timedelta(days=1),
        description='IMPS FROM TECH SOLUTIONS UTR987654',
        defaults={
            'amount_received': 1000.00,
            'status': BankTransactionStatus.FOR_REVIEW
        }
    )

    print("Seed data created successfully")

if __name__ == '__main__':
    seed()
