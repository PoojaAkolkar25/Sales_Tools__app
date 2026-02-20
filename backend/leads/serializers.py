from rest_framework import serializers
from .models import Lead

class LeadSerializer(serializers.ModelSerializer):
    deal_id = serializers.SerializerMethodField()
    deal_no = serializers.SerializerMethodField()

    def get_deal_id(self, obj):
        deal = obj.deals.first()
        return deal.id if deal else None

    def get_deal_no(self, obj):
        deal = obj.deals.first()
        return deal.deal_id if deal else None

    currency = serializers.SerializerMethodField()
    gstin = serializers.SerializerMethodField()
    cost_sheet_id = serializers.SerializerMethodField()
    cost_sheet_no = serializers.SerializerMethodField()

    def get_currency(self, obj):
        deal = obj.deals.first()
        if deal: return deal.currency
        return 'INR'

    def get_gstin(self, obj):
        deal = obj.deals.first()
        if deal and deal.customer:
            return deal.customer.gstin
        return ''

    def get_cost_sheet_id(self, obj):
        # 1. Try approved cost sheet via direct lead link
        from cost_sheets.models import CostSheet
        cs = obj.cost_sheets.filter(status='APPROVED').first()
        if cs: return cs.id
        
        # 2. Try any cost sheet via direct lead link
        cs = obj.cost_sheets.first()
        if cs: return cs.id
        
        # 3. Try via direct deal link (first deal)
        deal = obj.deals.first()
        if deal:
            cs = deal.cost_sheets.filter(status='APPROVED').first()
            if cs: return cs.id
            cs = deal.cost_sheets.first()
            if cs: return cs.id
            
        # 4. Fallback: Search by project name name-match
        if obj.project_name:
            cs = CostSheet.objects.filter(deal__deal_name=obj.project_name).first()
            if cs: return cs.id
            
        return None

    def get_cost_sheet_no(self, obj):
        # 1. Try approved cost sheet via direct lead link
        from cost_sheets.models import CostSheet
        cs = obj.cost_sheets.filter(status='APPROVED').first()
        if cs: return cs.cost_sheet_no
        
        # 2. Try any cost sheet via direct lead link
        cs = obj.cost_sheets.first()
        if cs: return cs.cost_sheet_no
        
        # 3. Try via direct deal link (first deal)
        deal = obj.deals.first()
        if deal:
            cs = deal.cost_sheets.filter(status='APPROVED').first()
            if cs: return cs.cost_sheet_no
            cs = deal.cost_sheets.first()
            if cs: return cs.cost_sheet_no
            
        # 4. Fallback: Search by project name name-match
        if obj.project_name:
            cs = CostSheet.objects.filter(deal__deal_name=obj.project_name).first()
            if cs: return cs.cost_sheet_no
            
        return None

    class Meta:
        model = Lead
        fields = '__all__'
