import re

path = r'D:\Sales_tools_application\Sales_Tools__app\backend\core\templates\estimates\estimate_pdf.html'
with open(path, 'rb') as f:
    content = f.read()

# Pattern 1: Any tag split across lines
# Matches {% or {{ followed by anything (including newlines) until }} or %}
# But specifically looking for cases where there is a \r\n inside it
def flatten_tags(text):
    # Regex to find multi-line tags
    # {% ... %}
    text = re.sub(rb'\{%[^%]*?\r\n\s*[^%]*?%\}', lambda m: m.group(0).replace(rb'\r\n', b' ').replace(rb'  ', b' '), text, flags=re.DOTALL)
    # {{ ... }}
    text = re.sub(rb'\{\{[^}]*?\r\n\s*[^}]*?\}\}', lambda m: m.group(0).replace(rb'\r\n', b' ').replace(rb'  ', b' '), text, flags=re.DOTALL)
    return text

new_content = flatten_tags(content)

# Specific fix for line 222-223 if regex misses it
bad_endif = b'{% endif\r\n                            %}'
good_endif = b'{% endif %}'
if bad_endif in new_content:
    new_content = new_content.replace(bad_endif, good_endif)

if new_content != content:
    with open(path, 'wb') as f:
        f.write(new_content)
    print('Patched estimate_pdf.html: Flattened tags.')
else:
    print('No problematic tags found or already flattened.')
