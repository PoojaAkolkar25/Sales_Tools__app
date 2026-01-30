from rest_framework import serializers
from .models import SalesOrder, SalesOrderItem, IncomingEmail, PurchaseOrderFile
from deals.models import Customer, Product

class SalesOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderItem
        fields = '__all__'

class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True, read_only=True)
    po_file_name = serializers.SerializerMethodField()
    po_file_url = serializers.SerializerMethodField()

    def get_po_file_name(self, obj):
        return obj.po_file.file.name.split('/')[-1] if obj.po_file and obj.po_file.file else "N/A"
    
    def get_po_file_url(self, obj):
        if obj.po_file and obj.po_file.file:
            return obj.po_file.file.url
        return None
    
    customer_detail = serializers.SerializerMethodField()

    def get_customer_detail(self, obj):
        if obj.customer:
            return {"id": obj.customer.id, "name": obj.customer.name}
        return None
    
    class Meta:
        model = SalesOrder
        fields = ['id', 'so_number', 'order_date', 'status', 'customer', 'customer_detail', 'customer_name', 'customer_code', 'po_number', 'po_date', 'delivery_date', 'billing_address', 'shipping_address', 'currency', 'total_amount', 'po_file', 'po_file_name', 'po_file_url', 'assigned_to', 'items', 'estimates']
        extra_kwargs = {
            'estimates': {'required': False}
        }

    def validate(self, data):
        # BRD Requirement: Prevent duplicate PO number for same customer
        customer = data.get('customer')
        po_number = data.get('po_number')
        
        # If updating, use instance values if not provided in data
        if self.instance:
            if not customer: customer = self.instance.customer
            if not po_number: po_number = self.instance.po_number
            
        if customer and po_number:
            # Check for existing SO with same PO Number and Customer, excluding current instance
            duplicates = SalesOrder.objects.filter(
                customer=customer, 
                po_number__iexact=po_number
            )
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
                
            if duplicates.exists():
                raise serializers.ValidationError(
                    {"po_number": f"A Sales Order with PO Number '{po_number}' already exists for this customer."}
                )
        
        return data

class PurchaseOrderFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderFile
        fields = '__all__'

class IncomingEmailSerializer(serializers.ModelSerializer):
    attachments = PurchaseOrderFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = IncomingEmail
        fields = '__all__'
