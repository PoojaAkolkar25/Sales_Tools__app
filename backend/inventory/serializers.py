from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Resource, ResourceRequest

class UserMiniSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'email']

class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = '__all__'

class ResourceRequestSerializer(serializers.ModelSerializer):
    requestor_detail = UserMiniSerializer(source='requestor', read_only=True)
    it_head_approved_by_detail = UserMiniSerializer(source='it_head_approved_by', read_only=True)
    finance_head_approved_by_detail = UserMiniSerializer(source='finance_head_approved_by', read_only=True)
    resource_assigned_detail = ResourceSerializer(source='resource_assigned', read_only=True)
    issued_by_detail = UserMiniSerializer(source='issued_by', read_only=True)
    
    class Meta:
        model = ResourceRequest
        fields = '__all__'
        read_only_fields = [
            'form_number', 'status', 'it_head_approved_by', 'it_head_approved_at',
            'finance_head_approved_by', 'finance_head_approved_at',
            'resource_assigned', 'issued_by', 'issued_at'
        ]
