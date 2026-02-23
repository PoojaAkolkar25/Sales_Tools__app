path = r'D:\Sales_tools_application\Sales_Tools__app\backend\core\templates\estimates\estimate_pdf.html'
with open(path, 'rb') as f:
    content = f.read()

import re

def flatten_all_django_tags(data):
    # Flatten {% ... %}
    data = re.sub(rb'\{%[\s\S]*?%\}', lambda m: m.group(0).replace(rb'\r\n', b' ').replace(rb'\n', b' '), data)
    # Flatten {{ ... }}
    data = re.sub(rb'\{\{[\s\S]*?\}\}', lambda m: m.group(0).replace(rb'\r\n', b' ').replace(rb'\n', b' '), data)
    # Normalize multiple spaces inside tags (optional but cleaner)
    data = re.sub(rb'\{% +', b'{% ', data)
    data = re.sub(rb' +%\}', b' %}', data)
    data = re.sub(rb'\{\{ +', b'{{ ', data)
    data = re.sub(rb' +\}\}', b' }}', data)
    return data

new_content = flatten_all_django_tags(content)

if new_content != content:
    with open(path, 'wb') as f:
        f.write(new_content)
    print('Patched: Flattened all multi-line tags in estimate_pdf.html')
else:
    print('No split tags found.')
