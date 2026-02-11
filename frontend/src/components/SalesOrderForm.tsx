import React, { useState, useEffect } from 'react';
import {
    Save,
    ChevronLeft,
    Clock,
    ShoppingBag,
    Truck,
    Link as LinkIcon,
    Plus,
    X,
    CheckCircle2,
    FileText
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface SalesOrderFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
}

const SalesOrderForm: React.FC<SalesOrderFormProps> = ({ id, onBack, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [salesOrder, setSalesOrder] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [availableEstimates, setAvailableEstimates] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchInitialData();
        if (id) {
            fetchSalesOrderDetails();
        }
    }, [id]);

    useEffect(() => {
        if (salesOrder?.customer) {
            fetchCustomerEstimates(salesOrder.customer);
        } else {
            setAvailableEstimates([]);
        }
    }, [salesOrder?.customer]);

    const fetchCustomerEstimates = async (customerId: number) => {
        try {
            const response = await api.get(`/estimates/?customer=${customerId}&approval_status=APPROVED`);
            setAvailableEstimates(response.data);
        } catch (error) {
            console.error('Error fetching estimates', error);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [prodRes, custRes] = await Promise.all([
                api.get('/products/'),
                api.get('/customers/')
            ]);
            setProducts(prodRes.data);
            setCustomers(custRes.data);
        } catch (error) {
            console.error('Error fetching initial data', error);
        }
    };

    const fetchSalesOrderDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/sales-orders/${id}/`);
            setSalesOrder(response.data);
        } catch (error) {
            showNotification('Error loading Sales Order details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const custId = parseInt(e.target.value);
        if (custId) {
            const cust = customers.find(c => c.id === custId);
            setSalesOrder((prev: any) => ({
                ...prev,
                customer: custId,
                customer_name: cust?.name,
                customer_detail: cust
            }));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSalesOrder((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...salesOrder.items];
        newItems[index] = { ...newItems[index], [field]: value };

        const qty = parseFloat(newItems[index].qty) || 0;
        const rate = parseFloat(newItems[index].rate) || 0;
        const initial = qty * rate;

        if (field === 'discount_percent' || field === 'qty' || field === 'rate') {
            const disc_percent = parseFloat(newItems[index].discount_percent) || 0;
            newItems[index].discount = (initial * (disc_percent / 100)).toFixed(2);
        } else if (field === 'discount') {
            const disc_amt = parseFloat(newItems[index].discount) || 0;
            newItems[index].discount_percent = initial > 0 ? ((disc_amt / initial) * 100).toFixed(2) : 0;
        }

        const taxable_amount = initial - (parseFloat(newItems[index].discount) || 0);

        if (field === 'tax_percent' || field === 'discount_percent' || field === 'qty' || field === 'rate') {
            const tax_percent = parseFloat(newItems[index].tax_percent) || 0;
            newItems[index].tax = (taxable_amount * (tax_percent / 100)).toFixed(2);
        } else if (field === 'tax') {
            const tax_amt = parseFloat(newItems[index].tax) || 0;
            newItems[index].tax_percent = taxable_amount > 0 ? ((tax_amt / taxable_amount) * 100).toFixed(2) : 0;
        }

        newItems[index].amount = (taxable_amount + (parseFloat(newItems[index].tax) || 0)).toFixed(2);

        const total = newItems.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        setSalesOrder((prev: any) => ({ ...prev, items: newItems, total_amount: total }));
    };

    const handleAddItem = () => {
        setSalesOrder((prev: any) => ({
            ...prev,
            items: [...prev.items, { product: '', description: '', qty: 1, rate: 0, tax: 0, discount: 0, amount: 0 }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = salesOrder.items.filter((_: any, i: number) => i !== index);
        const total = newItems.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        setSalesOrder((prev: any) => ({ ...prev, items: newItems, total_amount: total }));
    };

    const handleSave = async () => {
        // Basic Validation
        if (!salesOrder.po_number?.trim()) {
            showNotification('PO Number is required even for draft.', 'error');
            return;
        }

        setSaving(true);
        try {
            // Prepare payload: Clean up empty strings, remove read-only details
            const payload = {
                ...salesOrder,
                po_date: salesOrder.po_date || null,
                delivery_date: salesOrder.delivery_date || null,
                order_date: salesOrder.order_date || new Date().toISOString().split('T')[0],
                // Remove detail objects that serializer doesn't expect or are read-only
                customer_detail: undefined,
                items: salesOrder.items.map((item: any) => ({
                    ...item,
                    product: item.product || null,
                    qty: parseFloat(item.qty) || 0,
                    rate: parseFloat(item.rate) || 0,
                    tax: parseFloat(item.tax) || 0,
                    discount: parseFloat(item.discount) || 0,
                    amount: parseFloat(item.amount) || 0
                }))
            };

            await api.patch(`/sales-orders/${id}/`, payload);
            showNotification('Sales Order updated successfully', 'success');
            onSave();
        } catch (error: any) {
            console.error('Save Error:', error);
            showNotification(error.response?.data?.error || JSON.stringify(error.response?.data) || 'Failed to update Sales Order', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm('Are you sure you want to finalize and submit this Sales Order?')) return;

        setSaving(true);
        try {
            await api.post(`/sales-orders/${id}/submit/`);
            showNotification('Sales Order submitted successfully', 'success');
            onSave();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to submit Sales Order', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleViewPDF = () => {
        if (salesOrder.po_file_url) {
            const baseUrl = api.defaults.baseURL?.replace('/api', '').replace(/\/$/, '') || '';
            const fullUrl = `${baseUrl}${salesOrder.po_file_url}`;
            window.open(fullUrl, '_blank');
        } else {
            showNotification('PDF file URL not found', 'error');
        }
    };

    if (loading || !salesOrder) return <div className="p-12 text-center font-bold text-[#718096]">Loading details...</div>;

    const isSubmitted = salesOrder.status === 'SUBMITTED';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        color: '#718096',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                    }}
                >
                    <ChevronLeft size={18} /> Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: salesOrder.status === 'SUBMITTED' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                        color: salesOrder.status === 'SUBMITTED' ? '#00C853' : '#FF6B00',
                        border: `1px solid ${salesOrder.status === 'SUBMITTED' ? 'rgba(0, 200, 83, 0.2)' : 'rgba(255, 107, 0, 0.2)'}`
                    }}>
                        {salesOrder.status} ORDER
                    </span>
                    {!isSubmitted && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    background: '#F7FAFC',
                                    color: '#4A5568',
                                    border: '1px solid #E0E6ED',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {saving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />} Save Draft
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    background: '#FF6B00',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(255, 107, 0, 0.2)'
                                }}
                            >
                                <CheckCircle2 size={16} /> Submit Order
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Form Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info Panel */}
                    <section className="section-panel" style={{ padding: '16px 24px' }}>
                        <h3 style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            margin: '0 0 16px 0',
                            color: '#FF6B00',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                        }}>
                            <span style={{ width: '3px', height: '14px', background: '#0066CC', borderRadius: '2px' }}></span>
                            Basic Order Information
                        </h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Sales Order Number</label>
                                <input
                                    type="text"
                                    value={salesOrder.so_number || 'Auto-generated on Submit'}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        background: '#F7FAFC',
                                        border: '1px solid #E0E6ED',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: '#0066CC'
                                    }}
                                    disabled
                                />
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Customer Name</label>
                                {salesOrder.customer ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(0, 200, 83, 0.05)',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(0, 200, 83, 0.1)'
                                    }}>
                                        <CheckCircle2 size={16} className="text-green-600" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1a1f36' }}>{salesOrder.customer_detail?.name || salesOrder.customer_name}</span>
                                        {!isSubmitted && (
                                            <button
                                                onClick={() => setSalesOrder({ ...salesOrder, customer: null, customer_detail: null })}
                                                style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#C53030', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                Change
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <select
                                        value={salesOrder.customer || ''}
                                        onChange={handleCustomerChange}
                                        style={{
                                            width: '100%',
                                            padding: '6px 12px',
                                            background: '#FFF',
                                            border: '1px solid #E0E6ED',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: '#2D3748'
                                        }}
                                        disabled={isSubmitted}
                                    >
                                        <option value="">Select Customer...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Customer Code</label>
                                <input
                                    name="customer_code"
                                    type="text"
                                    value={salesOrder.customer_code || ''}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        border: '1px solid #E0E6ED',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: '#2D3748'
                                    }}
                                    disabled={isSubmitted}
                                    placeholder="Enter Customer Code"
                                />
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Purchase Order Number *</label>
                                <input
                                    name="po_number"
                                    type="text"
                                    value={salesOrder.po_number || ''}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        border: '1px solid #E0E6ED',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: '#2D3748'
                                    }}
                                    disabled={isSubmitted}
                                />
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Purchase Order Date</label>
                                <input
                                    name="po_date"
                                    type="date"
                                    value={salesOrder.po_date || ''}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        border: '1px solid #E0E6ED',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        color: '#4A5568'
                                    }}
                                    disabled={isSubmitted}
                                />
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>PO Valid From</label>
                                <input
                                    name="po_from_date"
                                    type="date"
                                    value={salesOrder.po_from_date || ''}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        border: '1px solid #E0E6ED',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        color: '#4A5568'
                                    }}
                                    disabled={isSubmitted}
                                />
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>PO Valid To</label>
                                <input
                                    name="po_to_date"
                                    type="date"
                                    value={salesOrder.po_to_date || ''}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        border: '1px solid #E0E6ED',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        color: '#4A5568'
                                    }}
                                    disabled={isSubmitted}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Estimate Linking Panel */}
                    {salesOrder.customer && (
                        <section className="section-panel" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{
                                padding: '12px 24px',
                                borderBottom: '1px solid #E0E6ED',
                                background: '#F8FAFC',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <LinkIcon size={16} style={{ color: '#0066CC' }} />
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0066CC', margin: 0, textTransform: 'uppercase' }}>Link Approved Estimates</h3>
                            </div>
                            <div style={{ padding: '12px' }}>
                                {availableEstimates.length === 0 ? (
                                    <p style={{ padding: '12px', fontSize: '0.75rem', color: '#718096', fontStyle: 'italic', textAlign: 'center' }}>No approved estimates found for this customer.</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ padding: '8px', borderBottom: '2px solid #E0E6ED', width: '40px' }}></th>
                                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED' }}>Date</th>
                                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED' }}>Estimate No.</th>
                                                <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.65rem', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {availableEstimates.map(est => {
                                                const isSelected = salesOrder.estimates?.includes(est.id) || false;
                                                return (
                                                    <tr key={est.id} style={{ borderBottom: '1px solid #F1F5F9', background: isSelected ? 'rgba(0, 102, 204, 0.05)' : 'transparent', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            const current = salesOrder.estimates || [];
                                                            if (!isSelected) {
                                                                setSalesOrder({ ...salesOrder, estimates: [...current, est.id] });
                                                            } else {
                                                                setSalesOrder({ ...salesOrder, estimates: current.filter((id: number) => id !== est.id) });
                                                            }
                                                        }}>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <input type="checkbox" checked={isSelected} readOnly disabled={isSubmitted} style={{ cursor: 'pointer' }} />
                                                        </td>
                                                        <td style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 500, color: '#4A5568' }}>{new Date(est.created_at).toLocaleDateString()}</td>
                                                        <td style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#0066CC' }}>{est.estimate_id}</td>
                                                        <td style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#1a1f36', textAlign: 'right' }}>${parseFloat(est.total_price).toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Line Items Panel */}
                    <section className="section-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{
                            padding: '12px 24px',
                            borderBottom: '1px solid #E0E6ED',
                            background: '#F8FAFC',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShoppingBag size={16} style={{ color: '#FF6B00' }} />
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FF6B00', margin: 0, textTransform: 'uppercase' }}>Product Line Items</h3>
                            </div>
                            {!isSubmitted && (
                                <button
                                    onClick={handleAddItem}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#0066CC',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Plus size={14} /> Add Row
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'transparent' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '25%' }}>Product</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '30%' }}>Description</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '10%' }}>Qty</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '15%' }}>Rate</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '8%' }}>Disc%</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED' }}>Total</th>
                                        {!isSubmitted && <th style={{ padding: '8px', borderBottom: '2px solid #E0E6ED', width: '40px' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesOrder.items.map((item: any, index: number) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '4px 8px' }}>
                                                <select
                                                    value={item.product || ''}
                                                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '4px 8px',
                                                        border: `1px solid ${!item.product ? '#FF6B00' : '#E0E6ED'}`,
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600
                                                    }}
                                                    disabled={isSubmitted}
                                                >
                                                    <option value="">Select Product...</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input
                                                    type="text"
                                                    value={item.description || ''}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '4px 8px',
                                                        border: '1px solid #E0E6ED',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        color: '#4A5568'
                                                    }}
                                                    placeholder="Item Description"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input
                                                    type="number"
                                                    value={item.discount_percent || 0}
                                                    onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                                                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#C53030' }}
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 800, color: '#1a1f36' }}>
                                                {salesOrder.currency} {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            {!isSubmitted && (
                                                <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                    <button onClick={() => handleRemoveItem(index)} style={{ background: 'none', border: 'none', color: '#FEB2B2', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.color = '#F56565'} onMouseOut={(e) => e.currentTarget.style.color = '#FEB2B2'}>
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#F8FAFC' }}>
                                        <td colSpan={5} style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.65rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase' }}>Total Order Value</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 900, color: '#1a1f36' }}>
                                            {salesOrder.currency} {parseFloat(salesOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        {!isSubmitted && <td></td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right Column: Meta & Logistics */}
                <div className="space-y-6">
                    <section className="section-panel" style={{ padding: '16px 24px' }}>
                        <h3 style={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            margin: '0 0 16px 0',
                            color: '#0066CC',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase'
                        }}>
                            <Truck size={16} style={{ color: '#0066CC' }} />
                            Logistics & Currency
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Currency</label>
                                <select name="currency" value={salesOrder.currency} onChange={handleInputChange} style={{ width: '100%', padding: '6px 12px', border: '1px solid #E0E6ED', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }} disabled={isSubmitted}>
                                    <option value="INR">INR - Indian Rupee</option>
                                    <option value="USD">USD - US Dollar</option>
                                </select>
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Order Date</label>
                                <input name="order_date" type="date" value={salesOrder.order_date || ''} onChange={handleInputChange} style={{ width: '100%', padding: '6px 12px', border: '1px solid #E0E6ED', borderRadius: '6px', fontSize: '0.8rem' }} disabled={isSubmitted} />
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Billing Address</label>
                                <textarea name="billing_address" value={salesOrder.billing_address || ''} onChange={handleInputChange} style={{ width: '100%', padding: '6px 12px', border: '1px solid #E0E6ED', borderRadius: '6px', fontSize: '0.75rem' }} rows={3} disabled={isSubmitted} />
                            </div>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Shipping Address</label>
                                <textarea name="shipping_address" value={salesOrder.shipping_address || ''} onChange={handleInputChange} style={{ width: '100%', padding: '6px 12px', border: '1px solid #E0E6ED', borderRadius: '6px', fontSize: '0.75rem' }} rows={3} disabled={isSubmitted} />
                            </div>
                        </div>
                    </section>

                    <section className="section-panel" style={{ padding: '0', overflow: 'hidden', textAlign: 'center' }}>
                        <div style={{ padding: '12px', background: '#F8FAFC', borderBottom: '1px solid #E0E6ED' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1a1f36', margin: 0, textTransform: 'uppercase' }}>Source Document</h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <FileText size={32} style={{ color: '#C53030', margin: '0 auto 12px auto' }} />
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1a1f36', textTransform: 'uppercase', margin: 0 }}>{salesOrder.po_file_name || 'PurchaseOrder.pdf'}</p>
                            <button
                                onClick={handleViewPDF}
                                style={{
                                    marginTop: '16px',
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #E0E6ED',
                                    background: 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    cursor: 'pointer'
                                }}
                            >
                                View PDF
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SalesOrderForm;
