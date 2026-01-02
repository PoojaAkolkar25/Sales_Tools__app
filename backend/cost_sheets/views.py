from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CostSheet, CostSheetStatus
from .serializers import CostSheetSerializer

class CostSheetViewSet(viewsets.ModelViewSet):
    queryset = CostSheet.objects.all()
    serializer_class = CostSheetSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        instance = self.get_object()
        if instance.status != CostSheetStatus.SUBMITTED:
            return Response({'error': 'Only submitted cost sheets can be approved'}, status=status.HTTP_400_BAD_REQUEST)
        
        instance.status = CostSheetStatus.APPROVED
        instance.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        instance = self.get_object()
        if instance.status != CostSheetStatus.SUBMITTED:
            return Response({'error': 'Only submitted cost sheets can be rejected'}, status=status.HTTP_400_BAD_REQUEST)
        
        comments = request.data.get('comments')
        if not comments:
            return Response({'error': 'Rejection comments are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        instance.status = CostSheetStatus.REJECTED
        instance.approval_comments = comments
        instance.save()
        return Response({'status': 'rejected'})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != CostSheetStatus.PENDING:
            return Response({'error': 'Editing is restricted for this cost sheet status'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != CostSheetStatus.PENDING:
            return Response({'error': 'Editing is restricted for this cost sheet status'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)
