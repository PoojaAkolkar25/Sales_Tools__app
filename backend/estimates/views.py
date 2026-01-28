from rest_framework import viewsets, status, decorators
from rest_framework.response import Response
from .models import Estimate, Proposal, Renewal, EstimateStatus, EstimateItem
from .serializers import EstimateSerializer, ProposalSerializer, RenewalSerializer
from django.shortcuts import get_object_or_404
from django.utils import timezone

class EstimateViewSet(viewsets.ModelViewSet):
    queryset = Estimate.objects.all().order_by('-created_at')
    serializer_class = EstimateSerializer

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        estimate = self.get_object_or_404(pk=pk)
        
        # BRD: An Estimate can be submitted to the customer only after the Cost Sheet is approved.
        if estimate.cost_sheet.status != 'APPROVED':
            return Response(
                {"error": "Estimate cannot be submitted until the associated Cost Sheet is approved."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate Total Amount
        total_estimate_price = sum(float(item.amount) for item in estimate.items.all())
        if total_estimate_price < float(estimate.cost_sheet.total_estimated_price):
            return Response(
                {"error": f"Total Estimate Amount (${total_estimate_price:,.2f}) must be greater than or equal to the approved Cost Sheet Price (${float(estimate.cost_sheet.total_estimated_price):,.2f})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate Proposal Attachment
        if not estimate.proposals.exists():
            return Response(
                {"error": "Please attach a proposal file before submitting the estimate."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estimate.status = EstimateStatus.SUBMITTED
        estimate.save()
        return Response(EstimateSerializer(estimate).data)

    @decorators.action(detail=True, methods=['post'])
    def rewind(self, request, pk=None):
        original_estimate = self.get_object_or_404(pk=pk)
        
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

        # Create new version
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
            parent_estimate=original_estimate,
            is_latest=True,
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

    def get_object_or_404(self, pk):
        return get_object_or_404(Estimate, pk=pk)

class ProposalViewSet(viewsets.ModelViewSet):
    queryset = Proposal.objects.all()
    serializer_class = ProposalSerializer

class RenewalViewSet(viewsets.ModelViewSet):
    queryset = Renewal.objects.all()
    serializer_class = RenewalSerializer
