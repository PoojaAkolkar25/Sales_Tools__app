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
        fields = '__all__'

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
    
    class Meta:
        model = AuditTrail
        fields = ['id', 'username', 'field_name', 'old_value', 'new_value', 'action_type', 'timestamp']

class DealAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealAttachment
        fields = ['id', 'file', 'filename', 'uploaded_at']

class DealSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.name')
    lead_name = serializers.ReadOnlyField(source='lead.customer_name')
    lead_no = serializers.ReadOnlyField(source='lead.lead_no')
    deal_types = DealTypeEntrySerializer(many=True, required=False)
    audit_trail = AuditTrailSerializer(many=True, read_only=True)
    deal_attachments = DealAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ['deal_id', 'deal_date', 'created_at', 'updated_at']

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

