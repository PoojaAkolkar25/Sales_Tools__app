with open(r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\ResourceRequestForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("style={ borderTop:", "style={{ borderTop:")
code = code.replace("marginTop: '24px' }>", "marginTop: '24px' }}>")

code = code.replace("style={ marginBottom: '16px' }", "style={{ marginBottom: '16px' }}")

# Handle section 1 top border
code = code.replace(
'''                                        <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="1. Request Information" />''',
'''                                        <div>
                        <SectionHeader title="1. Request Information" />'''
)

code = code.replace(
'''                                        <div style={ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }>
                        <SectionHeader title="1. Request Information" />''',
'''                                        <div>
                        <SectionHeader title="1. Request Information" />'''
)

code = code.replace(r"\'var(--text-secondary)\'", "'var(--text-secondary)'")

with open(r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\ResourceRequestForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fix applied")
