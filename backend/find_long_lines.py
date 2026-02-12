
import os

file_path = r'd:\Sales_tools_application\Sales_Tools__app\frontend\src\components\EstimateForm.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if len(line) > 500:
        print(f'Line {i + 1} is too long ({len(line)} chars): {line[:100]}...')
