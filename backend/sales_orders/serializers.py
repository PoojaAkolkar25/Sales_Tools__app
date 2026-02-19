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
    deal = serializers.SerializerMethodField()
    deal_id = serializers.SerializerMethodField()
    cost_sheet = serializers.SerializerMethodField()

    def get_deal(self, obj):
        first_est = obj.estimates.first()
        return first_est.deal.id if first_est and first_est.deal else None

    def get_deal_id(self, obj):
        first_est = obj.estimates.first()
        return first_est.deal.deal_id if first_est and first_est.deal else "N/A"

    def get_cost_sheet(self, obj):
        first_est = obj.estimates.first()
        return first_est.cost_sheet.id if first_est and first_est.cost_sheet else None

    def get_po_file_name(self, obj):
        return obj.po_file.file.name.split('/')[-1] if obj.po_file and obj.po_file.file else "N/A"
    
    def get_po_file_url(self, obj):
        if obj.po_file and obj.po_file.file:
            return obj.po_file.file.url
        return None
    
    customer_detail = serializers.SerializerMethodField()

    def get_customer_detail(self, obj):
        if obj.customer:
            return {
                "id": obj.customer.id, 
                "name": obj.customer.name,
                "address": obj.customer.address,
                "shipping_address": obj.customer.address # Default shipping to billing if needed, or just address
            }
        return None
    
    class Meta:
        model = SalesOrder
        fields = ['id', 'so_number', 'order_date', 'status', 'customer', 'customer_detail', 'customer_name', 'customer_code', 'po_number', 'po_date', 'po_from_date', 'po_to_date', 'delivery_date', 'billing_address', 'shipping_address', 'currency', 'total_amount', 'po_file', 'po_file_name', 'po_file_url', 'assigned_to', 'items', 'estimates', 'deal', 'deal_id', 'cost_sheet']
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
        customer_name = data.get('customer_name')
        po_number = data.get('po_number')
        
        # If updating, use instance values if not provided in data
        if self.instance:
            if customer is None and 'customer' not in data: customer = self.instance.customer
            if customer_name is None and 'customer_name' not in data: customer_name = self.instance.customer_name
            if po_number is None and 'po_number' not in data: po_number = self.instance.po_number
            
        if po_number:
            from django.db import models
            # Build duplicate query similar to view check
            duplicate_query = models.Q(po_number__iexact=po_number)
            duplicate_query &= ~models.Q(status='CANCELLED')
            
            if customer:
                duplicate_query &= models.Q(customer=customer)
            else:
                duplicate_query &= models.Q(customer_name=customer_name)
                
            duplicates = SalesOrder.objects.filter(duplicate_query)
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
                
            if duplicates.exists():
                existing = duplicates.first()
                status_desc = existing.status
                raise serializers.ValidationError(
                    {"po_number": f"PO Number {po_number} already exists for this customer. Check first PO (ID: {existing.id}, Status: {status_desc})."}
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
