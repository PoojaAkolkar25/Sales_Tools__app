
import os

file_path = r'd:\SalesEdge\Sales_Tools__app\frontend\src\components\UserManagement.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Update Product section
    # Around viewMode === 'product'
    if 'viewMode === \'product\' ? products.map((prd) => (' in line:
        new_lines.append(line)
        i += 1
        while i < len(lines) and '</tr>' not in lines[i]:
            curr = lines[i]
            if "<div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{prd.category}</div>" in curr:
                new_lines.append("                                    <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{prd.category}</div>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{prd.subcategory || '—'}</div>\n")
                new_lines.append("                                    </td>\n")
                # Skip the original cat and sub divs and their tds
                # Original structure:
                # <td><div>cat</div></td>
                # <td><div>sub</div></td>
                # So we need to skip until the next <td>
                td_count = 0
                while i < len(lines) and td_count < 2:
                    if '</td>' in lines[i]:
                        td_count += 1
                    i += 1
                
                # Add the new columns
                new_lines.append("                                    <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.85rem', color: '#4A5568', fontWeight: 600 }}>{prd.uom || '—'} / {prd.currency} {prd.standard_price || 0}</div>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>Tax: {prd.tax_percentage}%</div>\n")
                new_lines.append("                                    </td>\n")
                new_lines.append("                                    <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{prd.hsn_sac_code || '—'}</div>\n")
                new_lines.append("                                    </td>\n")
                new_lines.append("                                    <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.8rem', color: '#4A5568', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={prd.description}>{prd.description || '—'}</div>\n")
                new_lines.append("                                    </td>\n")
                continue
            
            new_lines.append(curr)
            i += 1
        continue

    # Update Company section
    if 'filteredCompanies.map((comp) => (' in line:
        new_lines.append(line)
        i += 1
        while i < len(lines) and '</tr>' not in lines[i]:
            curr = lines[i]
            if '<Mail size={14} className="text-gray-400" /> {comp.email || \'—\'}' in curr:
                new_lines.append("                                        <div className=\"flex items-center gap-2\" style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>\n")
                new_lines.append("                                            <Mail size={14} className=\"text-gray-400\" /> {comp.email || '—'}\n")
                new_lines.append("                                        </div>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>P: {comp.phone_number || '—'} / M: {comp.mobile_number || '—'}</div>\n")
                i += 1
                continue
            
            if "<div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{comp.city || '—'}</div>" in curr:
                new_lines.append("                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{comp.city || '—'}</div>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{comp.state || '—'}, {comp.country}</div>\n")
                new_lines.append("                                    </td>\n")
                # Skip original city/state td
                while i < len(lines) and '</td>' not in lines[i]:
                    i += 1
                i += 1
                
                # Add Industry/Type
                new_lines.append("                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{comp.industry || '—'}</div>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{comp.type}</div>\n")
                new_lines.append("                                    </td>\n")
                
                # Add Tax
                new_lines.append("                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.85rem', color: '#4A5568' }}>GST: {comp.gstin || '—'} | PAN: {comp.pan || '—'}</div>\n")
                new_lines.append("                                        {comp.msme_registered && <div style={{ fontSize: '0.75rem', color: '#00C853' }}>MSME: {comp.msme_number}</div>}\n")
                new_lines.append("                                    </td>\n")
                
                # Add Terms
                new_lines.append("                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.85rem', color: '#4A5568' }}>Limit: {comp.credit_limit || 0}</div>\n")
                new_lines.append("                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>{comp.payment_terms}</div>\n")
                new_lines.append("                                    </td>\n")
                continue
            
            # Skip the old Active status pill since we are rebuilding it properly later or it might mismatch
            if '<span style={{ display: \'inline-flex\', alignItems: \'center\', gap: \'6px\', padding: \'4px 10px\', borderRadius: \'6px\', fontSize: \'0.7rem\', fontWeight: 800, textTransform: \'uppercase\', background: \'rgba(0, 200, 83, 0.1)\', color: \'#00C853\' }}>' in curr:
                 while i < len(lines) and '</td>' not in lines[i]:
                     i += 1
                 i += 1
                 continue

            new_lines.append(curr)
            i += 1
        continue

    new_lines.append(line)
    i += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
