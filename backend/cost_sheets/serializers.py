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
        read_only_fields = ('cost_sheet', 'estimated_cost', 'estimated_margin_amount', 'estimated_price')
        extra_kwargs = {
            'rate': {'required': False},
            'qty': {'required': False},
            'margin_percentage': {'required': False},
        }

    def validate(self, data):
        rate = data.get('rate', Decimal('0.00'))
        qty = data.get('qty', 1)
        margin_percentage = data.get('margin_percentage', Decimal('0.00'))
        
        data['estimated_cost'] = rate * qty
        data['estimated_margin_amount'] = data['estimated_cost'] * (margin_percentage / Decimal('100'))
        data['estimated_price'] = data['estimated_cost'] + data['estimated_margin_amount']
        return data

class ServiceImplementationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceImplementationItem
        fields = '__all__'
        read_only_fields = ('cost_sheet', 'total_days', 'estimated_cost', 'estimated_margin_amount', 'estimated_price')
        extra_kwargs = {
            'num_resources': {'required': False},
            'num_days': {'required': False},
            'rate_per_day': {'required': False},
            'margin_percentage': {'required': False},
        }

    def validate(self, data):
        num_resources = data.get('num_resources', 1)
        num_days = data.get('num_days', 1)
        rate_per_day = data.get('rate_per_day', Decimal('0.00'))
        margin_percentage = data.get('margin_percentage', Decimal('0.00'))

        data['total_days'] = num_resources * num_days
        data['estimated_cost'] = Decimal(data['total_days']) * rate_per_day
        data['estimated_margin_amount'] = data['estimated_cost'] * (margin_percentage / Decimal('100'))
        data['estimated_price'] = data['estimated_cost'] + data['estimated_margin_amount']
        return data

class ServiceSupportItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceSupportItem
        fields = '__all__'
        read_only_fields = ('cost_sheet', 'total_days', 'estimated_cost', 'estimated_margin_amount', 'estimated_price')
        extra_kwargs = {
            'num_resources': {'required': False},
            'num_days': {'required': False},
            'rate_per_day': {'required': False},
            'margin_percentage': {'required': False},
        }

    def validate(self, data):
        num_resources = data.get('num_resources', 1)
        num_days = data.get('num_days', 1)
        rate_per_day = data.get('rate_per_day', Decimal('0.00'))
        margin_percentage = data.get('margin_percentage', Decimal('0.00'))

        data['total_days'] = num_resources * num_days
        data['estimated_cost'] = Decimal(data['total_days']) * rate_per_day
        data['estimated_margin_amount'] = data['estimated_cost'] * (margin_percentage / Decimal('100'))
        data['estimated_price'] = data['estimated_cost'] + data['estimated_margin_amount']
        return data

class InfrastructureItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InfrastructureItem
        fields = '__all__'
        read_only_fields = ('cost_sheet', 'estimated_cost', 'estimated_margin_amount', 'estimated_price')
        extra_kwargs = {
            'qty': {'required': False},
            'months': {'required': False},
            'rate_per_month': {'required': False},
            'margin_percentage': {'required': False},
        }

    def validate(self, data):
        qty = data.get('qty', 1)
        months = data.get('months', 1)
        rate_per_month = data.get('rate_per_month', Decimal('0.00'))
        margin_percentage = data.get('margin_percentage', Decimal('0.00'))

        data['estimated_cost'] = (qty * rate_per_month) * Decimal(months)
        data['estimated_margin_amount'] = data['estimated_cost'] * (margin_percentage / Decimal('100'))
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
        read_only_fields = ('cost_sheet', 'estimated_cost', 'estimated_margin_amount', 'estimated_price')
        extra_kwargs = {
            'margin_percentage': {'required': False},
            'estimated_cost': {'required': False},
        }

    def validate(self, data):
        # For 'Other', estimated_cost is typically passed directly from frontend
        estimated_cost = data.get('estimated_cost', Decimal('0.00'))
        margin_percentage = data.get('margin_percentage', Decimal('0.00'))

        data['estimated_cost'] = estimated_cost 
        data['estimated_margin_amount'] = estimated_cost * (margin_percentage / Decimal('100'))
        data['estimated_price'] = estimated_cost + data['estimated_margin_amount']
        return data

class CostSheetSerializer(serializers.ModelSerializer):
    license_items = LicenseItemSerializer(many=True, required=False)
    implementation_items = ServiceImplementationItemSerializer(many=True, required=False)
    support_items = ServiceSupportItemSerializer(many=True, required=False)
    infra_items = InfrastructureItemSerializer(many=True, required=False)
    other_items = OtherItemSerializer(many=True, required=False)
    attachments = CostSheetAttachmentSerializer(many=True, read_only=True)
    deal_no = serializers.CharField(source='deal.deal_id', read_only=True, allow_null=True)
    deal_name = serializers.CharField(source='deal.deal_name', read_only=True, allow_null=True)
    deal_amount = serializers.DecimalField(source='deal.deal_amount', max_digits=15, decimal_places=2, read_only=True, allow_null=True)
    currency = serializers.CharField(source='deal.currency', read_only=True, allow_null=True)
    lead_no = serializers.SerializerMethodField()
    lead_details = serializers.SerializerMethodField()
    total_margin_percentage = serializers.SerializerMethodField()

    class Meta:
        model = CostSheet
        fields = '__all__'
        read_only_fields = ('cost_sheet_no', 'total_estimated_cost', 'total_estimated_margin', 'total_estimated_price')

    def get_lead_no(self, obj):
        try:
            return obj.lead.lead_no if obj.lead else None
        except Lead.DoesNotExist:
            return None

    def get_lead_details(self, obj):
        try:
            if not obj.lead:
                return None
            return {
                'id': obj.lead.id,
                'lead_no': obj.lead.lead_no,
                'customer_name': obj.lead.customer_name,
                'project_name': obj.lead.project_name,
                'project_manager': obj.lead.project_manager,
                'sales_person': obj.lead.sales_person
            }
        except Lead.DoesNotExist:
            return None

    def get_total_margin_percentage(self, obj):
        if obj.total_estimated_price and obj.total_estimated_price > 0:
            percentage = (obj.total_estimated_margin / obj.total_estimated_price) * 100
            return round(percentage, 2)
        return 0.00

    def create(self, validated_data):
        license_data = validated_data.pop('license_items', [])
        impl_data = validated_data.pop('implementation_items', [])
        support_data = validated_data.pop('support_items', [])
        infra_data = validated_data.pop('infra_items', [])
        other_data = validated_data.pop('other_items', [])

        pm = validated_data.get('project_manager')
        sp = validated_data.get('sales_person')
        pn = validated_data.get('project_name')

        cost_sheet = CostSheet.objects.create(**validated_data)
        
        # Sync back to associated lead and deal if they exist
        if pm or sp or pn:
            # Sync to Lead
            try:
                lead = cost_sheet.lead
                if lead:
                    if pm: lead.project_manager = pm
                    if sp: lead.sales_person = sp
                    if pn: lead.project_name = pn
                    lead.save()
            except Lead.DoesNotExist:
                pass
            
            # Sync to Deal
            try:
                deal = cost_sheet.deal
                if deal:
                    if pm: deal.project_manager = pm
                    if sp: deal.salesperson_name = sp
                    if pn: deal.project_name = pn
                    deal.save()
            except Exception:
                pass

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

        pm = validated_data.get('project_manager')
        sp = validated_data.get('sales_person')
        pn = validated_data.get('project_name')

        # Update core fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Sync back to associated lead and deal if they exist
        if pm or sp or pn:
            # Sync to Lead
            try:
                lead = instance.lead
                if lead:
                    if pm: lead.project_manager = pm
                    if sp: lead.sales_person = sp
                    if pn: lead.project_name = pn
                    lead.save()
            except (Lead.DoesNotExist, AttributeError):
                pass
            
            # Sync to Deal
            try:
                deal = instance.deal
                if deal:
                    if pm: deal.project_manager = pm
                    if sp: deal.salesperson_name = sp
                    if pn: deal.project_name = pn
                    deal.save()
            except Exception:
                pass

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
