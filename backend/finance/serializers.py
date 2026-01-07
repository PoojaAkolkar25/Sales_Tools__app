from rest_framework import serializers
from .models import Invoice, BankConnection, BankTransaction, ReceiptVoucher, ReceiptAdjustment, ReceiptAttachment

class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='lead.customer_name', read_only=True)
    project_name = serializers.CharField(source='lead.project_name', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'

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
        
        # Use the stored customer_name if available
        result_name = instance.customer_name
        
        # If stored name is empty, try the linked lead
        if not result_name and instance.lead:
            result_name = instance.lead.customer_name
            
        # Final fallback
        representation['customer_name'] = result_name or "Unknown"
        return representation

 