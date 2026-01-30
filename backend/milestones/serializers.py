from rest_framework import serializers
from .models import Milestone
from sales_orders.serializers import SalesOrderSerializer
from finance.serializers import InvoiceSerializer

class MilestoneSerializer(serializers.ModelSerializer):
    sales_order_details = SalesOrderSerializer(source='sales_order', read_only=True)
    invoice_details = InvoiceSerializer(source='invoice', read_only=True)

    class Meta:
        model = Milestone
        fields = '__all__'
