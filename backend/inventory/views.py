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
            resource_request.status = RequestStatus.SUBMITTED
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
                new_value=RequestStatus.SUBMITTED
            )
            
            return Response(ResourceRequestSerializer(resource_request).data)
        except Exception as e:
            logger.error(f"Error in submit resource request: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def submit_to_it(self, request, pk=None):
        resource_request = self.get_object()
        if resource_request.status != RequestStatus.SUBMITTED:
            return Response({"error": "Only submitted requests can be sent to IT Head."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Checked by Project Manager or Admin
        if not (request.user.groups.filter(name='Project Manager').exists() or request.user.is_superuser):
            return Response({"error": "Only Project Managers can submit requests to IT Head."}, status=status.HTTP_403_FORBIDDEN)

        try:
            resource_request.status = RequestStatus.PENDING_IT
            resource_request.save()
            
            # Log audit trail
            content_type = ContentType.objects.get_for_model(ResourceRequest)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=resource_request.id,
                user=request.user,
                action_type='UPDATE',
                field_name='status',
                old_value=RequestStatus.SUBMITTED,
                new_value=RequestStatus.PENDING_IT
            )
            
            return Response(ResourceRequestSerializer(resource_request).data)
        except Exception as e:
            logger.error(f"Error in submit_to_it: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def approve_it(self, request, pk=None):
        resource_request = self.get_object()
        if resource_request.status != RequestStatus.PENDING_IT:
            return Response({"error": "Only requests pending IT approval can be processed by IT."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not (request.user.groups.filter(name='IT Head').exists() or request.user.is_superuser):
            return Response({"error": "Only IT Head can approve this request."}, status=status.HTTP_403_FORBIDDEN)
        
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
        
        if not (request.user.groups.filter(name='Finance Manager').exists() or request.user.is_superuser):
            return Response({"error": "Only Finance Head can approve this request."}, status=status.HTTP_403_FORBIDDEN)
        
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
        
        if not (request.user.groups.filter(name='Server Issuing Authority').exists() or request.user.is_superuser):
            return Response({"error": "Only Server Issuing Authority can issue resources."}, status=status.HTTP_403_FORBIDDEN)
        
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

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        try:
            from django.template.loader import render_to_string
            from django.http import HttpResponse
            from xhtml2pdf import pisa
            import io
            import os
            from django.conf import settings
            from django.utils import timezone
            
            req_obj = self.get_object()

            html_string = render_to_string('inventory/resource_request_pdf.html', {
                'req': req_obj,
                'now': timezone.now(),
                'roboto_font_path': os.path.join(settings.BASE_DIR, 'static/fonts/Roboto-Regular.ttf')
            })
            
            result = io.BytesIO()
            # Encode correctly for UTF-8 Support
            pdf = pisa.pisaDocument(io.BytesIO(html_string.encode('utf-8')), result)
            
            if not pdf.err:
                response = HttpResponse(result.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{req_obj.form_number}.pdf"'
                return response
            else:
                logger.error("PDF generation errors in Resource Request")
                return Response({'error': 'PDF generation failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in download_pdf (ResourceRequest): {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
