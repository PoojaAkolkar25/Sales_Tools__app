import re

def list_all_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    tags = re.findall(r'({%.*?%})', content)
    for tag in tags:
        print(tag)

list_all_tags('d:/SalesEdge/Sales_Tools__app/backend/finance/templates/finance/invoice_pdf.html')
