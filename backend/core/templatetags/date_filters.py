from django import template  # type: ignore
from datetime import date, datetime

register = template.Library()

@register.filter(name='date_format')
def date_format(value):
    """
    Formats a date object or string to DD/MMM/YYYY (e.g., 02/Feb/2026)
    """
    if not value:
        return ""
    
    if isinstance(value, str):
        try:
            # Try to parse string date (assumes YYYY-MM-DD or similar)
            value = date.fromisoformat(value[:10])
        except (ValueError, TypeError):
            return value
            
    if isinstance(value, (date, datetime)):
        return value.strftime("%d/%b/%Y")
    
    return value

@register.filter(name='replace')
def replace(value, arg):
    """
    Replaces characters in a string.
    Usage: {{ value|replace:"old,new" }}
    """
    if not isinstance(value, str):
        return value
    
    if ',' not in arg:
        return value
    
    old, new = arg.split(',', 1)
    return value.replace(old, new)

@register.filter(name='sum_cgst')
def sum_cgst(queryset):
    """
    Sums cgst_amount across all line items in a queryset.
    Usage: {{ invoice.line_items.all|sum_cgst }}
    """
    try:
        return sum(float(item.cgst_amount or 0) for item in queryset)
    except Exception:
        return 0

@register.filter(name='sum_sgst')
def sum_sgst(queryset):
    """
    Sums sgst_amount across all line items in a queryset.
    Usage: {{ invoice.line_items.all|sum_sgst }}
    """
    try:
        return sum(float(item.sgst_amount or 0) for item in queryset)
    except Exception:
        return 0
