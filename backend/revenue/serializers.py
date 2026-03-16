from rest_framework import serializers
from .models import RevenueContract, RevenueSchedule, ConsumptionRecord, FixedBidProgress, PeriodLock

class RevenueScheduleSerializer(serializers.ModelSerializer):
    period_label = serializers.SerializerMethodField()
    amount_inr = serializers.SerializerMethodField()

    class Meta:
        model = RevenueSchedule
        fields = '__all__'

    def get_period_label(self, obj):
        return obj.period_month.strftime('%b-%y')

    def get_amount_inr(self, obj):
        from finance.services import ExchangeRateService
        currency = obj.contract.currency if obj.contract else 'INR'
        return float(ExchangeRateService.convert_to_inr(obj.amount, currency, None))

class ConsumptionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsumptionRecord
        fields = '__all__'

class FixedBidProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixedBidProgress
        fields = '__all__'

class RevenueContractSerializer(serializers.ModelSerializer):
    schedules = RevenueScheduleSerializer(many=True, read_only=True)
    customer_name = serializers.ReadOnlyField(source='customer.name')
    deal_name = serializers.ReadOnlyField(source='deal.deal_name')
    revenue_type_display = serializers.CharField(source='get_revenue_type_display', read_only=True)
    total_amount_inr = serializers.SerializerMethodField()

    class Meta:
        model = RevenueContract
        fields = [
            'id', 'contract_id', 'deal', 'customer', 'revenue_type', 
            'total_amount', 'total_amount_inr', 'currency', 'start_date', 'end_date', 
            'rate_per_unit', 'unit_name', 'is_active', 'created_at', 'updated_at',
            'schedules', 'customer_name', 'deal_name', 'revenue_type_display'
        ]

    def get_total_amount_inr(self, obj):
        from finance.services import ExchangeRateService
        return float(ExchangeRateService.convert_to_inr(obj.total_amount, obj.currency, None))

class PeriodLockSerializer(serializers.ModelSerializer):
    period_label = serializers.SerializerMethodField()

    class Meta:
        model = PeriodLock
        fields = '__all__'

    def get_period_label(self, obj):
        return obj.period_month.strftime('%b-%y')
