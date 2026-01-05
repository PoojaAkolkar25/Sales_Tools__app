from rest_framework import viewsets
from .models import Lead
from .serializers import LeadSerializer

class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer

    def get_queryset(self):
        lead_no = self.request.query_params.get('lead_no', None)
        if lead_no is not None:
            return Lead.objects.filter(lead_no=lead_no)
        return super().get_queryset()
