
import os

file_path = r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\UserManagement.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Problem 1: Doubled <td> in financial_year section
# We look for the pattern of two consecutive <td> lines
# 2932: <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
# 2933: <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
# (Line numbers are 1-indexed, so 2931 and 2932 in 0-indexed list)

new_lines = []
skip_next = False
for i in range(len(lines)):
    if skip_next:
        skip_next = False
        continue
    
    line = lines[i]
    if i + 1 < len(lines):
        next_line = lines[i+1]
        if "<td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>" in line and \
           "<td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>" in next_line and \
           i > 2900 and i < 2950:
            print(f"Fixing doubled <td> at line {i+1}")
            # Keep only one and ensure it has proper indentation
            new_lines.append(line)
            skip_next = True
            continue
    
    new_lines.append(line)

# Problem 2: Closing tags at the end
# The end of the file should close the ternary branch, overflowX div, section-panel div, and main container div.
# Looking for the last few lines:
# 3073:                             </table>
# 3074:                         </div>
# 3075:                 )}
# 3076:                     </div>
# 3077:         </div >
# 3078:             );
# 3079: };

# I'll just rewrite the end of the file from '</tbody>' or '</table>' onwards for the relevant section.
# But let's be more precise.

# Find the last </table> and replace everything after it.
last_table_index = -1
for i in range(len(new_lines) - 1, -1, -1):
    if "</table>" in new_lines[i]:
        last_table_index = i
        break

if last_table_index != -1:
    print(f"Fixing end tags after line {last_table_index+1}")
    new_lines = new_lines[:last_table_index + 1]
    new_lines.append("                        </div>\n")
    new_lines.append("                    </div>\n")
    new_lines.append("                )}\n")
    new_lines.append("            </div>\n")
    new_lines.append("        );\n")
    new_lines.append("};\n")
    new_lines.append("\n")
    new_lines.append("export default UserManagement;\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
