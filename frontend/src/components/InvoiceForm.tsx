import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, FileText } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface LineItem {
    description: string;
    hsn_sac: string;
    quantity: number;
    rate: number;
    discount: number;
    gst_rate: number;
}

const InvoiceForm: React.FC<{ onBack: () => void, invoiceId?: number | null }> = ({ onBack, invoiceId }) => {
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<any[]>([]);
    const [costSheets, setCostSheets] = useState<any[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [formData, setFormData] = useState({
        invoice_no: '',
        lead: '',
        cost_sheet: '',
        proposal: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_gstin: '',
        customer_state: '',
        billing_address: '',
        shipping_address: '',
        currency: 'INR',
        is_gst_applicable: true,
        invoice_type: 'DOMESTIC',
        sales_tax_rate: 0,
        sales_tax_amount: 0,
        place_of_supply: '',
        authorized_signatory: '',
        gst_declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This invoice is issued under Rule 46 of the CGST Rules, 2017.',
        lut_declaration: 'Supply meant for export under Letter of Undertaking (LUT) without payment of Integrated Tax as per Section 16(3) of the IGST Act, 2017 and Rule 96A of the CGST Rules, 2017.'
    });

    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [sealFile, setSealFile] = useState<File | null>(null);

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: '', hsn_sac: '', quantity: 1, rate: 0, discount: 0, gst_rate: 18 }
    ]);

    const [totals, setTotals] = useState({
        subtotal: 0,
        total_discount: 0,
        taxable_amount: 0,
        total_tax: 0,
        grand_total: 0
    });

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
        if (invoiceId) {
            fetchInvoiceDetails();
        }
    }, [invoiceId]);

    useEffect(() => {
        calculateTotals();
    }, [lineItems, formData.invoice_type, formData.customer_state, formData.is_gst_applicable]);

    const fetchInitialData = async () => {
        try {
            const [leadsRes, costSheetsRes, statesRes, proposalsRes] = await Promise.all([
                api.get('/leads/'),
                api.get('/cost-sheets/?status=APPROVED'),
                api.get('/finance/state-masters/'),
                api.get('/proposals/')
            ]);
            setLeads(leadsRes.data);
            setCostSheets(costSheetsRes.data);
            setStates(statesRes.data);
            setProposals(proposalsRes.data);
        } catch (error) {
            console.error('Error fetching initial data', error);
        }
    };

    const fetchInvoiceDetails = async () => {
        if (!invoiceId) return;
        setLoading(true);
        try {
            const response = await api.get(`/finance/invoices/${invoiceId}/`);
            const inv = response.data;

            setFormData({
                invoice_no: inv.invoice_no,
                lead: inv.lead,
                cost_sheet: inv.cost_sheet || '',
                proposal: inv.proposal || '',
                invoice_date: inv.invoice_date,
                due_date: inv.due_date,
                customer_gstin: inv.customer_gstin || '',
                customer_state: inv.customer_state || '',
                billing_address: inv.billing_address || '',
                shipping_address: inv.shipping_address || '',
                currency: inv.currency,
                is_gst_applicable: inv.is_gst_applicable,
                invoice_type: inv.invoice_type,
                sales_tax_rate: inv.sales_tax_rate || 0,
                sales_tax_amount: inv.sales_tax_amount || 0,
                place_of_supply: inv.place_of_supply || '',
                authorized_signatory: inv.authorized_signatory || '',
                gst_declaration: inv.gst_declaration || '',
                lut_declaration: inv.lut_declaration || ''
            });

            setIsReadOnly(inv.status !== 'DRAFT');

            if (inv.line_items && inv.line_items.length > 0) {
                setLineItems(inv.line_items.map((item: any) => ({
                    description: item.description,
                    hsn_sac: item.hsn_sac || '',
                    quantity: item.quantity,
                    rate: item.rate,
                    discount: item.discount || 0,
                    gst_rate: item.igst_rate > 0 ? item.igst_rate : (item.cgst_rate + item.sgst_rate)
                })));
            }
        } catch (error) {
            console.error('Error fetching invoice details', error);
            showNotification('Error loading invoice details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCostSheetChange = (costSheetId: string) => {
        const cs = costSheets.find(c => c.id === parseInt(costSheetId));
        if (cs) {
            setFormData(prev => ({
                ...prev,
                cost_sheet: costSheetId,
                lead: cs.lead,
                billing_address: cs.customer_name // Fallback or logic to get address
            }));

            // Map items from cost sheet if available
            if (cs.total_estimated_price) {
                setLineItems([{
                    description: `Project: ${cs.project_name}`,
                    hsn_sac: '998311',
                    quantity: 1,
                    rate: cs.total_estimated_price,
                    discount: 0,
                    gst_rate: 18
                }]);
            }
        }
    };

    const handleProposalChange = async (proposalId: string) => {
        const p = proposals.find(prop => prop.id === parseInt(proposalId));
        if (p && p.estimate) {
            setLoading(true);
            try {
                const response = await api.get(`/estimates/${p.estimate}/`);
                const est = response.data;

                setFormData(prev => ({
                    ...prev,
                    proposal: proposalId,
                    cost_sheet: est.cost_sheet || prev.cost_sheet,
                    lead: est.deal ? (leads.find(l => l.customer_name === est.customer_name)?.id || prev.lead) : prev.lead
                }));

                if (est.items && est.items.length > 0) {
                    setLineItems(est.items.map((item: any) => ({
                        description: item.particulars + (item.description ? ` - ${item.description}` : ''),
                        hsn_sac: item.hsn_sac || '',
                        quantity: item.qty,
                        rate: item.rate,
                        discount: 0,
                        gst_rate: 18
                    })));
                }
            } catch (error) {
                console.error('Error fetching estimate details', error);
                showNotification('Error loading estimate items', 'error');
            } finally {
                setLoading(false);
            }
        } else {
            setFormData(prev => ({ ...prev, proposal: proposalId }));
        }
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        lineItems.forEach(item => {
            const lineSubtotal = item.quantity * item.rate;
            const taxable = lineSubtotal - item.discount;
            let tax = 0;

            if (formData.is_gst_applicable) {
                tax = taxable * (item.gst_rate / 100);
            }

            subtotal += lineSubtotal;
            totalDiscount += item.discount;
            totalTax += tax;
        });

        const taxableAmount = subtotal - totalDiscount;
        let sales_tax_amount = 0;
        if (formData.invoice_type === 'USA') {
            sales_tax_amount = taxableAmount * (formData.sales_tax_rate / 100);
        }

        setTotals({
            subtotal,
            total_discount: totalDiscount,
            taxable_amount: taxableAmount,
            total_tax: totalTax,
            grand_total: Math.round(taxableAmount + totalTax + sales_tax_amount)
        });
        setFormData(prev => ({ ...prev, sales_tax_amount }));
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { description: '', hsn_sac: '', quantity: 1, rate: 0, discount: 0, gst_rate: 18 }]);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter((_, i) => i !== index));
        }
    };

    const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
        const newItems = [...lineItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setLineItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                const value = (formData as any)[key];
                if (value !== null && value !== undefined) {
                    data.append(key, value);
                }
            });

            // Append line items as JSON string (or handle differently if needed)
            data.append('line_items_data', JSON.stringify(lineItems));

            if (signatureFile) data.append('signature_image', signatureFile);
            if (sealFile) data.append('company_seal', sealFile);

            if (invoiceId) {
                await api.put(`/finance/invoices/${invoiceId}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Invoice updated successfully', 'success');
            } else {
                await api.post('/finance/invoices/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Invoice created successfully', 'success');
            }
            onBack();
        } catch (error) {
            console.error('Error saving invoice', error);
            showNotification('Error saving invoice', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                    onClick={() => setShowCancelModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 24px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        background: showCancelModal || hoveredBtn === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                        color: showCancelModal || hoveredBtn === 'cancel' ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: showCancelModal || hoveredBtn === 'cancel' ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredBtn('cancel')}
                    onMouseLeave={() => setHoveredBtn(null)}
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                {!isReadOnly && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 24px',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            background: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? 'var(--theme-primary)' : 'transparent',
                            color: showCancelModal ? '#CBD5E0' : ((!hoveredBtn || hoveredBtn === 'save') ? 'white' : 'var(--text-secondary)'),
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                        }}
                        onMouseEnter={() => setHoveredBtn('save')}
                        onMouseLeave={() => setHoveredBtn(null)}
                    >
                        <Save size={18} /> {loading ? 'Saving...' : 'Save Invoice'}
                    </button>
                )}
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="var(--theme-primary)" />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {invoiceId ? 'Edit Invoice' : 'Create Detailed Invoice'}
                    </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Reference Cost Sheet</label>
                        <select className="ae-input" disabled={isReadOnly} value={formData.cost_sheet} onChange={e => handleCostSheetChange(e.target.value)}>
                            <option value="">Select Cost Sheet (Optional)</option>
                            {costSheets.map(cs => (
                                <option key={cs.id} value={cs.id}>{cs.cost_sheet_no} - {cs.project_name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Reference Proposal</label>
                        <select className="ae-input" disabled={isReadOnly} value={formData.proposal} onChange={e => handleProposalChange(e.target.value)}>
                            <option value="">Select Proposal (Optional)</option>
                            {proposals.map(p => (
                                <option key={p.id} value={p.id}>{p.filename} v{p.version}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer</label>
                        <select className="ae-input" required disabled={isReadOnly} value={formData.lead} onChange={e => setFormData({ ...formData, lead: e.target.value })}>
                            <option value="">Select Customer</option>
                            {leads.map(l => <option key={l.id} value={l.id}>{l.customer_name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Invoice Date</label>
                        <input type="date" className="ae-input" required disabled={isReadOnly} value={formData.invoice_date} onChange={e => setFormData({ ...formData, invoice_date: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Place of Supply (State)</label>
                        <select className="ae-input" required disabled={isReadOnly} value={formData.customer_state} onChange={e => setFormData({ ...formData, customer_state: e.target.value })}>
                            <option value="">Select State</option>
                            {states.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer GSTIN</label>
                        <input className="ae-input" placeholder="27XXXXX..." disabled={isReadOnly} value={formData.customer_gstin} onChange={e => setFormData({ ...formData, customer_gstin: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', paddingTop: '30px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <input type="checkbox" disabled={isReadOnly} checked={formData.is_gst_applicable} onChange={e => setFormData({ ...formData, is_gst_applicable: e.target.checked })} /> GST Applicable
                        </label>
                    </div>
                    {formData.invoice_type === 'USA' && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Sales Tax %</label>
                            <input type="number" className="ae-input" disabled={isReadOnly} value={formData.sales_tax_rate} onChange={e => setFormData({ ...formData, sales_tax_rate: parseFloat(e.target.value) || 0 })} />
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Line Items</h3>
                        {!isReadOnly && (
                            <button type="button" onClick={addLineItem} className="ae-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={14} /> Add Item
                            </button>
                        )}
                    </div>
                    <div className="ae-table-container">
                        <table className="ae-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Description</th>
                                    <th>HSN/SAC</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>Disc</th>
                                    <th>GST %</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input className="ae-input" disabled={isReadOnly} style={{ border: 'none', background: 'transparent' }} value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} />
                                        </td>
                                        <td>
                                            <input className="ae-input" disabled={isReadOnly} style={{ border: 'none', background: 'transparent' }} value={item.hsn_sac} onChange={e => updateLineItem(index, 'hsn_sac', e.target.value)} />
                                        </td>
                                        <td>
                                            <input type="number" disabled={isReadOnly} className="ae-input" style={{ border: 'none', background: 'transparent', width: '60px' }} value={item.quantity} onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)} />
                                        </td>
                                        <td>
                                            <input type="number" disabled={isReadOnly} className="ae-input" style={{ border: 'none', background: 'transparent', width: '100px' }} value={item.rate} onChange={e => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)} />
                                        </td>
                                        <td>
                                            <input type="number" disabled={isReadOnly} className="ae-input" style={{ border: 'none', background: 'transparent', width: '80px' }} value={item.discount} onChange={e => updateLineItem(index, 'discount', parseFloat(e.target.value) || 0)} />
                                        </td>
                                        <td>
                                            <select className="ae-input" disabled={isReadOnly} style={{ border: 'none', background: 'transparent' }} value={item.gst_rate} onChange={e => updateLineItem(index, 'gst_rate', parseInt(e.target.value))}>
                                                <option value="0">0%</option>
                                                <option value="5">5%</option>
                                                <option value="12">12%</option>
                                                <option value="18">18%</option>
                                                <option value="28">28%</option>
                                            </select>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>
                                            {((item.quantity * item.rate - item.discount) * (1 + (formData.is_gst_applicable ? item.gst_rate : 0) / 100)).toFixed(2)}
                                        </td>
                                        <td>
                                            {!isReadOnly && (
                                                <button type="button" onClick={() => removeLineItem(index)} style={{ color: '#E53E3E', border: 'none', background: 'none', cursor: 'pointer' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', marginTop: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Billing Address</label>
                            <textarea className="ae-input" rows={3} disabled={isReadOnly} value={formData.billing_address} onChange={e => setFormData({ ...formData, billing_address: e.target.value })} />
                        </div>

                        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--theme-primary)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Compliance & Signatory
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Authorized Signatory</label>
                                    <input className="ae-input" placeholder="Authorized Signatory" disabled={isReadOnly} value={formData.authorized_signatory} onChange={e => setFormData({ ...formData, authorized_signatory: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Signature & Seal</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <label style={{ flex: 1, padding: '8px', border: '1px dashed #E0E6ED', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '0.7rem' }}>
                                            {signatureFile ? 'Signature selected' : 'Upload Signature'}
                                            <input type="file" hidden accept="image/*" onChange={e => setSignatureFile(e.target.files?.[0] || null)} />
                                        </label>
                                        <label style={{ flex: 1, padding: '8px', border: '1px dashed #E0E6ED', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '0.7rem' }}>
                                            {sealFile ? 'Seal selected' : 'Upload Seal'}
                                            <input type="file" hidden accept="image/*" onChange={e => setSealFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {formData.invoice_type === 'EXPORT' ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>LUT Declaration (Export)</label>
                                    <textarea className="ae-input" rows={3} disabled={isReadOnly} value={formData.lut_declaration} onChange={e => setFormData({ ...formData, lut_declaration: e.target.value })} />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>GST Declaration (India)</label>
                                    <textarea className="ae-input" rows={3} disabled={isReadOnly} value={formData.gst_declaration} onChange={e => setFormData({ ...formData, gst_declaration: e.target.value })} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                            <span style={{ fontWeight: 600 }}>{formData.currency} {totals.subtotal.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Discount</span>
                            <span style={{ color: '#EF4444' }}>-{totals.total_discount.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Taxable Amount</span>
                            <span style={{ fontWeight: 600 }}>{totals.taxable_amount.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Tax</span>
                            <span>{totals.total_tax.toLocaleString()}</span>
                        </div>
                        {formData.invoice_type === 'USA' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-primary)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Sales Tax ({formData.sales_tax_rate}%)</span>
                                <span>{formData.sales_tax_amount.toLocaleString()}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Grand Total</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--theme-primary)' }}>{formData.currency} {totals.grand_total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Cancel Confirmation Modal */}
            {showCancelModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(1px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        animation: 'modalScale 0.2s ease-out'
                    }}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: '#FFF5F5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800, color: '#1a1f36' }}>
                                        Leave this page?
                                    </h3>
                                    <p style={{ margin: 0, color: '#4A5568', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                        If you leave, your unsaved changes will be discarded.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        background: '#3B82F6',
                                        color: 'white',
                                        border: 'none',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        height: '40px'
                                    }}
                                >
                                    Stay Here
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        onBack();
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        background: 'white',
                                        color: '#1a1f36',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        height: '40px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F7FAFC'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    Leave & Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceForm;
