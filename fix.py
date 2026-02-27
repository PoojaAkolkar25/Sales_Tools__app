import sys
import re

with open(r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\ResourceRequestForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add SectionHeader component
if 'const SectionHeader' not in code:
    comp = """    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '4px',
                    height: '18px',
                    background: 'var(--ae-blue)',
                    borderRadius: '2px'
                }}></span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)', margin: 0 }}>
                    {title}
                </h3>
            </div>
            {extra}
        </div>
    );

    return ("""
    code = code.replace('    return (', comp, 1)

code = code.replace(
'''            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">''',
'''            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div>'''
)

code = code.replace(
'''                </div>

                {/* Right Column */}
                <div className="space-y-6">''',
'''                </div>
                <div>'''
)

code = code.replace(
'''                </div>
            </div>

            {/* 7. Issuance Details (Server Issuing Authority) */}''',
'''                </div>
            {/* 7. Issuance Details (Server Issuing Authority) */}'''
)

code = code.replace(
'''            {/* Footer Actions (Standardized with Cost Sheet) */}''',
'''            </div>
            {/* Footer Actions (Standardized with Cost Sheet) */}'''
)

# Replace opening `<section className="...">`
code = re.sub(
    r'<section className="section-panel" style={{ padding: \'24px\' }}>\s*<h3.*?>\s*<span.*?></span>\s*(.*?)\s*</h3>\s*<div className="(.*?)">',
    lambda m: f"                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>\n                        <SectionHeader title=\"{m.group(1)}\" />\n                        <div className=\"ae-grid-5\" style={{ marginBottom: '16px' }}>",
    code
)

# And one special replacement for Section 7 which has `borderLeft: '4px solid var(--ae-blue)'` in style
code = re.sub(
    r'<section className="section-panel" style={{ padding: \'24px\', borderLeft: \'4px solid var\(--ae-blue\)\' }}>\s*<h3.*?>\s*<Server.*?/>\s*(.*?)\s*</h3>\s*<div className="(.*?)">',
    lambda m: f"                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>\n                        <SectionHeader title=\"{m.group(1)}\" />\n                        <div className=\"ae-grid-5\" style={{ marginBottom: '16px' }}>",
    code
)

# Then replace the closing `</section>` with `</div></div>`
code = code.replace('</section>', '</div></div>')

# Fix nested grid col 2 gap 4 to contents (for section 6 and 5 inner grids)
code = code.replace('<div className="grid grid-cols-2 gap-4">', '<div style={{ display: \'contents\' }}>')

# Spans
for field in ['Purpose of Request', 'Business Justification', 'Allocation Status', 'Database Required']:
    code = re.sub(
        r'<div style={{ display: \'flex\', flexDirection: \'column\' }}>\n(\s*<label.*?>' + field + ')',
        r'<div style={{ display: \'flex\', flexDirection: \'column\', gridColumn: \'span 2\' }}>\n\1',
        code
    )

# Label Colors: change font-weight to 600, color to var(--text-secondary)
code = re.sub(r'fontWeight: 700, color: \'black\'', r'fontWeight: 600, color: \'var(--text-secondary)\'', code)

# Remove the first top border
code = code.replace("                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>\n                        <SectionHeader title=\"1. Request Information\" />", "                    <div>\n                        <SectionHeader title=\"1. Request Information\" />", 1)

with open(r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\ResourceRequestForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Replacement complete")
