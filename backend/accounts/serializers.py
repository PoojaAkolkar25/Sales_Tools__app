from rest_framework import serializers
from django.contrib.auth.models import User, Group

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def get_role(self, obj):
        if obj.is_superuser or obj.groups.filter(name='app_admin').exists():
            return 'app_admin'
        return 'app_user'

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        # Assign app_user role automatically
        group, created = Group.objects.get_or_create(name='app_user')
        user.groups.add(group)
        
        return user
