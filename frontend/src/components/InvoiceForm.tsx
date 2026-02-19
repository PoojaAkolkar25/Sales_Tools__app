import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Save, Trash2, FileText } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface LineItem {
    type: string;
    description: string;
    hsn_sac: string;
    quantity: number;
    rate: number;
    discount: number;
    gst_rate: number;
}

const InvoiceForm: React.FC<{ onBack: () => void, invoiceId?: number | null }> = ({ onBack, invoiceId }) => {
    const location = useLocation();
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<any[]>([]);
    const [costSheets, setCostSheets] = useState<any[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [status, setStatus] = useState('DRAFT');

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
        lut_declaration: 'Supply meant for export under Letter of Undertaking (LUT) without payment of Integrated Tax as per Section 16(3) of the IGST Act, 2017 and Rule 96A of the CGST Rules, 2017.',
        irn: '',
        ack_no: '',
        ack_date: '',
        payment_terms_days: 30
    });

    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [sealFile, setSealFile] = useState<File | null>(null);

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { type: 'Service', description: '', hsn_sac: '', quantity: 0, rate: 0, discount: 0, gst_rate: 18 }
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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const mid = params.get('milestone_id');
        if (mid && leads.length > 0 && !invoiceId) {
            handleMilestonePopulate(mid);
        }
    }, [location.search, leads]);

    const handleSubmitForApproval = async () => {
        if (!invoiceId) {
            showNotification('Please save the invoice as draft first', 'warning');
            return;
        }

        try {
            setLoading(true);
            await api.post(`/finance/invoices/${invoiceId}/submit_for_approval/`);
            showNotification('Invoice submitted for approval', 'success');
            fetchInvoiceDetails();
        } catch (error) {
            console.error('Error submitting for approval', error);
            showNotification('Error submitting for approval', 'error');
        } finally {
            setLoading(false);
        }
    };

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

    const handleMilestonePopulate = async (mid: string) => {
        try {
            setLoading(true);
            const response = await api.get(`/milestones/${mid}/`);
            const ms = response.data;

            if (ms.sales_order_details) {
                const matchingLead = leads.find(l => l.customer_name === ms.sales_order_details.customer_name);

                setFormData(prev => ({
                    ...prev,
                    lead: matchingLead ? matchingLead.id : prev.lead,
                    cost_sheet: ms.sales_order_details.cost_sheet || prev.cost_sheet,
                    billing_address: ms.sales_order_details.billing_address || prev.billing_address,
                    shipping_address: ms.sales_order_details.shipping_address || prev.shipping_address,
                    currency: ms.sales_order_details.currency || prev.currency,
                }));

                setLineItems([{
                    type: 'Service',
                    description: `${ms.milestone_no}: ${ms.description}`,
                    hsn_sac: '998311',
                    quantity: parseFloat(ms.qty) || 1,
                    rate: parseFloat(ms.rate) || 0,
                    discount: 0,
                    gst_rate: 18
                }]);
            }
        } catch (error) {
            console.error('Error populating from milestone', error);
            showNotification('Error loading milestone details', 'error');
        } finally {
            setLoading(false);
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
                lut_declaration: inv.lut_declaration || '',
                irn: inv.irn || '',
                ack_no: inv.ack_no || '',
                ack_date: inv.ack_date || '',
                payment_terms_days: inv.payment_terms_days || 30
            });

            setStatus(inv.status);
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

    const handleLeadChange = (leadId: string) => {
        const lead = leads.find(l => l.id === parseInt(leadId));
        if (lead) {
            setFormData(prev => ({
                ...prev,
                lead: leadId,
                currency: lead.currency || 'INR',
                customer_gstin: lead.gstin || prev.customer_gstin,
                cost_sheet: lead.cost_sheet_id?.toString() || ''
            }));

            // Auto-populate line items if cost sheet is found
            const csId = lead.cost_sheet_id;
            if (csId) {
                const cs = costSheets.find(c => c.id === csId);
                // If not in costSheets (maybe not approved yet?), we still have the ID from lead
                if (cs && cs.total_estimated_price) {
                    setLineItems([{
                        type: 'Product',
                        description: `Linked to Cost Sheet: ${cs.cost_sheet_no}`,
                        hsn_sac: '998311',
                        quantity: 1,
                        rate: parseFloat(cs.total_estimated_price) || 0,
                        discount: 0,
                        gst_rate: 18
                    }]);
                }
            }
        } else {
            setFormData(prev => ({
                ...prev,
                lead: '',
                cost_sheet: '',
                currency: 'INR',
                customer_gstin: ''
            }));
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
                        type: 'Service',
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
        setLineItems([...lineItems, { type: 'Service', description: '', hsn_sac: '', quantity: 0, rate: 0, discount: 0, gst_rate: 18 }]);
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

            let newInvoiceId = invoiceId;
            if (invoiceId) {
                await api.put(`/finance/invoices/${invoiceId}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Invoice updated successfully', 'success');
            } else {
                const response = await api.post('/finance/invoices/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                newInvoiceId = response.data.id;
                showNotification('Invoice created successfully', 'success');

                const params = new URLSearchParams(location.search);
                const mid = params.get('milestone_id');
                if (mid && newInvoiceId) {
                    try {
                        await api.patch(`/milestones/${mid}/`, {
                            invoice: newInvoiceId,
                            status: 'INVOICED'
                        });
                    } catch (err) {
                        console.error('Error linking milestone to invoice', err);
                    }
                }
            }
            onBack();
        } catch (error) {
            console.error('Error saving invoice', error);
            showNotification('Error saving invoice', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async () => {
        if (!invoiceId) {
            showNotification('Please save the invoice first to preview', 'info');
            return;
        }
        try {
            setLoading(true);
            const response = await api.get(`/finance/invoices/${invoiceId}/download_pdf/`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${formData.invoice_no}_Preview.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error previewing PDF', error);
            showNotification('Error generating preview', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="var(--theme-primary)" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {invoiceId ? 'Edit Invoice' : 'Create Detailed Invoice'}
                        </h2>
                        {invoiceId && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {status === 'DRAFT' && (
                                    <button
                                        type="button"
                                        onClick={handleSubmitForApproval}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            background: 'var(--theme-primary)',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Submit for Approval
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '4px 12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--theme-primary)',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        border: '1px solid var(--theme-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Preview PDF
                                </button>
                                <div style={{
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: status === 'APPROVED' ? 'rgba(72, 187, 120, 0.1)' :
                                        status === 'DRAFT' ? 'rgba(187, 77, 0, 0.1)' : 'rgba(66, 153, 225, 0.1)',
                                    color: status === 'APPROVED' ? '#48BB78' :
                                        status === 'DRAFT' ? 'var(--theme-primary)' : '#4299E1',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {status.replace('_', ' ')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Reference Cost Sheet</label>
                    <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                        {(() => {
                            const cs = costSheets.find(c => c.id === parseInt(formData.cost_sheet.toString()));
                            if (cs) return cs.cost_sheet_no;
                            const selectedLead = leads.find(l => l.id.toString() === formData.lead.toString());
                            if (selectedLead && selectedLead.cost_sheet_no) return selectedLead.cost_sheet_no;
                            return 'None Linked';
                        })()}
                    </div>
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
                    <select className="ae-input" required disabled={isReadOnly} value={formData.lead} onChange={e => handleLeadChange(e.target.value)}>
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
                    <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                        {formData.customer_gstin || 'Not Provided'}
                    </div>
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Payment Terms (Days)</label>
                    <input type="number" className="ae-input" disabled={isReadOnly} value={formData.payment_terms_days} onChange={e => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })} />
                </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '16px', textTransform: 'uppercase' }}>e-Invoice Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>IRN</label>
                        <input className="ae-input" placeholder="e-Invoice IRN" disabled={isReadOnly} value={formData.irn} onChange={e => setFormData({ ...formData, irn: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Ack No.</label>
                        <input className="ae-input" placeholder="Acknowledgement No." disabled={isReadOnly} value={formData.ack_no} onChange={e => setFormData({ ...formData, ack_no: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Ack Date</label>
                        <input type="date" className="ae-input" disabled={isReadOnly} value={formData.ack_date} onChange={e => setFormData({ ...formData, ack_date: e.target.value })} />
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ae-orange)', borderLeft: '3px solid var(--ae-orange)', paddingLeft: '12px', marginBottom: '16px' }}>Invoice Items</h3>
                <div className="ae-table-container" style={{ borderRadius: '12px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                    <table className="ae-table">
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ width: '60px', textAlign: 'center' }}>Sr.No.</th>
                                <th style={{ width: '150px' }}>Type *</th>
                                <th style={{ width: '30%' }}>Description</th>
                                <th>Currency</th>
                                <th style={{ textAlign: 'center' }}>Qty</th>
                                <th style={{ textAlign: 'center' }}>Rate</th>
                                <th style={{ textAlign: 'center' }}>GST %</th>
                                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Amount</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {!isReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={addLineItem}
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        background: '#e0f2fe',
                                                        color: '#0ea5e9',
                                                        border: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: 800
                                                    }}
                                                >
                                                    +
                                                </button>
                                            )}
                                            <span style={{ color: '#64748b', fontWeight: 600 }}>{index + 1}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <select
                                            className="ae-input"
                                            disabled={isReadOnly}
                                            style={{ border: '1px solid #e2e8f0', background: 'white', height: '36px', borderRadius: '8px' }}
                                            value={item.type}
                                            onChange={e => updateLineItem(index, 'type', e.target.value)}
                                        >
                                            <option value="Service">Service</option>
                                            <option value="Product">Product</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            className="ae-input"
                                            disabled={isReadOnly}
                                            placeholder="Description"
                                            style={{ border: '1px solid #f1f5f9', background: 'transparent' }}
                                            value={item.description}
                                            onChange={e => updateLineItem(index, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                        <span style={{ fontWeight: 700, color: '#475569' }}>{formData.currency}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            disabled={isReadOnly}
                                            className="ae-input"
                                            style={{ border: '1px solid #f1f5f9', background: 'transparent', width: '60px', textAlign: 'center' }}
                                            value={item.quantity === 0 ? '' : item.quantity}
                                            placeholder="0"
                                            onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <span style={{ color: '#64748b' }}>{formData.currency === 'INR' ? '₹' : '$'}</span>
                                            <input
                                                type="number"
                                                disabled={isReadOnly}
                                                className="ae-input"
                                                style={{ border: '1px solid #f1f5f9', background: 'transparent', width: '80px' }}
                                                value={item.rate === 0 ? '' : item.rate}
                                                placeholder="0"
                                                onChange={e => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <select
                                            className="ae-input"
                                            disabled={isReadOnly}
                                            style={{ border: '1px solid #f1f5f9', background: 'transparent', width: '70px', textAlign: 'center' }}
                                            value={item.gst_rate}
                                            onChange={e => updateLineItem(index, 'gst_rate', parseInt(e.target.value))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Tab' && index === lineItems.length - 1 && !e.shiftKey) {
                                                    addLineItem();
                                                }
                                            }}
                                        >
                                            <option value="0">0%</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', paddingRight: '24px' }}>
                                        {formData.currency === 'INR' ? '₹' : '$'}
                                        {(() => {
                                            const qty = Number(item.quantity) || 0;
                                            const rate = Number(item.rate) || 0;
                                            const discount = Number(item.discount) || 0;
                                            const gst = formData.is_gst_applicable ? (Number(item.gst_rate) || 0) : 0;
                                            const val = (qty * rate - discount) * (1 + gst / 100);
                                            return isNaN(val) ? '0.00' : val.toLocaleString(undefined, { minimumFractionDigits: 2 });
                                        })()}
                                    </td>
                                    <td>
                                        {!isReadOnly && (
                                            <button type="button" onClick={() => removeLineItem(index)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ background: '#f8fafc', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Total Invoice Value:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--ae-orange)' }}>
                            {formData.currency === 'INR' ? '₹' : '$'}{totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', marginTop: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Billing Address</label>
                        <textarea
                            className="ae-input"
                            rows={3}
                            disabled={isReadOnly}
                            value={formData.billing_address}
                            onChange={e => setFormData({ ...formData, billing_address: e.target.value })}
                            placeholder="Billing Address"
                        />
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
                                <textarea
                                    className="ae-input"
                                    rows={3}
                                    disabled={isReadOnly}
                                    value={formData.lut_declaration}
                                    onChange={e => setFormData({ ...formData, lut_declaration: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>GST Declaration (India)</label>
                                <textarea
                                    className="ae-input"
                                    rows={3}
                                    disabled={isReadOnly}
                                    style={{ resize: 'none', lineHeight: '1.5' }}
                                    value={formData.gst_declaration}
                                    onChange={e => setFormData({ ...formData, gst_declaration: e.target.value })}
                                />
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

                {/* Footer Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border-primary)'
                }}>
                    {!isReadOnly && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 28px',
                                borderRadius: '12px',
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                background: 'var(--theme-primary)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(187, 77, 0, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                setHoveredBtn('save');
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(187, 77, 0, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                setHoveredBtn(null);
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(187, 77, 0, 0.2)';
                            }}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Invoice'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 24px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            background: hoveredBtn === 'cancel' ? '#f1f5f9' : 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={() => setHoveredBtn('cancel')}
                        onMouseLeave={() => setHoveredBtn(null)}
                    >
                        Cancel
                    </button>
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
                        animation: 'modalSlideIn 0.3s ease-out'
                    }}>
                        <div style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                background: '#FEE2E2',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Trash2 size={24} color="#EF4444" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1f36', marginBottom: '8px' }}>Discard Changes?</h3>
                            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Are you sure you want to leave? Any unsaved changes will be lost forever.</p>

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
        </div >
    );
};

export default InvoiceForm;
