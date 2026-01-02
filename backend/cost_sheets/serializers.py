from rest_framework import serializers
from decimal import Decimal
from .models import (
    CostSheet, LicenseItem, ServiceImplementationItem, 
    ServiceSupportItem, InfrastructureItem, CostSheetAttachment, OtherItem
)

class LicenseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicenseItem
        fields = '__all__'
        read_only_fields = ('estimated_cost', 'estimated_margin_amount', 'estimated_price')

    def validate(self, data):
        data['estimated_cost'] = data['rate'] * data['qty']
        data['estimated_margin_amount'] = data['estimated_cost'] * (data['margin_percentage'] / Decimal('100'))
        data['estimated_price'] = data['estimated_cost'] + data['estimated_margin_amount']
        return data

class ServiceImplementationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceImplementationItem
        fields = '__all__'
        read_only_fields = ('total_days', 'estimated_cost', 'estimated_margin_amount', 'estimated_price')

    def validate(self, data):
        data['total_days'] = data['num_resources'] * data['num_days']
        data['estimated_cost'] = Decimal(data['total_days']) * data['rate_per_day']
        data['estimated_margin_amount'] = data['estimated_cost'] * (data['margin_percentage'] / Decimal('100'))
        data['estimated_price'] = data['estimated_cost'] + data['estimated_margin_amount']
        return data

class ServiceSupportItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceSupportItem
        fields = '__all__'
        read_only_fields = ('total_days', 'estimated_cost', 'estimated_margin_amount', 'estimated_price')

    def validate(self, data):
        data['total_days'] = data['num_resources'] * data['num_days']
        data['estimated_cost'] = Decimal(data['total_days']) * data['rate_per_day']
        data['estimated_margin_amount'] = data['estimated_cost'] * (data['margin_percentage'] / Decimal('100'))
        data['estimated_price'] = data['estimated_cost'] + data['estimated_margin_amount']
        return data

class InfrastructureItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InfrastructureItem
        fields = '__all__'
        read_only_fields = ('estimated_cost', 'estimated_margin_amount', 'estimated_price')

    def validate(self, data):
        data['estimated_cost'] = (data['qty'] * data['rate_per_month']) * Decimal(data['months'])
        data['estimated_margin_amount'] = data['estimated_cost'] * (data['margin_percentage'] / Decimal('100'))
        data['estimated_price'] = data['estimated_cost'] + data['estimated_margin_amount']
        return data

class CostSheetAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostSheetAttachment
        fields = '__all__'

class OtherItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OtherItem
        fields = '__all__'

class CostSheetSerializer(serializers.ModelSerializer):
    license_items = LicenseItemSerializer(many=True, required=False)
    implementation_items = ServiceImplementationItemSerializer(many=True, required=False)
    support_items = ServiceSupportItemSerializer(many=True, required=False)
    infra_items = InfrastructureItemSerializer(many=True, required=False)
    other_items = OtherItemSerializer(many=True, required=False)
    attachments = CostSheetAttachmentSerializer(many=True, read_only=True)
    lead_no = serializers.CharField(source='lead.lead_no', read_only=True)
    customer_name = serializers.CharField(source='lead.customer_name', read_only=True)
    project_name = serializers.CharField(source='lead.project_name', read_only=True)
    project_manager = serializers.CharField(source='lead.project_manager', read_only=True)
    sales_person = serializers.CharField(source='lead.sales_person', read_only=True)
    lead_details = serializers.SerializerMethodField()

    class Meta:
        model = CostSheet
        fields = '__all__'
        read_only_fields = ('total_estimated_cost', 'total_estimated_margin', 'total_estimated_price', 'lead_details')

    def get_lead_details(self, obj):
        return {
            'id': obj.lead.id,
            'lead_no': obj.lead.lead_no,
            'customer_name': obj.lead.customer_name,
            'project_name': obj.lead.project_name,
            'project_manager': obj.lead.project_manager,
            'sales_person': obj.lead.sales_person
        }

    def create(self, validated_data):
        license_data = validated_data.pop('license_items', [])
        impl_data = validated_data.pop('implementation_items', [])
        support_data = validated_data.pop('support_items', [])
        infra_data = validated_data.pop('infra_items', [])
        other_data = validated_data.pop('other_items', [])

        cost_sheet = CostSheet.objects.create(**validated_data)

        for item in license_data:
            LicenseItem.objects.create(cost_sheet=cost_sheet, **item)
        for item in impl_data:
            ServiceImplementationItem.objects.create(cost_sheet=cost_sheet, **item)
        for item in support_data:
            ServiceSupportItem.objects.create(cost_sheet=cost_sheet, **item)
        for item in infra_data:
            InfrastructureItem.objects.create(cost_sheet=cost_sheet, **item)
        for item in other_data:
            OtherItem.objects.create(cost_sheet=cost_sheet, **item)

        self.update_totals(cost_sheet)
        return cost_sheet

    def update(self, instance, validated_data):
        license_data = validated_data.pop('license_items', None)
        impl_data = validated_data.pop('implementation_items', None)
        support_data = validated_data.pop('support_items', None)
        infra_data = validated_data.pop('infra_items', None)
        other_data = validated_data.pop('other_items', None)

        # Update core fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update nested items
        if license_data is not None:
            instance.license_items.all().delete()
            for item in license_data:
                LicenseItem.objects.create(cost_sheet=instance, **item)
        
        if impl_data is not None:
            instance.implementation_items.all().delete()
            for item in impl_data:
                ServiceImplementationItem.objects.create(cost_sheet=instance, **item)
        
        if support_data is not None:
            instance.support_items.all().delete()
            for item in support_data:
                ServiceSupportItem.objects.create(cost_sheet=instance, **item)
        
        if infra_data is not None:
            instance.infra_items.all().delete()
            for item in infra_data:
                InfrastructureItem.objects.create(cost_sheet=instance, **item)
        
        if other_data is not None:
            instance.other_items.all().delete()
            for item in other_data:
                OtherItem.objects.create(cost_sheet=instance, **item)

        self.update_totals(instance)
        return instance

    def update_totals(self, instance):
        instance.refresh_from_db()
        lic_cost = sum(i.estimated_cost for i in instance.license_items.all())
        lic_marg = sum(i.estimated_margin_amount for i in instance.license_items.all())
        lic_price = sum(i.estimated_price for i in instance.license_items.all())

        impl_cost = sum(i.estimated_cost for i in instance.implementation_items.all())
        impl_marg = sum(i.estimated_margin_amount for i in instance.implementation_items.all())
        impl_price = sum(i.estimated_price for i in instance.implementation_items.all())

        supp_cost = sum(i.estimated_cost for i in instance.support_items.all())
        supp_marg = sum(i.estimated_margin_amount for i in instance.support_items.all())
        supp_price = sum(i.estimated_price for i in instance.support_items.all())

        infra_cost = sum(i.estimated_cost for i in instance.infra_items.all())
        infra_marg = sum(i.estimated_margin_amount for i in instance.infra_items.all())
        infra_price = sum(i.estimated_price for i in instance.infra_items.all())

        other_cost = sum(i.estimated_cost for i in instance.other_items.all())
        other_marg = sum(i.estimated_margin_amount for i in instance.other_items.all())
        other_price = sum(i.estimated_price for i in instance.other_items.all())

        instance.total_estimated_cost = lic_cost + impl_cost + supp_cost + infra_cost + other_cost
        instance.total_estimated_margin = lic_marg + impl_marg + supp_marg + infra_marg + other_marg
        instance.total_estimated_price = lic_price + impl_price + supp_price + infra_price + other_price
        instance.save()
