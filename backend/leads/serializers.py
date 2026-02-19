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
        return deal.currency if deal else 'INR'

    def get_gstin(self, obj):
        deal = obj.deals.first()
        if deal and deal.customer:
            return deal.customer.gstin
        return ''

    def get_cost_sheet_id(self, obj):
        deal = obj.deals.first()
        if deal:
            cs = deal.cost_sheets.filter(status='APPROVED').first()
            return cs.id if cs else None
        return None

    def get_cost_sheet_no(self, obj):
        deal = obj.deals.first()
        if deal:
            cs = deal.cost_sheets.filter(status='APPROVED').first()
            return cs.cost_sheet_no if cs else None
        return None

    class Meta:
        model = Lead
        fields = '__all__'
