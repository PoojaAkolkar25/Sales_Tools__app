from rest_framework import serializers
from .models import (
    Invoice, InvoiceLineItem, StateMaster, CompanyProfile,
    BankConnection, BankTransaction, ReceiptVoucher, ReceiptAdjustment, ReceiptAttachment,
    CustomerPartner, EndCustomer, FinancialYear
)

class FinancialYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialYear
        fields = '__all__'

class StateMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateMaster
        fields = '__all__'

class CompanyProfileSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='state.name', read_only=True)
    entity = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    class Meta:
        model = CompanyProfile
        fields = '__all__'

    def to_internal_value(self, data):
        # Handle empty strings from frontend
        data = data.copy()
        for field in ['state', 'decimal_places']:
            if field in data and data[field] == '':
                if field == 'state':
                    data[field] = None
                else:
                    data.pop(field)
        return super().to_internal_value(data)

    def validate_gstin(self, value):
        if value:
            # Check if this GSTIN already exists in any CompanyProfile
            qs = CompanyProfile.objects.filter(gstin=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("A company with this GSTIN already exists.")
        return value

class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='lead.customer_name', read_only=True)
    project_name = serializers.CharField(source='lead.project_name', read_only=True)
    deal_no = serializers.CharField(source='deal.deal_id', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    
    # Optional/Calculated fields made non-required for validation
    invoice_no = serializers.CharField(required=False, allow_blank=True)
    subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_discount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    taxable_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_tax = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    round_off = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    open_balance = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    grand_total_words = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sales_tax_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_no', 'invoice_date', 'due_date', 'lead', 'deal', 'deal_no', 'cost_sheet', 'proposal',
            'invoice_type', 'status', 'is_gst_applicable', 'currency', 'place_of_supply', 
            'billing_address', 'shipping_address', 'customer_gstin', 'subtotal', 
            'total_discount', 'taxable_amount', 'total_tax', 'round_off', 
            'total_amount', 'open_balance', 'grand_total_words', 'approval_comments', 
            'approved_by', 'approved_at', 'line_items', 'customer_name', 
            'project_name', 'deal_no', 'approved_by_name', 'sales_tax_rate', 'sales_tax_amount',
            'gst_declaration', 'lut_declaration', 'authorized_signatory', 
            'signature_image', 'company_seal', 'memo', 'irn', 'ack_no', 'ack_date', 'payment_terms_days',
            'po_number', 'po_date'
        ]

    def to_internal_value(self, data):
        # Handle empty strings for foreign keys from frontend
        for field in ['deal', 'cost_sheet', 'proposal', 'customer_state']:
            if field in data and data[field] == '':
                data[field] = None
        return super().to_internal_value(data)

class BankConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankConnection
        fields = '__all__'

class BankTransactionSerializer(serializers.ModelSerializer):
    bank_name = serializers.CharField(source='bank_connection.bank_name', read_only=True)

    class Meta:
        model = BankTransaction
        fields = '__all__'

class ReceiptAdjustmentSerializer(serializers.ModelSerializer):
    invoice_no = serializers.CharField(source='invoice.invoice_no', read_only=True)
    
    class Meta:
        model = ReceiptAdjustment
        fields = '__all__'

class ReceiptAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceiptAttachment
        fields = '__all__'

class ReceiptVoucherSerializer(serializers.ModelSerializer):
    adjustments = ReceiptAdjustmentSerializer(many=True, read_only=True)
    attachments = ReceiptAttachmentSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(source='deposit_to.bank_name', read_only=True)
    reconciliation_date = serializers.DateField(source='bank_transaction.reconciliation_date', read_only=True)

    class Meta:
        model = ReceiptVoucher
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Priority: 1. Model's customer_name, 2. Linked lead's customer_name
        customer_name = instance.customer_name
        if not customer_name and instance.lead:
            customer_name = instance.lead.customer_name
            
        representation['customer_name'] = customer_name or "Unknown"
        return representation

class CustomerPartnerSerializer(serializers.ModelSerializer):
    linked_company_name = serializers.CharField(source='linked_company.name', read_only=True)
    entity = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = CustomerPartner
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy()
        for field in ['linked_company', 'state', 'decimal_places', 'credit_limit']:
            if field in data and data[field] == '':
                if field in ['linked_company', 'state']:
                    data[field] = None
                else:
                    data.pop(field)
        return super().to_internal_value(data)

    def validate_gstin(self, value):
        if value:
            # Check if this GSTIN already exists in any CustomerPartner
            qs = CustomerPartner.objects.filter(gstin=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("A customer/partner with this GSTIN already exists.")
        return value

class EndCustomerSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='linked_partner.name', read_only=True)
    
    class Meta:
        model = EndCustomer
        fields = '__all__'

    def to_internal_value(self, data):
        if 'linked_partner' in data and data['linked_partner'] == '':
            data['linked_partner'] = None
        return super().to_internal_value(data)

 