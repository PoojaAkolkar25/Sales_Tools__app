from rest_framework import serializers
from django.contrib.auth.models import User, Group
from finance.models import StateMaster

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    state = serializers.PrimaryKeyRelatedField(
        queryset=StateMaster.objects.all(),
        source='profile.state',
        required=False,
        allow_null=True
    )
    state_name = serializers.CharField(source='profile.state.name', read_only=True)
    employee_id = serializers.CharField(source='profile.employee_id', read_only=True)
    mobile = serializers.CharField(source='profile.mobile', required=False)
    department = serializers.CharField(source='profile.department', required=False)
    region = serializers.CharField(source='profile.region', required=False)
    status_label = serializers.CharField(source='profile.status', read_only=True)
    reporting_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='profile.reporting_to',
        required=False,
        allow_null=True
    )
    reporting_to_name = serializers.CharField(source='profile.reporting_to.get_full_name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'password', 
            'state', 'state_name', 'employee_id', 'mobile', 'department', 'region', 
            'status_label', 'reporting_to', 'reporting_to_name'
        )
        extra_kwargs = {'password': {'write_only': True}}

    def get_role(self, obj):
        # Specific check for admin first
        if obj.is_superuser or obj.groups.filter(name__in=['app_admin', 'Admin']).exists():
            return 'app_admin'
        
        # Check for other granular roles (matching backend permission groups)
        if obj.groups.filter(name='Sales Head').exists():
            return 'sales_head'
        if obj.groups.filter(name='Finance Manager').exists():
            return 'finance_manager'
        
        roles = ['sales_head', 'finance_manager', 'inside_sales_head', 'pm_head', 'salesperson']
        for r in roles:
            if obj.groups.filter(name=r).exists():
                return r
                
        return 'app_user'

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        role = self.initial_data.get('role', 'app_user')
        password = validated_data.pop('password')
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        # Create profile with all fields
        from .models import UserProfile
        UserProfile.objects.create(
            user=user, 
            state=profile_data.get('state'),
            mobile=profile_data.get('mobile'),
            department=profile_data.get('department'),
            region=profile_data.get('region'),
            reporting_to=profile_data.get('reporting_to')
        )
        
        # Assign role group
        group, created = Group.objects.get_or_create(name=role)
        user.groups.add(group)
        
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        role = self.initial_data.get('role')
        password = validated_data.pop('password', None)

        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        instance.save()

        # Update profile
        if profile_data:
            from .models import UserProfile
            profile, created = UserProfile.objects.get_or_create(user=instance)
            
            # Update all profile fields if present in data
            for field in ['state', 'mobile', 'department', 'region', 'reporting_to']:
                if field in profile_data:
                    setattr(profile, field, profile_data[field])
            
            profile.save()

        # Update Role Group
        if role:
            instance.groups.clear()
            group, created = Group.objects.get_or_create(name=role)
            instance.groups.add(group)

        return instance
