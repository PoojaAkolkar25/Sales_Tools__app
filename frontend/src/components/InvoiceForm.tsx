import React, { useState, useEffect } from 'react';
import { Save, Trash2, CheckCircle, Eye, X, Plus } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import SearchableDropdown from './SearchableDropdown';

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
    const { showNotification, showConfirm } = useNotification();
    const [leads, setLeads] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [status, setStatus] = useState('DRAFT');
    const [activeAction, setActiveAction] = useState<'preview' | 'save' | 'submit' | 'cancel'>('submit');
    const [isConfirmingExit, setIsConfirmingExit] = useState(false);

    const [formData, setFormData] = useState({
        invoice_no: '',
        lead: '',
        milestone: '',
        sales_order: '',
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
        po_number: '',
        po_date: '',
        payment_terms_days: 30,
        memo: ''
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



    useEffect(() => {
        fetchInitialData();
        if (invoiceId) {
            fetchInvoiceDetails();
        }
    }, [invoiceId]);

    useEffect(() => {
        calculateTotals();
    }, [lineItems, formData.invoice_type, formData.customer_state, formData.is_gst_applicable]);


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
            const [leadsRes, statesRes, soRes] = await Promise.all([
                api.get('/leads/'),
                api.get('/finance/state-masters/'),
                api.get('/sales-orders/?status=APPROVED')
            ]);
            setLeads(leadsRes.data);
            setStates(statesRes.data);
            setSalesOrders(soRes.data);
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
                milestone: inv.milestone || '',
                sales_order: inv.sales_order || '',
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
                payment_terms_days: inv.payment_terms_days || 30,
                po_number: inv.po_number || '',
                po_date: inv.po_date || '',
                memo: inv.memo || ''
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
            if (inv.sales_order) {
                try {
                    const msRes = await api.get(`/milestones/?sales_order=${inv.sales_order}`);
                    setMilestones(msRes.data);
                } catch (error) {
                    console.error('Error fetching milestones for invoice', error);
                }
            }
        } catch (error) {
            console.error('Error fetching invoice details', error);
            showNotification('Error loading invoice details', 'error');
        } finally {
            setLoading(false);
        }
    };




    const handleSalesOrderChange = async (soId: string) => {
        const so = salesOrders.find(s => s.id === parseInt(soId));
        if (so) {
            setFormData(prev => ({
                ...prev,
                sales_order: soId,
                lead: so.customer ? (leads.find(l => l.customer_name === so.customer_name)?.id || prev.lead) : prev.lead,
                currency: so.currency || prev.currency,
                billing_address: so.billing_address || prev.billing_address,
                shipping_address: so.shipping_address || prev.shipping_address,
                po_number: so.po_number || prev.po_number,
                po_date: so.po_date || prev.po_date,
            }));

            // Fetch milestones for this sales order
            try {
                const response = await api.get(`/milestones/?sales_order=${soId}`);
                setMilestones(response.data);
            } catch (error) {
                console.error('Error fetching milestones', error);
                setMilestones([]);
            }

            if (so.items && so.items.length > 0) {
                setLineItems(so.items.map((item: any) => ({
                    type: item.item_type === 'SERVICES' ? 'Service' : 'Product',
                    description: item.product_name + (item.description ? ` - ${item.description}` : ''),
                    hsn_sac: '',
                    quantity: parseFloat(item.qty),
                    rate: parseFloat(item.rate),
                    discount: parseFloat(item.discount) || 0,
                    gst_rate: 18
                })));
            }
        } else {
            setFormData(prev => ({ ...prev, sales_order: soId }));
        }
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        lineItems.forEach(item => {
            const qty = parseFloat(item.quantity.toString()) || 0;
            const rate = parseFloat(item.rate.toString()) || 0;
            const discount = parseFloat(item.discount.toString()) || 0;
            const gst_rate = parseFloat(item.gst_rate.toString()) || 0;

            const lineSubtotal = qty * rate;
            const taxable = lineSubtotal - discount;
            let tax = 0;

            if (formData.is_gst_applicable) {
                tax = taxable * (gst_rate / 100);
            }

            subtotal += lineSubtotal;
            totalDiscount += discount;
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
        } catch (error: any) {
            console.error('Error saving invoice', error);
            let errorMsg = 'Error saving invoice';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
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

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '18px', background: '#0066CC', borderRadius: '2px' }}></span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)' }}>{title}</h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div className="space-y-6" style={{ padding: '4px' }}>


            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div>
                    <SectionHeader title="Invoice Details" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Milestone Reference</label>
                            <select className="ae-input" disabled={isReadOnly} value={formData.milestone} onChange={e => setFormData({ ...formData, milestone: e.target.value })}>
                                <option value="">Select Milestone (Optional)</option>
                                {milestones.map(m => (
                                    <option key={m.id} value={m.id}>{m.milestone_no} - {m.description}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Sales Order Reference</label>
                            <select className="ae-input" disabled={isReadOnly} value={formData.sales_order} onChange={e => handleSalesOrderChange(e.target.value)}>
                                <option value="">Select Sales Order (Optional)</option>
                                {salesOrders.map(so => (
                                    <option key={so.id} value={so.id}>{so.so_number}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer</label>
                            <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center' }}>
                                {leads.find(l => l.id.toString() === formData.lead.toString())?.customer_name || 'No Customer Selected'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Invoice Date</label>
                            <input type="text" className="ae-input" disabled value={formatToAppDate(formData.invoice_date)} style={{ background: '#f8fafc' }} />
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
                            <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Due Date</label>
                            <input type="text" className="ae-input" disabled value={formatToAppDate(formData.due_date)} style={{ background: '#f8fafc' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>PO Number</label>
                            <input type="text" className="ae-input" disabled={isReadOnly} value={formData.po_number} onChange={e => setFormData({ ...formData, po_number: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>PO Date</label>
                            <input type="text" className="ae-input" disabled value={formatToAppDate(formData.po_date)} style={{ background: '#f8fafc' }} />
                        </div>
                    </div>
                </div>


                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                    <SectionHeader title="Invoice Items" />
                    <div className="ae-table-container" style={{
                        marginTop: '24px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        overflow: 'visible',
                        background: 'white',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        <table className="ae-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ background: '#F8FAFC' }}>
                                <tr>
                                    <th style={{ width: '50px', padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', borderBottom: '1px solid #E2E8F0', borderTopLeftRadius: '12px' }}>Sr.No.</th>
                                    <th style={{ width: '120px', padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', borderBottom: '1px solid #E2E8F0' }}>Type *</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', borderBottom: '1px solid #E2E8F0' }}>Item & Description</th>
                                    <th style={{ width: '80px', padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', borderBottom: '1px solid #E2E8F0' }}>Qty</th>
                                    <th style={{ width: '130px', padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', borderBottom: '1px solid #E2E8F0' }}>Rate</th>
                                    <th style={{ width: '100px', padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', borderBottom: '1px solid #E2E8F0' }}>GST %</th>
                                    <th style={{ width: '140px', padding: '12px 8px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', borderBottom: '1px solid #E2E8F0' }}>Amount</th>
                                    <th style={{ width: '40px', padding: '12px 8px', borderBottom: '1px solid #E2E8F0', borderTopRightRadius: '12px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, index) => (
                                    <tr key={index} style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                {!isReadOnly && index === lineItems.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={addLineItem}
                                                        style={{
                                                            width: '22px',
                                                            height: '22px',
                                                            borderRadius: '4px',
                                                            background: '#F0F9FF',
                                                            color: '#0284C7',
                                                            border: '1px solid #BAE6FD',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#E0F2FE';
                                                            e.currentTarget.style.borderColor = '#7DD3FC';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#F0F9FF';
                                                            e.currentTarget.style.borderColor = '#BAE6FD';
                                                        }}
                                                        title="Add Row"
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                )}
                                                <span style={{ color: '#4A5568', fontWeight: 400, fontSize: '0.85rem' }}>{index + 1}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <SearchableDropdown
                                                options={[
                                                    { value: 'Service', label: 'Service' },
                                                    { value: 'Product', label: 'Product' },
                                                    { value: 'Other', label: 'Other' }
                                                ]}
                                                value={item.type}
                                                onChange={val => updateLineItem(index, 'type', String(val))}
                                                disabled={isReadOnly}
                                                placeholder="Select Type"
                                                className="table-dropdown"
                                            />
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <textarea
                                                className="ae-input"
                                                disabled={isReadOnly}
                                                placeholder="Item Name & Description"
                                                style={{
                                                    padding: '8px 12px',
                                                    fontSize: '0.85rem',
                                                    width: '100%',
                                                    resize: 'none',
                                                    borderRadius: '8px',
                                                    minHeight: '36px'
                                                }}
                                                rows={1}
                                                value={item.description}
                                                onChange={e => updateLineItem(index, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            <input
                                                type="number"
                                                disabled={isReadOnly}
                                                className="ae-input"
                                                style={{ width: '100%', height: '36px', textAlign: 'center', borderRadius: '8px', padding: '4px 8px' }}
                                                value={item.quantity === 0 ? '' : item.quantity}
                                                placeholder="0"
                                                onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', color: '#718096', fontSize: '0.85rem' }}>{formData.currency === 'INR' ? '₹' : '$'}</span>
                                                <input
                                                    type="number"
                                                    disabled={isReadOnly}
                                                    className="ae-input"
                                                    style={{ width: '100%', height: '36px', borderRadius: '8px', padding: '4px 8px 4px 24px' }}
                                                    value={item.rate === 0 ? '' : item.rate}
                                                    placeholder="0"
                                                    onChange={e => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            <SearchableDropdown
                                                options={[
                                                    { value: '0', label: '0%' },
                                                    { value: '5', label: '5%' },
                                                    { value: '12', label: '12%' },
                                                    { value: '18', label: '18%' },
                                                    { value: '28', label: '28%' }
                                                ]}
                                                value={item.gst_rate.toString()}
                                                onChange={val => updateLineItem(index, 'gst_rate', parseInt(String(val)))}
                                                disabled={isReadOnly}
                                                placeholder="Select GST %"
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a1f36', paddingRight: '12px', fontSize: '0.9rem' }}>
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
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            {!isReadOnly && lineItems.length > 1 && (
                                                <button type="button" onClick={() => removeLineItem(index)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: '4px', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#F8FAFC' }}>
                                    <td colSpan={6} style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#4A5568', borderBottomLeftRadius: '12px' }}>Total Invoice Value:</td>
                                    <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 800, color: '#FF6B00' }}>
                                        {formData.currency === 'INR' ? '₹' : '$'}{totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ borderBottomRightRadius: '12px' }}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* e-Invoice Details Section - Positioned after Items Table */}
                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                    <SectionHeader title="e-Invoice Details" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>IRN</label>
                            <input
                                className="ae-input"
                                disabled={isReadOnly}
                                value={formData.irn}
                                onChange={e => setFormData({ ...formData, irn: e.target.value })}
                                placeholder="Enter IRN"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Ack No.</label>
                            <input
                                className="ae-input"
                                disabled={isReadOnly}
                                value={formData.ack_no}
                                onChange={e => setFormData({ ...formData, ack_no: e.target.value })}
                                placeholder="Enter Ack No."
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Ack Date</label>
                            <input
                                type="text"
                                className="ae-input"
                                disabled
                                value={formatToAppDate(formData.ack_date)}
                                style={{ background: '#f8fafc' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                    <SectionHeader title="Compliance & Signatory" />
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
                                disabled={isReadOnly}
                                style={{ width: '100%', minHeight: '100px', resize: 'vertical', lineHeight: '1.5', background: isReadOnly ? 'var(--bg-secondary)' : 'white', fontSize: '0.85rem' }}
                                value={formData.lut_declaration}
                                onChange={e => setFormData({ ...formData, lut_declaration: e.target.value })}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>GST Declaration (India)</label>
                            <textarea
                                className="ae-input"
                                disabled={isReadOnly}
                                style={{ width: '100%', minHeight: '100px', resize: 'vertical', lineHeight: '1.5', background: isReadOnly ? 'var(--bg-secondary)' : 'white', fontSize: '0.85rem' }}
                                value={formData.gst_declaration}
                                onChange={e => setFormData({ ...formData, gst_declaration: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                    <SectionHeader title="Invoice Summary" />
                    <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>Subtotal</span>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A202C' }}>{formData.currency} {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {totals.total_tax > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>Total Tax</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{totals.total_tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {formData.invoice_type === 'USA' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>Sales Tax ({formData.sales_tax_rate}%)</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.sales_tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1A202C' }}>Grand Total</span>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--theme-primary)' }}>{formData.currency} {totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '8px' }}>Description / Memo</label>
                    <textarea
                        className="ae-input"
                        style={{ width: '100%', minHeight: '100px', background: isReadOnly ? 'var(--bg-secondary)' : 'white', fontSize: '0.85rem', resize: 'vertical' }}
                        placeholder="Add internal notes or additional descriptions here..."
                        value={formData.memo}
                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                        disabled={isReadOnly}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    onMouseLeave={() => { if (!isConfirmingExit) setActiveAction('submit'); }}
                >
                    {/* Preview */}
                    <button
                        type="button"
                        onClick={() => handlePreview()}
                        onMouseEnter={() => !isConfirmingExit && setActiveAction('preview')}
                        style={{
                            height: '38px', padding: '0 18px', fontSize: '0.875rem', fontWeight: 700,
                            borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                            background: activeAction === 'preview' ? 'var(--theme-primary)' : 'transparent',
                            color: activeAction === 'preview' ? 'white' : 'var(--text-secondary)',
                            boxShadow: activeAction === 'preview' ? '0 2px 8px rgba(255,107,0,0.2)' : 'none'
                        }}
                    >
                        <Eye size={17} /> Preview
                    </button>

                    {!isReadOnly && (
                        <>
                            {/* Save Draft */}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                onMouseEnter={() => !isConfirmingExit && setActiveAction('save')}
                                style={{
                                    height: '38px', padding: '0 18px', fontSize: '0.875rem', fontWeight: 700,
                                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                    opacity: loading ? 0.6 : 1,
                                    background: activeAction === 'save' ? 'var(--theme-primary)' : 'transparent',
                                    color: activeAction === 'save' ? 'white' : 'var(--text-secondary)',
                                    boxShadow: activeAction === 'save' ? '0 2px 8px rgba(255,107,0,0.2)' : 'none'
                                }}
                            >
                                <Save size={17} /> {loading ? 'Saving...' : 'Save Draft'}
                            </button>

                            {/* Submit for Approval - default orange */}
                            <button
                                type="button"
                                onClick={handleSubmitForApproval}
                                disabled={loading}
                                onMouseEnter={() => !isConfirmingExit && setActiveAction('submit')}
                                style={{
                                    height: '38px', padding: '0 20px', fontSize: '0.875rem', fontWeight: 700,
                                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                    opacity: loading ? 0.6 : 1,
                                    background: activeAction === 'submit' ? 'var(--theme-primary)' : 'transparent',
                                    color: activeAction === 'submit' ? 'white' : 'var(--text-secondary)',
                                    boxShadow: activeAction === 'submit' ? '0 2px 8px rgba(255,107,0,0.2)' : 'none'
                                }}
                            >
                                <CheckCircle size={17} /> {loading ? 'Submitting...' : 'Submit for Approval'}
                            </button>
                        </>
                    )}

                    {/* Cancel - locks orange state when dialog opens */}
                    {status !== 'APPROVED' && status !== 'PAID' && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsConfirmingExit(true);
                                showConfirm({
                                    title: 'Are you sure you want to exit?',
                                    onConfirm: () => onBack(),
                                    onCancel: () => {
                                        setIsConfirmingExit(false);
                                        setActiveAction('submit');
                                    }
                                });
                            }}
                            onMouseEnter={() => !isConfirmingExit && setActiveAction('cancel')}
                            style={{
                                height: '38px', padding: '0 18px', fontSize: '0.875rem', fontWeight: 700,
                                borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                background: activeAction === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                                color: activeAction === 'cancel' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeAction === 'cancel' ? '0 2px 8px rgba(255,107,0,0.2)' : 'none'
                            }}
                        >
                            <X size={15} /> Cancel
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};

export default InvoiceForm;
