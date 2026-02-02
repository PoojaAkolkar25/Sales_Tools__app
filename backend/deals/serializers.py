from rest_framework import serializers
from .models import Deal, ImplementationPartner, Product, Customer
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

class DealSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.name')
    lead_name = serializers.ReadOnlyField(source='lead.customer_name')
    lead_no = serializers.ReadOnlyField(source='lead.lead_no')
    partner_name = serializers.ReadOnlyField(source='implementation_partner.name')
    
    class Meta:
        model = Deal
        fields = '__all__'
