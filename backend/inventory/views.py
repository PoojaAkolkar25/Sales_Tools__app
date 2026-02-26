from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Resource, ResourceRequest, RequestStatus, ResourceStatus
from .serializers import ResourceSerializer, ResourceRequestSerializer
from django.contrib.contenttypes.models import ContentType
from deals.models import AuditTrail
import logging

logger = logging.getLogger(__name__)

class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer

class ResourceRequestViewSet(viewsets.ModelViewSet):
    queryset = ResourceRequest.objects.all().order_by('-request_date')
    serializer_class = ResourceRequestSerializer

    def perform_create(self, serializer):
        resource_request = serializer.save(requestor=self.request.user, status=RequestStatus.DRAFT)
        
        # Log audit trail for creation
        content_type = ContentType.objects.get_for_model(ResourceRequest)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=resource_request.id,
            user=self.request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Resource Request {resource_request.id} created'
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        resource_request = self.get_object()
        if resource_request.status != RequestStatus.DRAFT:
            return Response({"error": "Only draft requests can be submitted."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resource_request.status = RequestStatus.PENDING_IT
            resource_request.save()
            
            # Log audit trail for submission
            content_type = ContentType.objects.get_for_model(ResourceRequest)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=resource_request.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value=RequestStatus.DRAFT,
                new_value=RequestStatus.PENDING_IT
            )
            
            return Response(ResourceRequestSerializer(resource_request).data)
        except Exception as e:
            logger.error(f"Error in submit resource request: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def approve_it(self, request, pk=None):
        resource_request = self.get_object()
        if resource_request.status != RequestStatus.PENDING_IT:
            return Response({"error": "Only requests pending IT approval can be processed by IT."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resource_request.status = RequestStatus.PENDING_FINANCE
            resource_request.it_head_approved_by = request.user
            resource_request.it_head_approved_at = timezone.now()
            resource_request.it_head_remarks = request.data.get('remarks', resource_request.it_head_remarks)
            resource_request.save()
            
            # Log audit trail for IT approval
            content_type = ContentType.objects.get_for_model(ResourceRequest)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=resource_request.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value=RequestStatus.PENDING_IT,
                new_value=RequestStatus.PENDING_FINANCE
            )
            
            return Response(ResourceRequestSerializer(resource_request).data)
        except Exception as e:
            logger.error(f"Error in approve_it resource request: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def approve_finance(self, request, pk=None):
        resource_request = self.get_object()
        if resource_request.status != RequestStatus.PENDING_FINANCE:
            return Response({"error": "Only requests pending Finance approval can be processed by Finance."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resource_request.status = RequestStatus.APPROVED
            resource_request.finance_head_approved_by = request.user
            resource_request.finance_head_approved_at = timezone.now()
            resource_request.finance_head_remarks = request.data.get('remarks', resource_request.finance_head_remarks)
            resource_request.save()
            
            # Log audit trail for Finance approval
            content_type = ContentType.objects.get_for_model(ResourceRequest)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=resource_request.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value=RequestStatus.PENDING_FINANCE,
                new_value=RequestStatus.APPROVED
            )
            
            return Response(ResourceRequestSerializer(resource_request).data)
        except Exception as e:
            logger.error(f"Error in approve_finance resource request: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        resource_request = self.get_object()
        # Can be rejected by IT or Finance
        if resource_request.status not in [RequestStatus.PENDING_IT, RequestStatus.PENDING_FINANCE]:
            return Response({"error": "This request cannot be rejected in its current status."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            old_status = resource_request.status
            remarks = request.data.get('remarks', '')
            if resource_request.status == RequestStatus.PENDING_IT:
                resource_request.it_head_remarks = f"REJECTED: {remarks}"
            else:
                resource_request.finance_head_remarks = f"REJECTED: {remarks}"
            
            resource_request.status = RequestStatus.REJECTED
            resource_request.save()
            
            # Log audit trail for rejection
            content_type = ContentType.objects.get_for_model(ResourceRequest)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=resource_request.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value=old_status,
                new_value=RequestStatus.REJECTED
            )
            
            return Response(ResourceRequestSerializer(resource_request).data)
        except Exception as e:
            logger.error(f"Error in reject resource request: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        resource_request = self.get_object()
        if resource_request.status != RequestStatus.APPROVED:
            return Response({"error": "Only approved requests can be issued."}, status=status.HTTP_400_BAD_REQUEST)
        
        resource_id = request.data.get('resource_id')
        if not resource_id:
            return Response({"error": "resource_id is required to issue."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resource = Resource.objects.get(id=resource_id)
        except Resource.DoesNotExist:
            return Response({"error": "Resource not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if resource.status != ResourceStatus.AVAILABLE:
            return Response({"error": "Resource is not available."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Link resource and update statuses
            resource.status = ResourceStatus.ALLOCATED
            resource.save()
            
            resource_request.status = RequestStatus.ISSUED
            resource_request.resource_assigned = resource
            resource_request.issued_by = request.user
            resource_request.issued_at = timezone.now()
            resource_request.save()
            
            # Log audit trail for issuance
            content_type = ContentType.objects.get_for_model(ResourceRequest)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=resource_request.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value=RequestStatus.APPROVED,
                new_value=RequestStatus.ISSUED
            )
            
            return Response(ResourceRequestSerializer(resource_request).data)
        except Exception as e:
            logger.error(f"Error in issue resource request: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
