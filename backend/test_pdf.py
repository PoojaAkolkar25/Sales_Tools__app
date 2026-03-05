import os
import io
from xhtml2pdf import pisa
import django
import logging
logging.basicConfig(level=logging.DEBUG)
from django.conf import settings

# Configure minimal django settings if not already configured
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

font_path = os.path.join(settings.BASE_DIR, 'Roboto-Regular.ttf')
font_path = font_path.replace('\\', '/')
if not font_path.startswith('/'):
    font_path = '/' + font_path

html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @font-face {{
            font-family: 'Roboto';
            src: url('{font_path}');
        }}
        body {{
            font-family: 'Roboto', sans-serif;
            font-size: 14pt;
        }}
    </style>
</head>
<body>
    <h1>Test PDF</h1>
    <p>Indian Rupee: ₹ 1000.00</p>
    <p>Euro: € 500.00</p>
    <p>Default Helvetica Rupee: <span style="font-family: Helvetica;">₹ 2000.00</span></p>
</body>
</html>
"""

result = io.BytesIO()
pdf = pisa.pisaDocument(io.StringIO(html), result)

if pdf.err:
    print("Error generating PDF")
else:
    with open("test_output.pdf", "wb") as f:
        f.write(result.getvalue())
    print("PDF generated successfully. Check for black boxes.")
