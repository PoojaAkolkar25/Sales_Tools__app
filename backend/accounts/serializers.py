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

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'password', 'state', 'state_name')
        extra_kwargs = {'password': {'write_only': True}}

    def get_role(self, obj):
        if obj.is_superuser or obj.groups.filter(name='app_admin').exists():
            return 'app_admin'
        return 'app_user'

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        # Create profile with state
        from .models import UserProfile
        UserProfile.objects.create(user=user, state=profile_data.get('state'))
        
        # Assign app_user role automatically
        group, created = Group.objects.get_or_create(name='app_user')
        user.groups.add(group)
        
        return user
