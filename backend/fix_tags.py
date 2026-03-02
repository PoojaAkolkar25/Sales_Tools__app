import re

file_path = r'D:\Sales_tools_application\Sales_Tools__app\backend\core\templates\estimates\estimate_pdf.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Join {% ... %} split across lines
content = re.sub(r'\{%\s+(.*?)\s+\n\s+(.*?)\s+%\}', r'{% \1 \2 %}', content, flags=re.MULTILINE)
# Join {{ ... }} split across lines
content = re.sub(r'\{\{\s+(.*?)\s+\n\s+(.*?)\s+\}\}', r'{{ \1 \2 }}', content, flags=re.MULTILINE)

# Specifically target the identified split tags if the general regex missed them
# {% endif %} split
content = re.sub(r'\{%\s+endif\s*\n\s+%\}', r'{% endif %}', content)
# Variable split in addresses
content = re.sub(r'\{\{\s*\n\s+estimate.deal.customer.state.name\|default:estimate.deal.customer.state }}, <span\s*\n\s+class="bold">Code:</span> \{\{\s*\n\s+estimate.deal.customer.state_code\|default:estimate.deal.customer.state.code }}', 
                 r'{{ estimate.deal.customer.state.name|default:estimate.deal.customer.state }}, <span class="bold">Code:</span> {{ estimate.deal.customer.state_code|default:estimate.deal.customer.state.code }}', content)

# Period split
content = re.sub(r'Period: \{\{\s+item.subscription_from\|date:"d/m/Y"\|default:"-"\s+\}\} to \{\{\s*\n\s+item.subscription_to\|date:"d/m/Y"\|default:"-"\s+\}\}',
                 r'Period: {{ item.subscription_from|date:"d/m/Y"|default:"-" }} to {{ item.subscription_to|date:"d/m/Y"|default:"-" }}', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully joined split tags.")
