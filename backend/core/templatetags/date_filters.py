from django import template
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
