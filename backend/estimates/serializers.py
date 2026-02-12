from rest_framework import serializers
from .models import Estimate, Proposal, Renewal, EstimateItem, ApprovalStatus, EmailLog
from cost_sheets.serializers import CostSheetSerializer
from deals.serializers import DealSerializer

class ProposalSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.username')
    
    class Meta:
        model = Proposal
        fields = '__all__'

class RenewalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Renewal
        fields = '__all__'

class EstimateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateItem
        fields = ['id', 'sr_no', 'particulars', 'description', 'hsn_sac', 'qty', 'rate', 'amount']
        # Removed amount from read_only_fields to allow manual overrides

class EmailLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.ReadOnlyField(source='sent_by.username')
    
    class Meta:
        model = EmailLog
        fields = '__all__'

class EstimateSerializer(serializers.ModelSerializer):
    proposals = ProposalSerializer(many=True, read_only=True)
    renewals = RenewalSerializer(many=True, read_only=True)
    items = EstimateItemSerializer(many=True)
    email_logs = EmailLogSerializer(many=True, read_only=True)
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.username')
    
    # Nested details from related models
    customer_name = serializers.ReadOnlyField(source='deal.customer.name')
    project_name = serializers.ReadOnlyField(source='deal.deal_name')
    deal_id = serializers.ReadOnlyField(source='deal.deal_id')
    cost_sheet_no = serializers.ReadOnlyField(source='cost_sheet.cost_sheet_no')
    
    class Meta:
        model = Estimate
        fields = '__all__'
        read_only_fields = ('estimate_id', 'version', 'is_latest', 'total_cost', 'total_margin', 'total_price', 'approval_status', 'approved_by', 'approved_at')

    def validate(self, data):
        # Prevent editing if Approved
        if self.instance and self.instance.approval_status == ApprovalStatus.APPROVED:
            raise serializers.ValidationError("Approved estimates cannot be edited. Please create a rewind/new version.")

        items_data = data.get('items')
        cost_sheet = data.get('cost_sheet') or (self.instance.cost_sheet if self.instance else None)
        
        if cost_sheet:
            if items_data is not None:
                # If items are provided in the request (create or update)
                total_estimate_price = sum((float(item.get('qty', 0)) * float(item.get('rate', 0))) for item in items_data)
            elif self.instance and self.instance.items.exists():
                # If items are NOT provided (partial update) AND instance has items, use the instance's items
                total_estimate_price = sum(float(item.qty) * float(item.rate) for item in self.instance.items.all())
            elif self.instance:
                # If items are NOT provided (partial update) AND instance has NO items, use the stored total_price
                # This fixes the bug where partial updates failed for auto-created estimates with no items
                total_estimate_price = float(self.instance.total_price)
            else:
                total_estimate_price = 0

            cost_sheet_price = float(cost_sheet.total_estimated_price)
            if total_estimate_price < cost_sheet_price:
                raise serializers.ValidationError({
                    "items": f"Total Estimate Price (${total_estimate_price:,.2f}) must be greater than or equal to the approved Cost Sheet Price (${cost_sheet_price:,.2f})."
                })

        # MANDATORY: Check for proposal attachment if updating (creation might not have it yet, 
        # but the form handles attachment after creation or during update)
        if self.instance and not self.instance.proposals.exists():
             raise serializers.ValidationError({
                "proposals": "A proposal file must be attached to the estimate."
            })
        
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        cost_sheet = validated_data.get('cost_sheet')
        # Take snapshot of cost sheet values (Initial defaults)
        validated_data['total_cost'] = cost_sheet.total_estimated_cost
        validated_data['total_margin'] = cost_sheet.total_estimated_margin
        validated_data['total_price'] = cost_sheet.total_estimated_price
        
        estimate = Estimate.objects.create(**validated_data)
        
        total_items_amount = 0
        for item_data in items_data:
            item = EstimateItem.objects.create(estimate=estimate, **item_data)
            total_items_amount += float(item.amount or 0)
            
        # Update total_price to reflect actual items sum if items exist
        if items_data:
            estimate.total_price = total_items_amount
            estimate.save()
            
        return estimate

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance = super().update(instance, validated_data)
        
        if items_data is not None:
            # Simple replacement logic for demo/poc
            instance.items.all().delete()
            total_items_amount = 0
            for item_data in items_data:
                item = EstimateItem.objects.create(estimate=instance, **item_data)
                total_items_amount += float(item.amount or 0)
            
            # Recalculate total_price
            instance.total_price = total_items_amount
            instance.save()
        
        return instance
