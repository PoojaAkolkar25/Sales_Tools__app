
import re
import os

file_path = 'backend/finance/templates/finance/invoice_pdf.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find the split tag
# Looking for the specific split we saw: {% endif \n %}
pattern = r"{% if company\.address_line_2 %}, {{ company\.address_line_2 }}{% endif\s*%}"
replacement = r"{% if company.address_line_2 %}, {{ company.address_line_2 }}{% endif %}"

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

if content != new_content:
    print("Found and fixed the split tag.")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
else:
    print("Pattern not found. Trying simpler approach.")
    # Fallback: maybe just Replace the specific string blindly if regex fails
    broken_str = '<div>{{ company.address_line_1 }}{% if company.address_line_2 %}, {{ company.address_line_2 }}{% endif\n                    %}</div>'
    fixed_str = '<div>{{ company.address_line_1 }}{% if company.address_line_2 %}, {{ company.address_line_2 }}{% endif %}</div>'
    
    if broken_str in content:
        print("Found exact string match. Fixing...")
        new_content = content.replace(broken_str, fixed_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    else:
        # Try matching with CRLF
        broken_str_crlf = '<div>{{ company.address_line_1 }}{% if company.address_line_2 %}, {{ company.address_line_2 }}{% endif\r\n                    %}</div>'
        if broken_str_crlf in content:
             print("Found exact string match (CRLF). Fixing...")
             new_content = content.replace(broken_str_crlf, fixed_str)
             with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
        else:
             print("Could not find the broken string to fix.")

