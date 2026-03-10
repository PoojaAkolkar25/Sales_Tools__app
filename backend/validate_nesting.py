import re

def validate_nesting(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    for line_num, line in enumerate(lines, 1):
        # Find all tags in the line
        tags = re.findall(r'{%\s*(if|elif|else|endif|for|endfor|with|endwith)\b', line)
        for tag in tags:
            if tag == 'if' or tag == 'for' or tag == 'with':
                stack.append((tag, line_num))
            elif tag == 'endif':
                if not stack or stack[-1][0] != 'if':
                    print(f"Error: endif on line {line_num} without matching if. Current stack: {stack}")
                    return
                stack.pop()
            elif tag == 'endfor':
                if not stack or stack[-1][0] != 'for':
                    print(f"Error: endfor on line {line_num} without matching for. Current stack: {stack}")
                    return
                stack.pop()
            elif tag == 'endwith':
                if not stack or stack[-1][0] != 'with':
                    print(f"Error: endwith on line {line_num} without matching with. Current stack: {stack}")
                    return
                stack.pop()
            elif tag in ('elif', 'else'):
                if not stack or stack[-1][0] != 'if':
                    print(f"Error: {tag} on line {line_num} outside of if block. Current stack: {stack}")
                    return
    
    if stack:
        print(f"Error: Unclosed tags remaining: {stack}")
    else:
        print("Nesting is correct.")

validate_nesting('d:/SalesEdge/Sales_Tools__app/backend/finance/templates/finance/invoice_pdf.html')
