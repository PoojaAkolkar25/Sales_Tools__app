
import os

file_path = r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\MilestoneDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix the broken section
# Lines 937-938 (0-indexed 936-937)
if 'title="Download Milestone PDF"' in lines[936] and '</button>' in lines[937]:
    # Restore the opening part and icon
    lines[936] = lines[936].rstrip() + ">\n"
    lines.insert(937, '                                                        <Download size={18} />\n')
    # Fixing indentation for the closing tags to be safe
    # Lines shifted down by 1
    # 938: </button>, 939: </div>, 940: </td>
    lines[938] = '                                                    </button>\n'
    lines[939] = '                                                </div>\n'
    lines[940] = '                                            </td>\n'

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Repair complete.")
