from django_filters import rest_framework as filters  # type: ignore
from .models import Invoice
from datetime import datetime, timedelta
from django.utils import timezone  # type: ignore


class InvoiceFilter(filters.FilterSet):
    """
    Advanced filtering for Invoice Module supporting:
    - Invoice Number, Customer Name, Deal ID, Status, Type
    - Date ranges: Last month, Last 3 months, Last 6 months, Last year, Custom range
    """
    invoice_no = filters.CharFilter(field_name='invoice_no', lookup_expr='icontains')
    customer_name = filters.CharFilter(field_name='lead__customer_name', lookup_expr='icontains')
    deal = filters.NumberFilter(field_name='deal__id')
    invoice_type = filters.ChoiceFilter(choices=Invoice._meta.get_field('invoice_type').choices)
    status = filters.ChoiceFilter(choices=Invoice._meta.get_field('status').choices)
    
    # Date range filters
    date_from = filters.DateFilter(field_name='invoice_date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='invoice_date', lookup_expr='lte')
    
    # Preset date ranges (handled via query param)
    date_range = filters.CharFilter(method='filter_date_range')
    
    class Meta:
        model = Invoice
        fields = ['invoice_no', 'customer_name', 'deal', 'invoice_type', 'status', 'date_from', 'date_to', 'date_range']
    
    def filter_date_range(self, queryset, name, value):
        """
        Handle preset date ranges: last_month, last_3_months, last_6_months, last_year
        """
        today = timezone.now().date()
        
        if value == 'last_month':
            start_date = today - timedelta(days=30)
        elif value == 'last_3_months':
            start_date = today - timedelta(days=90)
        elif value == 'last_6_months':
            start_date = today - timedelta(days=180)
        elif value == 'last_year':
            start_date = today - timedelta(days=365)
        else:
            # Invalid or custom range handled by date_from/date_to
            return queryset
        
        return queryset.filter(invoice_date__gte=start_date, invoice_date__lte=today)
