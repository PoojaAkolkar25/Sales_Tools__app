from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RevenueContract, RevenueSchedule, ConsumptionRecord, FixedBidProgress, PeriodLock
from .serializers import (
    RevenueContractSerializer, RevenueScheduleSerializer, 
    ConsumptionRecordSerializer, FixedBidProgressSerializer, PeriodLockSerializer
)
from .services import compute_revenue_schedule, post_to_gl
from datetime import datetime

class RevenueContractViewSet(viewsets.ModelViewSet):
    queryset = RevenueContract.objects.all()
    serializer_class = RevenueContractSerializer

    @action(detail=True, methods=['post'])
    def compute_schedule(self, request, pk=None):
        try:
            compute_revenue_schedule(pk)
            return Response({'status': 'Revenue schedule computed successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_CASE)

class RevenueScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RevenueSchedule.objects.all()
    serializer_class = RevenueScheduleSerializer
    filterset_fields = ['contract', 'period_month', 'is_posted']

    @action(detail=0, methods=['post'])
    def post_period(self, request):
        period_str = request.data.get('period_month')
        if not period_str:
            return Response({'error': 'period_month is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            period_date = datetime.strptime(period_str, '%Y-%m-%d').date()
            post_to_gl(period_date)
            return Response({'status': f'Period {period_str} posted to GL and locked successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ConsumptionRecordViewSet(viewsets.ModelViewSet):
    queryset = ConsumptionRecord.objects.all()
    serializer_class = ConsumptionRecordSerializer

class FixedBidProgressViewSet(viewsets.ModelViewSet):
    queryset = FixedBidProgress.objects.all()
    serializer_class = FixedBidProgressSerializer

class PeriodLockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PeriodLock.objects.all()
    serializer_class = PeriodLockSerializer
