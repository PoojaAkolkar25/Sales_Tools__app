from rest_framework import viewsets, status, decorators, permissions
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from .models import Estimate, Proposal, Renewal, EstimateStatus, EstimateItem, ApprovalStatus, EmailLog
from .serializers import EstimateSerializer, ProposalSerializer, RenewalSerializer
from .permissions import IsSalesHeadOrFinanceManager
from deals.models import AuditTrail
from django.db import models
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponse
from django.utils import timezone
from django.core.mail import EmailMessage
from .utils import generate_estimate_pdf, merge_pdfs
from django.db.models import Q
from django.utils import timezone
from django.http import HttpResponse
import io
import xlsxwriter
import logging

logger = logging.getLogger(__name__)

class EstimateViewSet(viewsets.ModelViewSet):
    queryset = Estimate.objects.all()
    serializer_class = EstimateSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Estimate.objects.all().order_by('-created_at')
        
        # User-wise data view validation: 
        # Non-admins (not superuser and not in Sales Head/Finance Manager groups) 
        # should only see estimates they created.
        if user.is_authenticated:
            is_admin = user.is_superuser or user.groups.filter(name__in=['Sales Head', 'Finance Manager']).exists()
            if not is_admin:
                queryset = queryset.filter(created_by=user)
        # For anonymous users (like preview_pdf/download_pdf permissions), we don't filter by created_by

        # Simple filtering
        customer_id = self.request.query_params.get('customer', None)
        status = self.request.query_params.get('status', None)
        approval_status = self.request.query_params.get('approval_status', None)
        is_latest = self.request.query_params.get('is_latest', None)
        search = self.request.query_params.get('search', None)
        
        if customer_id:
            queryset = queryset.filter(deal__customer__id=customer_id)
        
        if status:
            queryset = queryset.filter(status=status)
            
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
            
        if is_latest is not None:
             queryset = queryset.filter(is_latest=(is_latest.lower() == 'true'))

        if search:
            queryset = queryset.filter(
                Q(estimate_id__icontains=search) |
                Q(deal__deal_name__icontains=search) |
                Q(deal__customer__name__icontains=search)
            )
            
        return queryset
    
    def perform_create(self, serializer):
        """Create estimate and log audit trail"""
        estimate = serializer.save()
        
        # Create audit log for creation
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=estimate.id,
            user=self.request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Estimate {estimate.estimate_id} v{estimate.version} created'
        )
    
    def update(self, request, *args, **kwargs):
        """Update estimate and log field changes"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Track original values for key fields
        original_data = {
            'estimate_date': str(instance.estimate_date) if instance.estimate_date else '',
            'description_memo': instance.description_memo or '',
            'terms_conditions': instance.terms_conditions or '',
            'approval_status': instance.approval_status,
            'status': instance.status,
        }
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log changes
        content_type = ContentType.objects.get_for_model(Estimate)
        new_data = {
            'estimate_date': str(instance.estimate_date) if instance.estimate_date else '',
            'description_memo': instance.description_memo or '',
            'terms_conditions': instance.terms_conditions or '',
            'approval_status': instance.approval_status,
            'status': instance.status,
        }
        
        for field, old_value in original_data.items():
            new_value = new_data[field]
            if str(old_value) != str(new_value):
                AuditTrail.objects.create(
                    content_type=content_type,
                    object_id=instance.id,
                    user=request.user,
                    action_type='UPDATE',
                    field_name=field,
                    old_value=str(old_value),
                    new_value=str(new_value)
                )
        
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        estimate = self.get_object()
        
        logger.info(f"Submitting estimate {estimate.estimate_id}")
        logger.info(f"Cost sheet status: {estimate.cost_sheet.status}")
        logger.info(f"Items count: {estimate.items.count()}")
        
        # BRD: An Estimate can be submitted to the customer only after the Cost Sheet is approved.
        if estimate.cost_sheet.status != 'APPROVED':
            return Response(
                {"error": "Estimate cannot be submitted until the associated Cost Sheet is approved."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate Total Amount
        total_estimate_price = sum(float(item.amount) for item in estimate.items.all())
        cost_sheet_price = float(estimate.cost_sheet.total_estimated_price)
        
        logger.info(f"Total estimate price: {total_estimate_price}")
        logger.info(f"Cost sheet price: {cost_sheet_price}")
        
        if total_estimate_price < cost_sheet_price:
            return Response(
                {"error": f"Total Estimate Amount (${total_estimate_price:,.2f}) must be greater than or equal to the approved Cost Sheet Price (${cost_sheet_price:,.2f})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate Proposal Attachment
        if not estimate.proposals.exists():
            return Response(
                {"error": "Please attach a proposal file before submitting the estimate."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate Approval Status
        if estimate.approval_status != ApprovalStatus.APPROVED:
            return Response(
                {"error": "Estimate must be approved by Sales Head or Finance Manager before submission to customer."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estimate.status = EstimateStatus.SUBMITTED
        estimate.save()
        
        # Log audit trail for submission
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=estimate.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value='DRAFT',
            new_value='SUBMITTED'
        )
        
        return Response(EstimateSerializer(estimate).data)

    @decorators.action(detail=True, methods=['post'])
    def rewind(self, request, pk=None):
        original_estimate = self.get_object()

        if not original_estimate.is_latest:
            return Response(
                {"error": "Only the latest version of an estimate can be rewound."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if original_estimate.version != 1:
            return Response(
                {"error": "Rewind is only allowed once (from version 1)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark previous version as not latest and set status to REWOUND
        original_estimate.is_latest = False
        original_estimate.status = EstimateStatus.REWOUND
        original_estimate.save()

        # Log audit trail for rewound version
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=original_estimate.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value='SUBMITTED', # Typically submitted estimates are rewound
            new_value='REWOUND'
        )

        # Create new version (reset approval for negotiated version)
        new_estimate = Estimate.objects.create(
            estimate_id=original_estimate.estimate_id,
            cost_sheet=original_estimate.cost_sheet,
            deal=original_estimate.deal,
            version=original_estimate.version + 1,
            status=EstimateStatus.DRAFT,
            estimate_date=timezone.now().date(),
            description_memo=original_estimate.description_memo,
            terms_conditions=original_estimate.terms_conditions,
            markup_adjustment=original_estimate.markup_adjustment,
            commercial_terms=original_estimate.commercial_terms,
            total_cost=original_estimate.total_cost,
            total_margin=original_estimate.total_margin,
            total_price=original_estimate.total_price,
            column_labels=original_estimate.column_labels,  # Copy custom column labels
            parent_estimate=original_estimate,
            is_latest=True,
            approval_status=ApprovalStatus.PENDING,
            created_by=request.user
        )

        # Log audit trail for new version creation
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=new_estimate.id,
            user=request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Estimate {new_estimate.estimate_id} v{new_estimate.version} created via Rewind'
        )

        # Copy line items
        for item in original_estimate.items.all():
            EstimateItem.objects.create(
                estimate=new_estimate,
                sr_no=item.sr_no,
                particulars=item.particulars,
                description=item.description,
                qty=item.qty,
                rate=item.rate,
                amount=item.amount
            )

        # Copy proposals
        for prop in original_estimate.proposals.all():
            if prop.file:
                # Create a new version of the proposal for the new estimate
                Proposal.objects.create(
                    estimate=new_estimate,
                    file=prop.file,
                    filename=prop.filename,
                    version=1, # Reset version for the new estimate
                    uploaded_by=request.user if request.user.is_authenticated else None
                )

        return Response(EstimateSerializer(new_estimate).data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=['post'])
    def auto_renewal(self, request, pk=None):
        original_estimate = self.get_object()

        # BRD: Auto-renewal shall only happen for Approved estimates.
        if original_estimate.approval_status != ApprovalStatus.APPROVED:
             return Response(
                {"error": "Only approved estimates can be auto-renewed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new estimate (reset version, new estimate_id will be generated in save())
        new_estimate = Estimate.objects.create(
            cost_sheet=original_estimate.cost_sheet,
            deal=original_estimate.deal,
            version=1,
            status=EstimateStatus.DRAFT,
            estimate_date=timezone.now().date(),
            subscription_from=original_estimate.subscription_to + timezone.timedelta(days=1) if original_estimate.subscription_to else None,
            subscription_to=None,
            description_memo=original_estimate.description_memo,
            terms_conditions=original_estimate.terms_conditions,
            markup_adjustment=original_estimate.markup_adjustment,
            commercial_terms=original_estimate.commercial_terms,
            total_cost=original_estimate.total_cost,
            total_margin=original_estimate.total_margin,
            total_price=original_estimate.total_price,
            column_labels=original_estimate.column_labels,  # Copy custom column labels
            parent_estimate=None,
            is_latest=True,
            approval_status=ApprovalStatus.PENDING,
            created_by=request.user
        )

        # Log audit trail for auto-renewal creation
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=new_estimate.id,
            user=request.user,
            action_type='CREATE',
            field_name='created',
            old_value='',
            new_value=f'Estimate {new_estimate.estimate_id} v{new_estimate.version} created via Auto-Renewal'
        )

        # Copy line items
        for item in original_estimate.items.all():
            EstimateItem.objects.create(
                estimate=new_estimate,
                sr_no=item.sr_no,
                particulars=item.particulars,
                description=item.description,
                hsn_sac=item.hsn_sac,
                qty=item.qty,
                rate=item.rate,
                amount=item.amount
            )

        return Response(EstimateSerializer(new_estimate).data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=['post'])
    def request_approval(self, request, pk=None):
        estimate = self.get_object()
        
        if estimate.status not in [EstimateStatus.DRAFT, EstimateStatus.NEGOTIATION]:
            return Response(
                {"error": "Only draft or negotiation estimates can request approval."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estimate.status = EstimateStatus.PENDING_APPROVAL
        estimate.approval_status = ApprovalStatus.PENDING
        estimate.save()
        
        # Log audit trail for requesting approval
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=estimate.id,
            user=request.user,
            action_type='UPDATE',
            field_name='status',
            old_value='DRAFT',
            new_value='PENDING_APPROVAL'
        )
        
        return Response(EstimateSerializer(estimate).data)

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsSalesHeadOrFinanceManager])
    def approve(self, request, pk=None):
        estimate = self.get_object()
        notes = request.data.get('notes', '')
        
        if estimate.approval_status == ApprovalStatus.APPROVED:
            return Response(
                {"error": "Estimate is already approved."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # BRD: Estimate can be approved ONLY if the associated Cost Sheet is Approved.
        if estimate.cost_sheet.status != 'APPROVED':
            return Response(
                {"error": "Estimate cannot be approved until the associated Cost Sheet is approved."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estimate.approval_status = ApprovalStatus.APPROVED
        estimate.approved_by = request.user
        estimate.approved_at = timezone.now()
        estimate.approval_notes = notes
        estimate.status = EstimateStatus.DRAFT  # Return to draft so they can submit
        estimate.save()
        
        # Log audit trail for approval
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=estimate.id,
            user=request.user,
            action_type='UPDATE',
            field_name='approval_status',
            old_value='PENDING',
            new_value='APPROVED'
        )
        
        return Response({
            "message": "Estimate approved successfully.",
            "estimate": EstimateSerializer(estimate).data
        })

    @decorators.action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        estimate = self.get_object()
        
        # New customizable fields
        recipient_email = (request.data.get('to') or '').strip()
        if not recipient_email:
            recipient_email = (estimate.deal.customer_email or '').strip() or \
                             ((estimate.deal.customer.email or '').strip() if estimate.deal and estimate.deal.customer else '') or \
                             ((estimate.deal.lead.email or '').strip() if estimate.deal and estimate.deal.lead else '')
        
        cc_emails = request.data.get('cc', '')
        bcc_emails = request.data.get('bcc', '')
        customer_alias = estimate.deal.customer.alias_name if estimate.deal and estimate.deal.customer else ""
        project_name = estimate.deal.deal_name if estimate.deal else ""
        subject = request.data.get('subject', f"{customer_alias} - {estimate.estimate_id} - {project_name}")
        body = request.data.get('body', "")
        
        if not recipient_email:
            return Response(
                {"error": "No recipient email provided or found in records. Please update the Lead or Deal contact info, or provide it in the request."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get Latest Proposal Attachment (Optional)
        proposal = estimate.proposals.order_by('-version').first()

        # Send Email
        status_code = 'SENT'
        error_msg = ''
        try:
            # Process CC and BCC strings into lists
            cc_list = [e.strip() for e in cc_emails.split(',') if e.strip()]
            bcc_list = [e.strip() for e in bcc_emails.split(',') if e.strip()]
            
            email = EmailMessage(
                subject=subject,
                body=body,
                to=[recipient_email],
                cc=cc_list,
                bcc=bcc_list,
            )
            
            # 1. Generate Estimate PDF
            try:
                estimate_pdf_bytes = generate_estimate_pdf(estimate)
            except Exception as e:
                return Response({'error': f"Failed to generate Estimate PDF: {str(e)}"}, status=500)

            # 2. Attach Proposal File (if exists)
            email.attach(f"Estimate_{estimate.estimate_id}.pdf", estimate_pdf_bytes, 'application/pdf')
            
            if proposal and proposal.file:
                try:
                    with proposal.file.open('rb') as f:
                        email.attach(proposal.filename, f.read(), 'application/octet-stream')
                except Exception as e:
                    logger.warning(f"Failed to attach proposal file to email for estimate {estimate.id}: {e}")

            email.send()
            
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
            status_code = 'FAILED'
            error_msg = str(e)
            
        # 3. Log the communication
        EmailLog.objects.create(
            estimate=estimate,
            subject=subject,
            recipient=recipient_email,
            cc=cc_emails,
            bcc=bcc_emails,
            status=status_code,
            error_message=error_msg,
            sent_by=request.user if request.user.is_authenticated else None
        )
        
        if status_code == 'FAILED':
             return Response({"error": f"Failed to send email: {error_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 4. Update estimate status to SUBMITTED
        estimate.status = EstimateStatus.SUBMITTED
        estimate.save()
             
        return Response({"message": "Email sent successfully"})

    @decorators.action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def preview_pdf(self, request, pk=None):
        estimate = self.get_object()
        proposal = estimate.proposals.order_by('-version').first()
        
        try:
            est_pdf = generate_estimate_pdf(estimate)
            if proposal and proposal.file and proposal.filename.lower().endswith('.pdf'):
                try:
                    merged = merge_pdfs(est_pdf, proposal.file.path)
                    response = HttpResponse(merged, content_type='application/pdf')
                except:
                     response = HttpResponse(est_pdf, content_type='application/pdf')
            else:
                response = HttpResponse(est_pdf, content_type='application/pdf')
            
            response['Content-Disposition'] = 'inline; filename="preview.pdf"'
            return response
        except Exception as e:
            logger.error(f"Error in preview_pdf (EstimateViewSet): {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=500)

    @decorators.action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def download_pdf(self, request, pk=None):
        estimate = self.get_object()
        proposal = estimate.proposals.order_by('-version').first()
        
        try:
            est_pdf = generate_estimate_pdf(estimate)
            filename = f"Estimate_{estimate.estimate_id}.pdf"
            
            if proposal and proposal.file and proposal.filename.lower().endswith('.pdf'):
                try:
                    est_pdf = merge_pdfs(est_pdf, proposal.file.path)
                    filename = f"Estimate_{estimate.estimate_id}_Combined.pdf"
                except:
                    pass
            
            response = HttpResponse(est_pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            logger.error(f"Error in download_pdf (EstimateViewSet): {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=500)

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsSalesHeadOrFinanceManager])
    def reject(self, request, pk=None):
        estimate = self.get_object()
        notes = request.data.get('notes', '')
        
        if not notes:
            return Response(
                {"error": "Rejection notes are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estimate.approval_status = ApprovalStatus.REJECTED
        estimate.approved_by = request.user
        estimate.approved_at = timezone.now()
        estimate.approval_notes = notes
        estimate.status = EstimateStatus.REJECTED
        estimate.save()
        
        # Log audit trail for rejection
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=estimate.id,
            user=request.user,
            action_type='UPDATE',
            field_name='approval_status',
            old_value='PENDING',
            new_value='REJECTED'
        )
        
        return Response({
            "message": "Estimate rejected.",
            "estimate": EstimateSerializer(estimate).data
        })

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsSalesHeadOrFinanceManager])
    def unapprove(self, request, pk=None):
        """
        Reverts an approved or rejected estimate back to Pending/Draft state for editing.
        """
        estimate = self.get_object()
        
        # Security check: Ensure only authorized users can do this (handled by permission_classes)
        # But we might want to log who did it
        
        estimate.approval_status = ApprovalStatus.PENDING
        estimate.status = EstimateStatus.DRAFT # Or NEGOTIATION, but DRAFT is safest for editing
        estimate.approved_by = None
        estimate.approved_at = None
        # valid_until logic might need reset? preserving for now
        
        estimate.save()
        
        # Log audit trail for unapprove action
        content_type = ContentType.objects.get_for_model(Estimate)
        AuditTrail.objects.create(
            content_type=content_type,
            object_id=estimate.id,
            user=request.user,
            action_type='UPDATE',
            field_name='approval_status',
            old_value='APPROVED/REJECTED',
            new_value='PENDING'
        )
        
        return Response({
            "message": "Estimate approval reverted. You can now edit this estimate.",
            "estimate": EstimateSerializer(estimate).data
        })

    @decorators.action(detail=False, methods=['get'])
    def export_excel(self, request):
        estimates = self.get_queryset()
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Estimates Report")
        
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#FF6B00',
            'font_color': 'white',
            'border': 1
        })
        
        headers = [
            'Deal ID', 'Deal Amount', 'Cost Sheet No', 'CS Amount', 
            'Est. ID', 'Date', 'Estimate Date', 'Customer', 'Project', 
            'Est. Total Value', 'Status', 'Sub. From', 'Sub. To', 'Proposal'
        ]
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
            
        for row, est in enumerate(estimates, start=1):
            proposal = est.proposals.order_by('-version').first()
            proposal_name = proposal.filename if proposal else '-'
            
            worksheet.write(row, 0, est.deal.deal_id if est.deal else '—')
            worksheet.write(row, 1, float(est.deal.deal_amount) if est.deal else 0)
            worksheet.write(row, 2, est.cost_sheet.cost_sheet_no if est.cost_sheet else '—')
            worksheet.write(row, 3, float(est.cost_sheet.total_estimated_price) if est.cost_sheet else 0)
            worksheet.write(row, 4, est.estimate_id)
            worksheet.write(row, 5, est.created_at.strftime("%Y-%m-%d %H:%M"))
            worksheet.write(row, 6, est.estimate_date.strftime("%Y-%m-%d") if est.estimate_date else '—')
            worksheet.write(row, 7, est.deal.customer.name if est.deal and est.deal.customer else '—')
            worksheet.write(row, 8, est.deal.deal_name if est.deal else '—')
            worksheet.write(row, 9, float(est.total_price))
            worksheet.write(row, 10, est.get_status_display())
            worksheet.write(row, 11, est.subscription_from.strftime("%Y-%m-%d") if est.subscription_from else '—')
            worksheet.write(row, 12, est.subscription_to.strftime("%Y-%m-%d") if est.subscription_to else '—')
            worksheet.write(row, 13, proposal_name)
            
        workbook.close()
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Estimates_Report_{timezone.now().strftime("%Y%m%d")}.xlsx"'
        return response

    @decorators.action(detail=False, methods=['get'])
    def export_pdf(self, request):
        try:
            from django.template.loader import render_to_string
            from xhtml2pdf import pisa
            
            estimates = self.get_queryset()
            html_string = render_to_string('estimates/report_pdf.html', {'estimates': estimates, 'now': timezone.now()})
            
            result = io.BytesIO()
            pisa_status = pisa.CreatePDF(html_string, dest=result)
            
            if pisa_status.err:
                logger.error("PDF generation error occurred in export_pdf (EstimateViewSet)")
                return Response({
                    "status": "error",
                    "message": "PDF generation error occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Estimates_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
        except Exception as e:
            logger.error(f"Error in export_pdf (EstimateViewSet): {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": f"PDF export failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProposalViewSet(viewsets.ModelViewSet):
    queryset = Proposal.objects.all()
    serializer_class = ProposalSerializer

    def perform_create(self, serializer):
        estimate_id = self.request.data.get('estimate')
        if estimate_id:
            # Find the latest version for this estimate and increment
            latest_version = Proposal.objects.filter(estimate_id=estimate_id).aggregate(
                max_version=models.Max('version'))['max_version'] or 0
            serializer.save(
                version=latest_version + 1,
                uploaded_by=self.request.user if self.request.user.is_authenticated else None
            )
        else:
            serializer.save(uploaded_by=self.request.user if self.request.user.is_authenticated else None)

    # Simplified create to use perform_create standard logic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

class RenewalViewSet(viewsets.ModelViewSet):
    queryset = Renewal.objects.all()
    serializer_class = RenewalSerializer
