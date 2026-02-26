from rest_framework import serializers
from .models import RevenueContract, RevenueSchedule, ConsumptionRecord, FixedBidProgress, PeriodLock

class RevenueScheduleSerializer(serializers.ModelSerializer):
    period_label = serializers.SerializerMethodField()

    class Meta:
        model = RevenueSchedule
        fields = '__all__'

    def get_period_label(self, obj):
        return obj.period_month.strftime('%b-%y')

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

    class Meta:
        model = RevenueContract
        fields = '__all__'

class PeriodLockSerializer(serializers.ModelSerializer):
    period_label = serializers.SerializerMethodField()

    class Meta:
        model = PeriodLock
        fields = '__all__'

    def get_period_label(self, obj):
        return obj.period_month.strftime('%b-%y')
