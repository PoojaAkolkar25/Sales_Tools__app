from django.db import models
from leads.models import Lead

class InvoiceStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    PARTIAL = 'PARTIAL', 'Partially Paid'
    PAID = 'PAID', 'Paid'

class Invoice(models.Model):
    invoice_no = models.CharField(max_length=100, unique=True)
    invoice_date = models.DateField()
    due_date = models.DateField()
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='invoices')
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    open_balance = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(
        max_length=20, 
        choices=InvoiceStatus.choices, 
        default=InvoiceStatus.OPEN
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.invoice_no

class BankConnection(models.Model):
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=100)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    client_id = models.CharField(max_length=255, blank=True, null=True)
    oauth_credentials = models.TextField(blank=True, null=True)
    token = models.CharField(max_length=255, blank=True, null=True)
    secret_key = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.bank_name} - {self.account_number}"

class BankTransactionStatus(models.TextChoices):
    FOR_REVIEW = 'FOR_REVIEW', 'For Review'
    CATEGORIZED = 'CATEGORIZED', 'Categorized'
    EXCLUDED = 'EXCLUDED', 'Excluded'

class BankTransactionSource(models.TextChoices):
    AUTO = 'AUTO', 'Auto Download'
    MANUAL = 'MANUAL', 'Manual Upload'

class BankTransaction(models.Model):
    bank_connection = models.ForeignKey(BankConnection, on_delete=models.CASCADE, related_name='transactions')
    transaction_date = models.DateField()
    description = models.TextField() # UTR / Description / Narration
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    amount_received = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(
        max_length=20, 
        choices=BankTransactionStatus.choices, 
        default=BankTransactionStatus.FOR_REVIEW
    )
    source = models.CharField(
        max_length=10,
        choices=BankTransactionSource.choices,
        default=BankTransactionSource.AUTO
    )
    reconciliation_date = models.DateField(blank=True, null=True)
    exclusion_reason = models.CharField(max_length=255, blank=True, null=True)
    
    # New fields as per request
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    value_date = models.DateField(blank=True, null=True)
    posted_date = models.DateField(blank=True, null=True)
    cheque_ref_no = models.CharField(max_length=100, blank=True, null=True, verbose_name="Cheque No./Ref. No.")
    transaction_remarks = models.TextField(blank=True, null=True)
    withdrawal_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    deposit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_date} - {self.amount_received}"

class ReceiptStatus(models.TextChoices):
    UNRECONCILED = 'UNRECONCILED', 'Unreconciled'
    RECONCILED = 'RECONCILED', 'Reconciled'

class ReceiptVoucher(models.Model):
    receipt_no = models.CharField(max_length=100, unique=True, blank=True)
    customer_name = models.CharField(max_length=255, blank=True) # Added for unique customer select
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='receipts', null=True, blank=True)
    payment_date = models.DateField()
    reference_number = models.CharField(max_length=100, blank=True)
    payment_method = models.CharField(max_length=100)
    deposit_to = models.ForeignKey(BankConnection, on_delete=models.SET_NULL, null=True, related_name='receipt_vouchers')
    amount_received = models.DecimalField(max_digits=15, decimal_places=2)
    tds_receivable = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1.0000)
    status = models.CharField(
        max_length=20, 
        choices=ReceiptStatus.choices, 
        default=ReceiptStatus.UNRECONCILED
    )
    bank_transaction = models.ForeignKey(
        BankTransaction, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='matched_receipts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.receipt_no:
            # Simple auto-increment for now
            last_receipt = ReceiptVoucher.objects.order_by('id').last()
            if not last_receipt:
                self.receipt_no = 'RV-001'
            else:
                last_id = last_receipt.id
                self.receipt_no = f'RV-{last_id + 1:03d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.receipt_no

class ReceiptAdjustment(models.Model):
    receipt_voucher = models.ForeignKey(ReceiptVoucher, on_delete=models.CASCADE, related_name='adjustments')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='adjustments')
    payment_amount = models.DecimalField(max_digits=15, decimal_places=2)
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    bank_charges = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.receipt_voucher.receipt_no} - {self.invoice.invoice_no}"

class ReceiptAttachment(models.Model):
    receipt_voucher = models.ForeignKey(ReceiptVoucher, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='receipt_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
