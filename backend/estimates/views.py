from rest_framework import viewsets, status, decorators
from rest_framework.response import Response
from .models import Estimate, Proposal, Renewal, EstimateStatus, EstimateItem, ApprovalStatus
from .serializers import EstimateSerializer, ProposalSerializer, RenewalSerializer
from .permissions import IsSalesHeadOrFinanceManager
from django.shortcuts import get_object_or_404
from django.utils import timezone

class EstimateViewSet(viewsets.ModelViewSet):
    queryset = Estimate.objects.all()
    serializer_class = EstimateSerializer

    def get_queryset(self):
        queryset = Estimate.objects.all().order_by('-created_at')
        customer_id = self.request.query_params.get('customer', None)
        approval_status = self.request.query_params.get('approval_status', None)
        
        if customer_id:
            queryset = queryset.filter(deal__customer__id=customer_id)
        
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
            
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

class ProposalViewSet(viewsets.ModelViewSet):
    queryset = Proposal.objects.all()
    serializer_class = ProposalSerializer

class RenewalViewSet(viewsets.ModelViewSet):
    queryset = Renewal.objects.all()
    serializer_class = RenewalSerializer
