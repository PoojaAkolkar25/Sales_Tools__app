from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CostSheet, CostSheetStatus, CostSheetAttachment
from .serializers import CostSheetSerializer, CostSheetAttachmentSerializer

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

    @action(detail=True, methods=['post'])
    def upload_attachment(self, request, pk=None):
        instance = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        attachment = CostSheetAttachment.objects.create(
            cost_sheet=instance,
            file=file,
            filename=file.name
        )
        serializer = CostSheetAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def delete_attachment(self, request, pk=None):
        attachment_id = request.query_params.get('attachment_id')
        if not attachment_id:
            return Response({'error': 'attachment_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            attachment = CostSheetAttachment.objects.get(id=attachment_id, cost_sheet_id=pk)
            attachment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CostSheetAttachment.DoesNotExist:
            return Response({'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)
