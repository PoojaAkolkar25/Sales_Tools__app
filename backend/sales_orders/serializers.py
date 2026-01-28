from rest_framework import serializers
from .models import SalesOrder, SalesOrderItem, IncomingEmail, PurchaseOrderFile
from deals.models import Customer, Product

class SalesOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderItem
        fields = '__all__'

class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    po_file_name = serializers.SerializerMethodField()

    def get_po_file_name(self, obj):
        return obj.po_file.file.name.split('/')[-1] if obj.po_file and obj.po_file.file else "N/A"
    
    class Meta:
        model = SalesOrder
        fields = ['id', 'so_number', 'order_date', 'status', 'customer', 'customer_name', 'customer_code', 'po_number', 'po_date', 'delivery_date', 'billing_address', 'shipping_address', 'currency', 'total_amount', 'po_file', 'po_file_name', 'assigned_to', 'items']

class PurchaseOrderFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderFile
        fields = '__all__'

class IncomingEmailSerializer(serializers.ModelSerializer):
    attachments = PurchaseOrderFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = IncomingEmail
        fields = '__all__'
