
import os

file_path = r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\UserManagement.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_indices = set()

# Pass 1: Identify skip lines (doubles)
for i in range(len(lines)):
    if i in skip_indices: continue
    line = lines[i]
    if i + 1 < len(lines):
        next_line = lines[i+1]
        # Doubled <td> issue in product/company sections
        if "<td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>" in line and \
           "<td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>" in next_line:
             skip_indices.add(i)
        elif "<td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>" in line and \
             "<td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>" in next_line:
             skip_indices.add(i)
        elif '<div className="flex items-center gap-2" style={{ fontSize: \'0.9rem\', color: \'#4A5568\', fontWeight: 500 }}>' in line and \
             '<div className="flex items-center gap-2" style={{ fontSize: \'0.9rem\', color: \'#4A5568\', fontWeight: 500 }}>' in next_line:
             skip_indices.add(i)

# Pass 2: Rebuild with cleanup
for i in range(len(lines)):
    if i in skip_indices: continue
    line = lines[i]
    
    # Fix the double closing div mess in company contact section (lines 3022-3024)
    # L3022 closes inner, L3024 closes outer.
    # Actually, L3019/3020 were doubled.
    
    # Fix closing </div> which might be missing a matching <td> check
    # In some places I see:
    # </div>
    # </div>
    # </td>
    
    new_lines.append(line)

# Final check for certain specific patterns that are definitely broken in common ways
# Like orphaned </div> before a </td>
# I'll just rewrite the problematic chunks once more in a cleaner script.

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
