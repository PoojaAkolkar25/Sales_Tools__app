from rest_framework import serializers
from .models import Estimate, Proposal, Renewal, EstimateItem, ApprovalStatus, EmailLog, EstimateStatus
from cost_sheets.serializers import CostSheetSerializer
from deals.serializers import DealSerializer

class ProposalSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.username')
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Proposal
        fields = ['id', 'estimate', 'file', 'file_url', 'filename', 'version', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None

class RenewalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Renewal
        fields = '__all__'

class EstimateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateItem
        fields = ['id', 'sr_no', 'item_type', 'particulars', 'description', 'subscription_from', 'subscription_to', 'hsn_sac', 'qty', 'rate', 'discount', 'amount']
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
    customer_alias = serializers.ReadOnlyField(source='deal.customer.alias_name')
    customer_email = serializers.SerializerMethodField()
    project_name = serializers.ReadOnlyField(source='deal.deal_name')
    deal_id = serializers.ReadOnlyField(source='deal.deal_id')
    company = serializers.ReadOnlyField(source='deal.company')
    deal_amount = serializers.DecimalField(source='deal.deal_amount', max_digits=15, decimal_places=2, read_only=True)
    cost_sheet_no = serializers.ReadOnlyField(source='cost_sheet.cost_sheet_no')
    cost_sheet_price = serializers.DecimalField(source='cost_sheet.total_estimated_price', max_digits=15, decimal_places=2, read_only=True)
    amount_inr = serializers.SerializerMethodField()
    
    class Meta:
        model = Estimate
        fields = [
            'id', 'estimate_id', 'cost_sheet', 'deal', 'version', 'status',
            'estimate_date', 'subscription_from', 'subscription_to', 'description_memo',
            'terms_conditions', 'markup_adjustment', 'commercial_terms',
            'total_cost', 'total_margin', 'total_price', 'parent_estimate',
            'is_latest', 'column_labels', 'approval_status', 'approved_by',
            'approved_at', 'approval_notes', 'created_by', 'created_at',
            'updated_at', 'proposals', 'renewals', 'items', 'email_logs',
            'created_by_name', 'approved_by_name', 'customer_name',
            'customer_alias', 'customer_email', 'project_name', 'deal_id',
            'company', 'deal_amount', 'cost_sheet_no', 'cost_sheet_price', 'amount_inr'
        ]
        read_only_fields = ('estimate_id', 'version', 'is_latest', 'total_cost', 'total_margin', 'total_price', 'approval_status', 'approved_by', 'approved_at')

    def get_customer_email(self, obj):
        # Prioritize the direct 'Customer' object configured in User Management
        if obj.deal and obj.deal.customer and obj.deal.customer.email:
            return obj.deal.customer.email
        # Fallback to lead contact email
        if obj.deal and getattr(obj.deal, 'lead', None) and getattr(obj.deal.lead, 'email', None):
            return obj.deal.lead.email
        return ""

    def get_amount_inr(self, obj):
        from finance.services import ExchangeRateService
        currency = obj.deal.currency if obj.deal else 'INR'
        return float(ExchangeRateService.convert_to_inr(obj.total_price, currency, None))

    def validate(self, data):
        # Prevent editing if Approved
        if self.instance and self.instance.approval_status == ApprovalStatus.APPROVED:
            raise serializers.ValidationError("Approved estimates cannot be edited. Please create a rewind/new version.")

        items_data = data.get('items')
        cost_sheet = data.get('cost_sheet') or (self.instance.cost_sheet if self.instance else None)
        
        if cost_sheet:
            if items_data is not None:
                # If items are provided in the request (create or update)
                total_estimate_price = sum(((float(item.get('qty', 0)) * float(item.get('rate', 0))) - float(item.get('discount', 0))) for item in items_data)
            elif self.instance and self.instance.items.exists():
                # If items are NOT provided (partial update) AND instance has items, use the instance's items
                total_estimate_price = sum((float(item.qty) * float(item.rate) - float(item.discount)) for item in self.instance.items.all())
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

        # MANDATORY: Check for proposal attachment if updating and NOT in DRAFT/NEGOTIATION status
        # This allows saving drafts before the proposal is ready.
        status = data.get('status') or (self.instance.status if self.instance else EstimateStatus.DRAFT)
        if self.instance and status not in [EstimateStatus.DRAFT, EstimateStatus.NEGOTIATION]:
            if not self.instance.proposals.exists():
                raise serializers.ValidationError({
                    "proposals": "A proposal file must be attached to the estimate before submission."
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
