from rest_framework import serializers
from .models import SalesOrder, SalesOrderItem, IncomingEmail, PurchaseOrderFile
from deals.models import Customer, Product

class SalesOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderItem
        fields = '__all__'

class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True, required=False)
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
            'estimates': {'required': False},
            'so_number': {'read_only': True},
            'total_amount': {'read_only': True}
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        estimates = validated_data.pop('estimates', [])
        sales_order = SalesOrder.objects.create(**validated_data)
        
        if estimates:
            sales_order.estimates.set(estimates)

        total = 0
        for item_data in items_data:
            item_data.pop('sales_order', None)
            item = SalesOrderItem.objects.create(sales_order=sales_order, **item_data)
            total += item.amount
            
        sales_order.total_amount = total
        sales_order.save()
        return sales_order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        estimates = validated_data.pop('estimates', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if estimates is not None:
             instance.estimates.set(estimates)

        # Update Items if provided
        if items_data is not None:
            # Delete existing items not in the update payload (optional approach: or delete all and recreate)
            # For simplicity and correctness with IDs, we'll replace all for now or implement diffing
            # Given the frontend sends complete list, we can clear and recreate or intelligent update.
            # Let's go with: delete all existing and recreate (simplest safe approach for drafts)
            instance.items.all().delete()
            
            total = 0
            for item_data in items_data:
                item_data.pop('sales_order', None)
                item = SalesOrderItem.objects.create(sales_order=instance, **item_data)
                total += item.amount
            instance.total_amount = total
        
        instance.save()
        return instance

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
