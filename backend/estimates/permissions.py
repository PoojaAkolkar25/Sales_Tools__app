from rest_framework import permissions

class IsSalesHeadOrFinanceManager(permissions.BasePermission):
    """
    Custom permission to only allow Sales Head or Finance Manager to approve/reject estimates.
    Users must be in either 'Sales Head' or 'Finance Manager' Django group.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers always have permission
        if request.user.is_superuser:
            return True
        
        # Check if user is in Sales Head or Finance Manager group
        return request.user.groups.filter(name__in=['Sales Head', 'Finance Manager']).exists()
