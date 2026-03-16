from rest_framework import serializers
from .models import Milestone
from sales_orders.serializers import SalesOrderSerializer
from finance.serializers import InvoiceSerializer

class MilestoneSerializer(serializers.ModelSerializer):
    sales_order_details = SalesOrderSerializer(source='sales_order', read_only=True)
    invoice_details = InvoiceSerializer(source='invoice', read_only=True)
    amount_inr = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = '__all__'
    def get_amount_inr(self, obj):
        from finance.services import ExchangeRateService
        currency = obj.sales_order.currency if obj.sales_order else 'INR'
        return float(ExchangeRateService.convert_to_inr(obj.amount, currency, None))
