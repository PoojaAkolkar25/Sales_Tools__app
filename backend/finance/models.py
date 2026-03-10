from django.db import models
from leads.models import Lead
from deals.models import GSTCustomerType
import re

class StateMaster(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=2, unique=True, help_text="GST State Code (e.g., 27 for Maharashtra)")
    is_union_territory = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "States"

    def __str__(self):
        return f"{self.code} - {self.name}" 

class EntityType(models.TextChoices):
    AE_IND = 'AE_IND', 'AE ind'
    AE_USA = 'AE_USA', 'AE Usa'

class IndustryType(models.TextChoices):
    IT = 'IT', 'IT'
    BFSI = 'BFSI', 'BFSI'
    MANUFACTURING = 'MANUFACTURING', 'Manufacturing'
    HEALTHCARE = 'HEALTHCARE', 'Healthcare'
    RETAIL = 'RETAIL', 'Retail'
    TELECOM = 'TELECOM', 'Telecom'
    EDUCATION = 'EDUCATION', 'Education'
    GOVERNMENT = 'GOVERNMENT', 'Government'
    AUTOMOTIVE = 'AUTOMOTIVE', 'Automotive'
    FMCG = 'FMCG', 'FMCG'
    OTHER = 'OTHER', 'Other'

class CompanyProfile(models.Model):
    # 5.1 Company Basic Details
    name = models.CharField(max_length=255)
    entity = models.CharField(max_length=255, blank=True, null=True)
    customer_id = models.CharField(max_length=50, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    alias_name = models.CharField(max_length=100, blank=True, null=True)
    logo = models.ImageField(upload_to='company/logos/', blank=True, null=True)
    
    # 5.2 Primary Mailing Address
    address_line_1 = models.TextField(blank=True, null=True)
    address_line_2 = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=100, default='India')
    state = models.ForeignKey(StateMaster, on_delete=models.SET_NULL, null=True, blank=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=6, blank=True, null=True)
    
    # 5.3 Contact Details
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    mobile_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website_url = models.URLField(blank=True, null=True)
    
    # 5.4 Financial Configuration
    financial_year_begins = models.CharField(max_length=20, default='01-Apr') # Storing as string or month-day
    base_currency = models.CharField(max_length=10, default='INR')
    currency_symbol = models.CharField(max_length=10, default='₹ / INR')
    decimal_places = models.IntegerField(default=2)
    
    # 5.5 Statutory & Taxation Details
    is_gst_applicable = models.BooleanField(default=True)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    state_code = models.CharField(max_length=5, blank=True, null=True) # Auto-derived
    
    gst_customer_type = models.CharField(
        max_length=20, 
        choices=GSTCustomerType.choices, 
        default=GSTCustomerType.CGST_SGST_9,
        verbose_name="GST Customer Type",
        help_text="Determines tax type: Domestic (CGST/SGST or IGST), SEZ (IGST 0%), Export (IGST 0%)"
    )
    
    msme_registered = models.BooleanField(default=False)
    msme_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="MSME Number")
    pan = models.CharField(max_length=10, blank=True, null=True)
    tan = models.CharField(max_length=10, blank=True, null=True)
    cin = models.CharField(max_length=21, blank=True, null=True, verbose_name="CIN")
    
    # Linked Company (from Company section / CustomerPartner)
    linked_company_profile = models.ForeignKey(
        'CustomerPartner',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customer_profiles'
    )

    # Existing fields
    authorized_signatory_name = models.CharField(max_length=255, blank=True, null=True, help_text="Name of authorized signatory")
    signature_image = models.ImageField(upload_to='company/signatures/', blank=True, null=True)
    company_seal = models.ImageField(upload_to='company/seals/', blank=True, null=True)
    
    registered_address = models.TextField(blank=True, null=True) # Keeping for backward compatibility
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-derive state_code from GSTIN if present (first 2 digits)
        if self.gstin and len(self.gstin) >= 2:
            self.state_code = self.gstin[:2]
            # Try to match with StateMaster as well
            if not self.state:
                state_match = StateMaster.objects.filter(code=self.state_code).first()
                if state_match:
                    self.state = state_match
        
        # Auto-derive PAN from GSTIN if present (chars 3 to 12)
        if self.gstin and len(self.gstin) >= 12 and not self.pan:
            self.pan = self.gstin[2:12]
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class InvoiceType(models.TextChoices):
    DOMESTIC = 'DOMESTIC', 'Domestic (CGST/SGST)'
    INTER_STATE = 'INTER_STATE', 'Inter-State (IGST)'
    EXPORT = 'EXPORT', 'Export (Zero Rated)'
    USA = 'USA', 'USA Invoice (Non-GST)'

class InvoiceStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    FINALISED = 'FINALISED', 'Finalised'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    PARTIAL = 'PARTIAL', 'Partially Paid'
    PAID = 'PAID', 'Paid'
    CANCELLED = 'CANCELLED', 'Cancelled'

class Invoice(models.Model):
    invoice_no = models.CharField(max_length=100, unique=True)
    invoice_date = models.DateField()
    due_date = models.DateField()
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='invoices')
    deal = models.ForeignKey('deals.Deal', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    milestone = models.ForeignKey('milestones.Milestone', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    sales_order = models.ForeignKey('sales_orders.SalesOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    
    invoice_type = models.CharField(max_length=20, choices=InvoiceType.choices, default=InvoiceType.DOMESTIC)
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    
    is_gst_applicable = models.BooleanField(default=True)
    currency = models.CharField(max_length=10, default='INR')
    
    # USA Sales Tax
    sales_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sales_tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    place_of_supply = models.CharField(max_length=255, blank=True, null=True)
    
    # Billing & Shipping Address (Snapshots)
    billing_address = models.TextField(blank=True, null=True)
    shipping_address = models.TextField(blank=True, null=True)
    customer_gstin = models.CharField(max_length=15, blank=True, null=True)
    
    # Financial Summary
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_discount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2) # Grand Total
    open_balance = models.DecimalField(max_digits=15, decimal_places=2)
    
    grand_total_words = models.TextField(blank=True, null=True)
    
    # Approval Workflow
    approval_comments = models.TextField(blank=True, null=True)
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_invoices')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Compliance & Statutory Notes
    gst_declaration = models.TextField(
        blank=True, null=True, 
        default="We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This invoice is issued under Rule 46 of the CGST Rules, 2017."
    )
    lut_declaration = models.TextField(
        blank=True, null=True,
        default="Supply meant for export under Letter of Undertaking (LUT) without payment of Integrated Tax as per Section 16(3) of the IGST Act, 2017 and Rule 96A of the CGST Rules, 2017."
    )
    authorized_signatory = models.CharField(max_length=255, blank=True, null=True)
    signature_image = models.ImageField(upload_to='invoices/signatures/', blank=True, null=True)
    company_seal = models.ImageField(upload_to='invoices/seals/', blank=True, null=True)
    memo = models.TextField(blank=True, null=True, verbose_name="Description / Memo")

    # e-Invoice Details (as per image)
    irn = models.CharField(max_length=255, blank=True, null=True, verbose_name="IRN")
    ack_no = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ack No.")
    ack_date = models.DateField(blank=True, null=True, verbose_name="Ack Date")
    
    # Customer PO Details
    po_number = models.CharField(max_length=100, blank=True, null=True, verbose_name="PO Number")
    po_date = models.DateField(blank=True, null=True, verbose_name="PO Date")
    
    # Payment Terms Details
    payment_terms_days = models.IntegerField(default=30, verbose_name="Payment Terms (Days)")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invoice_no:
            last_invoice = Invoice.objects.order_by('id').last()
            if not last_invoice:
                self.invoice_no = 'INV-0001'
            else:
                last_id = last_invoice.id
                self.invoice_no = f'INV-{last_id + 1:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.invoice_no

class InvoiceLineItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    sr_no = models.IntegerField()
    description = models.TextField()
    hsn_sac = models.CharField(max_length=20, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=15, decimal_places=2)
    taxable_value = models.DecimalField(max_digits=15, decimal_places=2)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Tax details per line
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)

    def __str__(self):
        return f"{self.invoice.invoice_no} - {self.sr_no}"

class BankConnection(models.Model):
    bank_name = models.CharField(max_length=255)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    account_number = models.CharField(max_length=100)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True, verbose_name="IFSC Code")
    swift_code = models.CharField(max_length=20, blank=True, null=True, verbose_name="SWIFT Code")
    
    api_key = models.CharField(max_length=255, blank=True, null=True)
    client_id = models.CharField(max_length=255, blank=True, null=True)
    oauth_credentials = models.TextField(blank=True, null=True)
    token = models.CharField(max_length=255, blank=True, null=True)
    secret_key = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_primary_for_invoices = models.BooleanField(default=False)
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

class CustomerPartnerType(models.TextChoices):
    CUSTOMER = 'CUSTOMER', 'Customer'
    CHANNEL_PARTNER = 'CHANNEL_PARTNER', 'Channel Partner'

class PaymentTerms(models.TextChoices):
    NET_30 = 'NET_30', '30 days'
    NET_60 = 'NET_60', '60 days'
    NET_90 = 'NET_90', '90 days'
    IMMEDIATE = 'IMMEDIATE', 'immediate'

class EntityStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'

class CustomerPartner(models.Model):
    # Customer Basic Details
    name = models.CharField(max_length=255)
    entity = models.CharField(max_length=255, blank=True, null=True)
    customer_id = models.CharField(max_length=50, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    alias_name = models.CharField(max_length=100, blank=True, null=True)
    code = models.CharField(max_length=50, unique=True, blank=True)
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='partners/logos/', blank=True, null=True)
    
    # Address Details
    address_line_1 = models.TextField(blank=True, null=True)
    address_line_2 = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=100, default='India')
    state = models.ForeignKey(StateMaster, on_delete=models.SET_NULL, null=True, blank=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=6, blank=True, null=True)
    
    # Contact Details
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website_url = models.URLField(blank=True, null=True)
    primary_contact = models.CharField(max_length=255, blank=True, null=True)

    # Business Details
    linked_company = models.ForeignKey(CompanyProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='partners')
    type = models.CharField(max_length=20, choices=CustomerPartnerType.choices, default=CustomerPartnerType.CUSTOMER)
    industry = models.CharField(max_length=100, choices=IndustryType.choices, default=IndustryType.OTHER)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    payment_terms = models.CharField(max_length=20, choices=PaymentTerms.choices, default=PaymentTerms.NET_30)
    
    # Financial Configuration
    financial_year_begins = models.CharField(max_length=20, default='01-Apr')
    base_currency = models.CharField(max_length=10, default='INR')
    currency_symbol = models.CharField(max_length=10, default='₹ / INR')
    decimal_places = models.IntegerField(default=2)
    
    # Statutory & Taxation Details
    is_gst_applicable = models.BooleanField(default=True)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    state_code = models.CharField(max_length=5, blank=True, null=True)
    
    gst_customer_type = models.CharField(
        max_length=20, 
        choices=GSTCustomerType.choices, 
        default=GSTCustomerType.CGST_SGST_9,
        verbose_name="GST Customer Type",
        help_text="Determines tax type: Domestic (CGST/SGST or IGST), SEZ (IGST 0%), Export (IGST 0%)"
    )
    
    msme_registered = models.BooleanField(default=False)
    msme_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="MSME Number")
    pan = models.CharField(max_length=10, blank=True, null=True)
    tan = models.CharField(max_length=10, blank=True, null=True)
    cin = models.CharField(max_length=21, blank=True, null=True, verbose_name="CIN")

    status = models.CharField(max_length=10, choices=EntityStatus.choices, default=EntityStatus.ACTIVE)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            model_class = self.__class__
            last = model_class.objects.order_by('code').last()
            if last:
                match = re.search(r'(\d+)$', last.code)
                if match:
                    last_num = int(match.group(1))
                    self.code = f"CP{last_num + 1:03d}"
                else:
                    self.code = "CP001"
            else:
                self.code = "CP001"
        
        # Auto-derive state_code from GSTIN if present
        if self.gstin and len(self.gstin) >= 2:
            self.state_code = self.gstin[:2]
            if not self.state:
                state_match = StateMaster.objects.filter(code=self.state_code).first()
                if state_match:
                    self.state = state_match
        
        # Auto-derive PAN from GSTIN if present (chars 3 to 12)
        if self.gstin and len(self.gstin) >= 12 and not self.pan:
            self.pan = self.gstin[2:12]
                    
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.name}"

class DealType(models.TextChoices):
    DIRECT = 'DIRECT', 'Direct'
    INDIRECT = 'INDIRECT', 'Indirect'

class EndCustomer(models.Model):
    code = models.CharField(max_length=50, unique=True, blank=True)
    name = models.CharField(max_length=255)
    company = models.CharField(max_length=255, blank=True, null=True)
    linked_partner = models.ForeignKey(CompanyProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='end_customers')
    industry = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    deal_type = models.CharField(max_length=10, choices=DealType.choices, default=DealType.DIRECT)
    status = models.CharField(max_length=10, choices=EntityStatus.choices, default=EntityStatus.ACTIVE)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            model_class = self.__class__
            last = model_class.objects.order_by('code').last()
            if last:
                match = re.search(r'(\d+)$', last.code)
                if match:
                    last_num = int(match.group(1))
                    self.code = f"EC{last_num + 1:03d}"
                else:
                    self.code = "EC001"
            else:
                self.code = "EC001"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.name}"

class FinancialYearStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    CLOSED = 'CLOSED', 'Closed'

class FinancialYear(models.Model):
    code = models.CharField(max_length=50, unique=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    label = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=FinancialYearStatus.choices, default=FinancialYearStatus.ACTIVE)
    is_current_fy = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValidationError("End Date must be greater than Start Date")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.code:
            # Auto-generate code if empty, e.g., FY2025-26
            sy = self.start_date.year
            ey = self.end_date.year
            self.code = f"FY{sy}-{str(ey)[2:]}"
        
        if self.is_current_fy:
            # Mark all others as not current
            FinancialYear.objects.filter(is_current_fy=True).exclude(id=self.id).update(is_current_fy=False)
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.label} ({self.code})"
