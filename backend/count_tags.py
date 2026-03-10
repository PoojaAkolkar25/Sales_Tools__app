import re

def count_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    ifs = re.findall(r'{%\s*if\s+', content)
    elifs = re.findall(r'{%\s*elif\s+', content)
    elses = re.findall(r'{%\s*else\s*%}', content)
    endifs = re.findall(r'{%\s*endif\s*%}', content)
    
    print(f"IFs: {len(ifs)}")
    print(f"ELIFs: {len(elifs)}")
    print(f"ELSEs: {len(elses)}")
    print(f"ENDIFs: {len(endifs)}")
    
    total_opens = len(ifs)
    total_closes = len(endifs)
    
    if total_opens != total_closes:
        print(f"ERROR: Mismatch! {total_opens} openings vs {total_closes} closures.")
    else:
        print("Template tags count BALANCED.")

count_tags('d:/SalesEdge/Sales_Tools__app/backend/finance/templates/finance/invoice_pdf.html')
