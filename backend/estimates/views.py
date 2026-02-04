from rest_framework import viewsets, status, decorators
from rest_framework.response import Response
from .models import Estimate, Proposal, Renewal, EstimateStatus, EstimateItem, ApprovalStatus, EmailLog
from .serializers import EstimateSerializer, ProposalSerializer, RenewalSerializer
from .permissions import IsSalesHeadOrFinanceManager
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

class EstimateViewSet(viewsets.ModelViewSet):
    queryset = Estimate.objects.all()
    serializer_class = EstimateSerializer

    def get_queryset(self):
        queryset = Estimate.objects.all().order_by('-created_at')
        
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
                Q(project_name__icontains=search) |
                Q(customer_name__icontains=search)
            )
            
        return queryset

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        estimate = self.get_object()
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
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
        return Response(EstimateSerializer(estimate).data)

    @decorators.action(detail=True, methods=['post'])
    def rewind(self, request, pk=None):
        original_estimate = self.get_object()

        
        # BRD: Estimate rewind shall be allowed only once per Estimate (based on version 1).
        # OR "only once per Estimate" might mean only one rewind from the current version.
        # Let's check version.
        if original_estimate.version >= 2:
             return Response(
                {"error": "Estimate rewind is allowed only once per Estimate."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark previous version as not latest
        original_estimate.is_latest = False
        original_estimate.save()

        # Create new version (reset approval for negotiated version)
        new_estimate = Estimate.objects.create(
            estimate_id=original_estimate.estimate_id,
            cost_sheet=original_estimate.cost_sheet,
            deal=original_estimate.deal,
            version=original_estimate.version + 1,
            status=EstimateStatus.PENDING_APPROVAL,
            estimate_date=timezone.now().date(),
            description_memo=original_estimate.description_memo,
            terms_conditions=original_estimate.terms_conditions,
            markup_adjustment=original_estimate.markup_adjustment,
            commercial_terms=original_estimate.commercial_terms,
            total_cost=original_estimate.total_cost,
            total_margin=original_estimate.total_margin,
            total_price=original_estimate.total_price,
            parent_estimate=original_estimate,
            is_latest=True,
            approval_status=ApprovalStatus.PENDING,
            created_by=request.user
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
        
        estimate.approval_status = ApprovalStatus.APPROVED
        estimate.approved_by = request.user
        estimate.approved_at = timezone.now()
        estimate.approval_notes = notes
        estimate.status = EstimateStatus.DRAFT  # Return to draft so they can submit
        estimate.save()
        
        return Response({
            "message": "Estimate approved successfully.",
            "estimate": EstimateSerializer(estimate).data
        })

    @decorators.action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        estimate = self.get_object()
        
        # New customizable fields
        recipient_email = request.data.get('to') or estimate.deal.customer_email or (estimate.deal.customer.email if estimate.deal.customer else None)
        cc_emails = request.data.get('cc', '')
        bcc_emails = request.data.get('bcc', '')
        subject = request.data.get('subject', f"Proposal / Estimate - {estimate.estimate_id}")
        body = request.data.get('body', "")
        
        if not recipient_email:
            return Response(
                {"error": "No recipient email provided or found in records."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get Latest Proposal Attachment
        proposal = estimate.proposals.order_by('-version').first()
        if not proposal:
            return Response(
                {"error": "No proposal file attached to this estimate."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Send Email
        status_code = 'SENT'
        error_msg = ''
        try:
            logger = logging.getLogger(__name__)
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

            # 2. Merge with Proposal PDF (if valid PDF)
            try:
                is_pdf = proposal.filename.lower().endswith('.pdf')
                merged_pdf_bytes = None
                
                if is_pdf:
                    try:
                        proposal_path = proposal.file.path
                        merged_pdf_bytes = merge_pdfs(estimate_pdf_bytes, proposal_path)
                        filename = f"Estimate_{estimate.estimate_id}_Proposal.pdf"
                        email.attach(filename, merged_pdf_bytes, 'application/pdf')
                    except Exception as merge_err:
                         logger.warning(f"Merge failed for {proposal.filename}: {merge_err}. Attaching separately.")
                         email.attach(f"Estimate_{estimate.estimate_id}.pdf", estimate_pdf_bytes, 'application/pdf')
                         with proposal.file.open('rb') as f:
                             email.attach(proposal.filename, f.read(), 'application/octet-stream')
                else:
                    email.attach(f"Estimate_{estimate.estimate_id}.pdf", estimate_pdf_bytes, 'application/pdf')
                    with proposal.file.open('rb') as f:
                        email.attach(proposal.filename, f.read(), 'application/octet-stream')
            except Exception as outer_err:
                 logger.error(f"Error handling attachments: {outer_err}")
                 return Response({'error': f"Failed to process attachments: {str(outer_err)}"}, status=500)

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
             
        return Response({"message": "Email sent successfully"})

    @decorators.action(detail=True, methods=['get'])
    def preview_pdf(self, request, pk=None):
        estimate = self.get_object()
        proposal = estimate.proposals.order_by('-version').first()
        
        try:
            est_pdf = generate_estimate_pdf(estimate)
            if proposal and proposal.filename.lower().endswith('.pdf'):
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
            return Response({"error": str(e)}, status=500)

    @decorators.action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        estimate = self.get_object()
        proposal = estimate.proposals.order_by('-version').first()
        
        try:
            est_pdf = generate_estimate_pdf(estimate)
            filename = f"Estimate_{estimate.estimate_id}.pdf"
            
            if proposal and proposal.filename.lower().endswith('.pdf'):
                try:
                    est_pdf = merge_pdfs(est_pdf, proposal.file.path)
                    filename = f"Estimate_{estimate.estimate_id}_Combined.pdf"
                except:
                    pass
            
            response = HttpResponse(est_pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
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
        
        return Response({
            "message": "Estimate rejected.",
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
            'Estimate ID', 'Version', 'Customer', 'Project', 'Status',
            'Total Price', 'Approval Status', 'Created At'
        ]
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
            
        for row, est in enumerate(estimates, start=1):
            worksheet.write(row, 0, est.estimate_id)
            worksheet.write(row, 1, est.version)
            worksheet.write(row, 2, est.customer_name)
            worksheet.write(row, 3, est.project_name)
            worksheet.write(row, 4, est.status)
            worksheet.write(row, 5, float(est.total_price))
            worksheet.write(row, 6, est.approval_status)
            worksheet.write(row, 7, est.created_at.strftime("%Y-%m-%d %H:%M"))
            
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
                return Response({
                    "status": "error",
                    "message": "PDF generation error occurred."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Estimates_Report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
        except Exception as e:
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
