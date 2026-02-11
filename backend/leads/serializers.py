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

    class Meta:
        model = Lead
        fields = '__all__'
