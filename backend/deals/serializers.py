from rest_framework import serializers
from .models import Deal, DealOwner, ImplementationPartner, Product, OpportunitySourceMaster, IndustryMaster, Customer, CountryMaster
from django.contrib.auth.models import User
from leads.models import Lead

class DealOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealOwner
        fields = '__all__'

class ImplementationPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImplementationPartner
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class OpportunitySourceMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunitySourceMaster
        fields = '__all__'

class IndustryMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndustryMaster
        fields = '__all__'

class CountryMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CountryMaster
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class DealSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.name')
    lead_name = serializers.ReadOnlyField(source='lead.customer_name')
    lead_no = serializers.ReadOnlyField(source='lead.lead_no')
    owner_name = serializers.ReadOnlyField(source='deal_owner.name')
    country_name = serializers.ReadOnlyField(source='country.name')
    partner_name = serializers.ReadOnlyField(source='implementation_partner.name')
    source_name = serializers.ReadOnlyField(source='opportunity_source.name')
    industry_name = serializers.ReadOnlyField(source='industry.name')
    product_details = ProductSerializer(source='products', many=True, read_only=True)
    
    class Meta:
        model = Deal
        fields = '__all__'
