
import os

file_path = r'd:\Sales_tools_application\Sales_Tools__app\frontend\src\components\EstimateForm.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
found_zero = False
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                print(f'Brace depth hit 0 at line {i + 1}: {line.strip()}')
                found_zero = True

if depth != 0:
    print(f'Final depth is {depth} (UNBALANCED)')
else:
    print(f'Final depth is 0 (BALANCED)')
