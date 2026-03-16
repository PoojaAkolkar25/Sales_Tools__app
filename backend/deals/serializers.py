from rest_framework import serializers
from .models import Deal, ImplementationPartner, Product, Customer, DealTypeEntry, AuditTrail, DealAttachment
from leads.models import Lead

class ImplementationPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImplementationPartner
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            'id', 'product_code', 'name', 'category', 'subcategory', 'description', 
            'uom', 'standard_price', 'tax_percentage', 'hsn_sac_code', 'currency', 'status'
        )

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class DealTypeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DealTypeEntry
        fields = ['id', 'type', 'description', 'amount', 'quantity', 'created_at']

class AuditTrailSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    model_name = serializers.SerializerMethodField()
    model_display_name = serializers.SerializerMethodField()
    object_display = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditTrail
        fields = ['id', 'username', 'model_name', 'model_display_name', 'object_display', 
                  'field_name', 'old_value', 'new_value', 'action_type', 'timestamp', 'object_id']
    
    def get_model_name(self, obj):
        """Get the model name from content type"""
        return obj.content_type.model if obj.content_type else None
    
    def get_model_display_name(self, obj):
        """Get human-readable module name"""
        if not obj.content_type:
            return None
        
        model_map = {
            'deal': 'Deal',
            'lead': 'Lead',
            'estimate': 'Estimate',
            'costsheet': 'Cost Sheet',
            'salesorder': 'Sales Order',
            'milestone': 'Milestone',
            'invoice': 'Invoice',
            'receiptvoucher': 'Receipt Voucher',
            'customer': 'Customer',
            'endcustomer': 'End Customer',
        }
        return model_map.get(obj.content_type.model, obj.content_type.model.title())
    
    def get_object_display(self, obj):
        """Get string representation of the related object if it exists"""
        try:
            related_obj = obj.content_type.get_object_for_this_type(pk=obj.object_id)
            # Try to get a meaningful string representation
            if hasattr(related_obj, 'deal_id'):
                return f"#{related_obj.deal_id}"
            elif hasattr(related_obj, 'lead_no'):
                return f"#{related_obj.lead_no}"
            elif hasattr(related_obj, 'estimate_no'):
                return f"#{related_obj.estimate_no}"
            elif hasattr(related_obj, 'sales_order_no'):
                return f"#{related_obj.sales_order_no}"
            elif hasattr(related_obj, 'invoice_no'):
                return f"#{related_obj.invoice_no}"
            elif hasattr(related_obj, 'name'):
                return related_obj.name
            else:
                return f"ID: {obj.object_id}"
        except Exception:
            return f"ID: {obj.object_id}"


class DealAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    
    class Meta:
        model = DealAttachment
        fields = ['id', 'file', 'filename', 'uploaded_at']

    def get_file(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None

class DealSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.name')
    lead_name = serializers.ReadOnlyField(source='lead.customer_name')
    lead_no = serializers.ReadOnlyField(source='lead.lead_no')
    deal_types = DealTypeEntrySerializer(many=True, required=False)
    deal_attachments = DealAttachmentSerializer(many=True, read_only=True)
    amount_inr = serializers.SerializerMethodField()
    
    class Meta:
        model = Deal
        fields = [
            'id', 'company', 'deal_id', 'deal_name', 'deal_date', 
            'lead', 'stage', 'currency', 'fx_rate', 'deal_amount', 'deal_type', 
            'description', 'customer', 'customer_email', 'end_customer', 
            'attachments', 'client_type', 'inside_salesperson', 'inside_sales_head', 
            'salesperson_name', 'sales_head', 'project_manager', 'project_manager_head', 
            'expected_close_date', 'remark', 'won_lost_reason', 'hubspot_id', 
            'last_synced_at', 'is_read', 'created_at', 'updated_at', 'deal_types', 
            'deal_attachments', 'customer_name', 'lead_name', 'lead_no', 'amount_inr'
        ]
        read_only_fields = ['deal_id', 'deal_date', 'created_at', 'updated_at']
    
    def get_amount_inr(self, obj):
        from finance.services import ExchangeRateService
        return float(ExchangeRateService.convert_to_inr(obj.deal_amount, obj.currency, None))
    

    def create(self, validated_data):
        deal_types_data = validated_data.pop('deal_types', [])
        deal = Deal.objects.create(**validated_data)
        for type_data in deal_types_data:
            DealTypeEntry.objects.create(deal=deal, **type_data)
        return deal

    def update(self, instance, validated_data):
        deal_types_data = validated_data.pop('deal_types', None)
        instance = super().update(instance, validated_data)

        if deal_types_data is not None:
            # Delete entries not in the new data
            keep_ids = [d.get('id') for d in deal_types_data if d.get('id')]
            instance.deal_types.exclude(id__in=keep_ids).delete()

            # Update or create
            for type_data in deal_types_data:
                type_id = type_data.get('id')
                if type_id:
                    DealTypeEntry.objects.filter(id=type_id, deal=instance).update(**type_data)
                else:
                    DealTypeEntry.objects.create(deal=instance, **type_data)
        
        return instance

