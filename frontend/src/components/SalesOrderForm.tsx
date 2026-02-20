import React, { useState, useEffect } from 'react';
import {
    Save,
    Plus,
    X,
    CheckCircle2,
    FileText,
    Loader2,
    Trash2,
    PlusCircle
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import SearchableDropdown from './SearchableDropdown';

interface SalesOrderFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
    onUploadPO?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isExtractingSO?: boolean;
}

const SalesOrderForm: React.FC<SalesOrderFormProps> = ({ id, onBack, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [salesOrder, setSalesOrder] = useState<any>(null);

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
    const { showNotification } = useNotification();

    useEffect(() => {

        if (id) {
            fetchSalesOrderDetails();
        }
    }, [id]);

    useEffect(() => {
        if (salesOrder?.customer_detail?.address && !salesOrder.billing_address) {
            setSalesOrder((prev: any) => ({ ...prev, billing_address: salesOrder.customer_detail.address }));
        }
        if (salesOrder?.customer_detail?.shipping_address && !salesOrder.shipping_address) {
            setSalesOrder((prev: any) => ({ ...prev, shipping_address: salesOrder.customer_detail.shipping_address }));
        }
        if (salesOrder?.customer_detail?.address && !salesOrder.shipping_address) {
            setSalesOrder((prev: any) => ({ ...prev, shipping_address: salesOrder.customer_detail.address }));
        }
    }, [salesOrder?.customer_detail]);





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
            items: [...prev.items, {
                item_type: 'LICENSE',
                product: '',
                product_name: '',
                description: '',
                start_date: '',
                end_date: '',
                qty: 1,
                rate: 0,
                tax: 0,
                discount: 0,
                amount: 0
            }]
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
                po_from_date: salesOrder.po_from_date || null,
                po_to_date: salesOrder.po_to_date || null,
                delivery_date: salesOrder.delivery_date || null,
                order_date: salesOrder.order_date || new Date().toISOString().split('T')[0],
                // Remove detail objects that serializer doesn't expect or are read-only
                customer_detail: undefined,
                items: salesOrder.items.map((item: any) => ({
                    ...item,
                    item_type: item.item_type || 'LICENSE',
                    product: item.product || null,
                    start_date: item.start_date || null,
                    end_date: item.end_date || null,
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
            let errorMsg = 'Failed to update Sales Order';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    // Extract first error message from field-specific errors
                    const firstKey = Object.keys(data)[0];
                    if (Array.isArray(data[firstKey])) errorMsg = `${firstKey}: ${data[firstKey][0]}`;
                    else if (typeof data[firstKey] === 'string') errorMsg = data[firstKey];
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        // Validation before submission
        if (!salesOrder.po_from_date) {
            showNotification('PO Valid From Date is mandatory.', 'error');
            return;
        }
        if (!salesOrder.po_to_date) {
            showNotification('PO Valid To Date is mandatory.', 'error');
            return;
        }

        if (!window.confirm('Are you sure you want to finalize and submit this Sales Order?')) return;

        setSaving(true);
        try {
            // First, save any pending changes (similar to handleSave)
            const payload = {
                ...salesOrder,
                po_date: salesOrder.po_date || null,
                po_from_date: salesOrder.po_from_date || null,
                po_to_date: salesOrder.po_to_date || null,
                delivery_date: salesOrder.delivery_date || null,
                order_date: salesOrder.order_date || new Date().toISOString().split('T')[0],
                customer_detail: undefined,
                items: salesOrder.items.map((item: any) => ({
                    ...item,
                    item_type: item.item_type || 'LICENSE',
                    product: item.product || null,
                    start_date: item.start_date || null,
                    end_date: item.end_date || null,
                    qty: parseFloat(item.qty) || 0,
                    rate: parseFloat(item.rate) || 0,
                    tax: parseFloat(item.tax) || 0,
                    discount: parseFloat(item.discount) || 0,
                    amount: parseFloat(item.amount) || 0
                }))
            };

            await api.patch(`/sales-orders/${id}/`, payload);

            // Then, trigger the submit action
            await api.post(`/sales-orders/${id}/submit/`);
            showNotification('Sales Order submitted successfully', 'success');
            onSave();
        } catch (error: any) {
            console.error('Submit Error:', error);
            let errorMsg = 'Failed to submit Sales Order';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const firstKey = Object.keys(data)[0];
                    if (Array.isArray(data[firstKey])) errorMsg = `${firstKey}: ${data[firstKey][0]}`;
                    else if (typeof data[firstKey] === 'string') errorMsg = data[firstKey];
                }
            }
            showNotification(errorMsg, 'error');
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

    const isSubmitted = ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(salesOrder.status);

    const handleApprove = async () => {
        if (!window.confirm('Are you sure you want to Approve this Sales Order?')) return;
        setSaving(true);
        try {
            await api.post(`/sales-orders/${id}/approve/`);
            showNotification('Sales Order Approved successfully', 'success');
            fetchSalesOrderDetails();
        } catch (error) {
            console.error('Approve Error', error);
            showNotification('Failed to Approve Sales Order', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('Are you sure you want to Reject this Sales Order?')) return;
        setSaving(true);
        try {
            await api.post(`/sales-orders/${id}/reject/`);
            showNotification('Sales Order Rejected', 'info');
            fetchSalesOrderDetails();
        } catch (error) {
            console.error('Reject Error', error);
            showNotification('Failed to Reject Sales Order', 'error');
        } finally {
            setSaving(false);
        }
    };

    const getCurrencySymbol = (currency: string) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EURO': return '€';
            default: return currency;
        }
    };

    const getHighlightStyle = (value: any) => {
        if (salesOrder.po_file_url && value) {
            return { border: '2px solid #48BB78', background: '#F0FFF4' };
        }
        return {};
    };

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '4px',
                    height: '18px',
                    background: 'var(--ae-blue)',
                    borderRadius: '2px'
                }}></span>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)', margin: 0 }}>
                    {title}
                </h2>
            </div>
            {extra}
            {(salesOrder.status === 'PENDING_APPROVAL' || salesOrder.status === 'SUBMITTED') && title === 'Basic Order Information' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleApprove}
                        disabled={saving}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            background: '#48BB78',
                            color: 'white',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <CheckCircle2 size={16} /> Approve
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={saving}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            background: '#F56565',
                            color: 'white',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <X size={16} /> Reject
                    </button>
                </div>
            )}
            {salesOrder.status === 'APPROVED' && title === 'Basic Order Information' && (
                <div style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    background: '#C6F6D5',
                    color: '#2F855A',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    border: '1px solid #9AE6B4'
                }}>
                    APPROVED
                </div>
            )}
        </div>
    );

    return (
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px'
            }}>
                {/* Main Form Area - Single Column Stack */}
                <div className="space-y-0">
                    {/* 1. Basic Info Section */}
                    <section>
                        <SectionHeader title="Basic Order Information" />
                        <div className="ae-grid-4">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Sales Order Number</label>
                                <input
                                    type="text"
                                    value={salesOrder.so_number || 'Auto-generated on Submit'}
                                    className="ae-input"
                                    style={{
                                        background: '#F8FAFC',
                                        fontWeight: 700,
                                        color: 'var(--ae-blue)',
                                    }}
                                    disabled
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: salesOrder.customer ? 'rgba(0, 200, 83, 0.05)' : 'rgba(255, 107, 0, 0.05)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: `1px solid ${salesOrder.customer ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)'}`,
                                    height: '34px'
                                }}>
                                    {salesOrder.customer ? (
                                        <CheckCircle2 size={16} className="text-green-600" />
                                    ) : (
                                        <X size={16} className="text-orange-600" />
                                    )}
                                    <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: salesOrder.customer_name === 'not match with company profile' ? '#C53030' : '#1a1f36',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {salesOrder.customer_detail?.name || salesOrder.customer_name || 'No Customer Extracted'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer Code</label>
                                <input
                                    name="customer_code"
                                    type="text"
                                    value={salesOrder.customer_code || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted}
                                    placeholder="Enter Customer Code"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Purchase Order Number <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                <input
                                    name="po_number"
                                    type="text"
                                    value={salesOrder.po_number || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted}
                                    style={{ ...getHighlightStyle(salesOrder.po_number) }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Purchase Order Date</label>
                                <input
                                    name="po_date"
                                    type="date"
                                    value={salesOrder.po_date || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted}
                                    style={{ ...getHighlightStyle(salesOrder.po_date) }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>PO Valid From <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                <input
                                    name="po_from_date"
                                    type="date"
                                    value={salesOrder.po_from_date || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted}
                                    style={{ ...getHighlightStyle(salesOrder.po_from_date) }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>PO Valid To <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                <input
                                    name="po_to_date"
                                    type="date"
                                    value={salesOrder.po_to_date || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted}
                                    style={{ ...getHighlightStyle(salesOrder.po_to_date) }}
                                />
                            </div>
                        </div>
                    </section>

                    {/* 2. Line Items Section */}
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Product Line Items" />
                        <div style={{ overflowX: 'auto', border: '1px solid #E0E6ED', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#F8FAFC' }}>
                                        <th style={{ padding: '12px 8px', width: '40px' }}></th>
                                        <th style={{ width: '60px', padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED' }}>Sr.No.</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '120px' }}>Type</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '20%' }}>Product</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '20%' }}>Description</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '130px' }}>Start Date</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '130px' }}>End Date</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '80px' }}>Qty</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '120px' }}>Rate</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '80px' }}>Disc%</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED' }}>Total</th>
                                        {!isSubmitted && <th style={{ padding: '12px 16px', borderBottom: '1px solid #E0E6ED', width: '40px' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesOrder.items.map((item: any, index: number) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                {index === salesOrder.items.length - 1 && !isSubmitted && (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddItem}
                                                        style={{
                                                            padding: '4px',
                                                            background: '#F0F9FF',
                                                            border: '1px solid #BAE6FD',
                                                            borderRadius: '6px',
                                                            color: '#0284C7',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            margin: '0 auto'
                                                        }}
                                                        title="Add row"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{index + 1}</td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <select
                                                    value={item.item_type || 'LICENSE'}
                                                    onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        outline: 'none',
                                                        fontWeight: 600
                                                    }}
                                                    disabled={isSubmitted}
                                                >
                                                    <option value="LICENSE">License</option>
                                                    <option value="SERVICES">Services</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input
                                                    type="text"
                                                    value={item.product_name || item.product || ''}
                                                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        outline: 'none',
                                                        ...getHighlightStyle(item.product_name || item.product)
                                                    }}
                                                    placeholder="Product Name"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input
                                                    type="text"
                                                    value={item.description || ''}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        color: '#1a1f36',
                                                        outline: 'none',
                                                        ...getHighlightStyle(item.description)
                                                    }}
                                                    placeholder="Item Description"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input
                                                    type="date"
                                                    value={item.start_date || ''}
                                                    onChange={(e) => handleItemChange(index, 'start_date', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        outline: 'none',
                                                        ...getHighlightStyle(item.start_date)
                                                    }}
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input
                                                    type="date"
                                                    value={item.end_date || ''}
                                                    onChange={(e) => handleItemChange(index, 'end_date', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        outline: 'none',
                                                        ...getHighlightStyle(item.end_date)
                                                    }}
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input
                                                    type="number"
                                                    value={item.qty === 0 ? '' : item.qty}
                                                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                    placeholder="0"
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px 10px',
                                                        border: '1px solid #E0E6ED',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        textAlign: 'center',
                                                        ...getHighlightStyle(item.qty)
                                                    }}
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ position: 'absolute', left: '10px', fontSize: '0.8rem', color: '#718096', fontWeight: 600 }}>{getCurrencySymbol(salesOrder.currency)}</span>
                                                    <input
                                                        type="number"
                                                        value={item.rate === 0 ? '' : item.rate}
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        placeholder="0"
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px 10px 6px 24px',
                                                            border: '1px solid #E0E6ED',
                                                            borderRadius: '6px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                            ...getHighlightStyle(item.rate)
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab' && !e.shiftKey && index === salesOrder.items.length - 1) {
                                                                e.preventDefault();
                                                                handleAddItem();
                                                            }
                                                        }}
                                                        disabled={isSubmitted}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                <input
                                                    type="number"
                                                    value={item.discount_percent || 0}
                                                    onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                                                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #E0E6ED', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#C53030', textAlign: 'center' }}
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36' }}>
                                                {getCurrencySymbol(salesOrder.currency)}{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            {!isSubmitted && (
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    {salesOrder.items.length > 1 && (
                                                        <button
                                                            onClick={() => handleRemoveItem(index)}
                                                            style={{
                                                                background: '#FFF5F5',
                                                                border: '1px solid #FED7D7',
                                                                borderRadius: '6px',
                                                                color: '#E53E3E',
                                                                cursor: 'pointer',
                                                                padding: '6px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseOver={(e) => { e.currentTarget.style.background = '#FED7D7'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.background = '#FFF5F5'; }}
                                                            title="Remove Item"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <td colSpan={10} style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Order Value</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                                            <span style={{ color: 'var(--theme-primary)', marginRight: '4px' }}>{getCurrencySymbol(salesOrder.currency)}</span>
                                            {parseFloat(salesOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        {!isSubmitted && <td></td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>

                    {/* 3. Logistics & Currency Section */}
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Logistics & Currency" />
                        <div className="ae-grid-4">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Currency</label>
                                <SearchableDropdown
                                    options={[
                                        { value: 'INR', label: 'INR - Indian Rupee' },
                                        { value: 'USD', label: 'USD - US Dollar' }
                                    ]}
                                    value={salesOrder.currency}
                                    onChange={(val) => handleInputChange({ target: { name: 'currency', value: val } } as any)}
                                    placeholder="Select Currency"
                                    className="w-full"
                                    disabled={isSubmitted}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Order Date</label>
                                <input
                                    name="order_date"
                                    type="date"
                                    value={salesOrder.order_date || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted}
                                    style={{ ...getHighlightStyle(salesOrder.order_date) }}
                                />
                            </div>
                            <div className="md:col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Billing Address</label>
                                <textarea
                                    name="billing_address"
                                    value={salesOrder.billing_address || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{
                                        height: 'auto',
                                        minHeight: '120px',
                                        ...getHighlightStyle(salesOrder.billing_address)
                                    }}
                                    rows={4}
                                    disabled={isSubmitted}
                                    placeholder="Billing Address"
                                />
                            </div>
                            <div className="md:col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Shipping Address</label>
                                <textarea
                                    name="shipping_address"
                                    value={salesOrder.shipping_address || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{
                                        height: 'auto',
                                        minHeight: '120px',
                                        ...getHighlightStyle(salesOrder.shipping_address)
                                    }}
                                    rows={4}
                                    disabled={isSubmitted}
                                    placeholder="Shipping Address"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 4. Source Document Section */}
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Source Document" />
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            background: '#F8FAFC',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <FileText size={40} style={{ color: 'var(--theme-primary)' }} />
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{salesOrder.po_file_name || 'PurchaseOrder.pdf'}</p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>PDF document uploaded via Extraction Engine</p>
                                </div>
                            </div>
                            <button
                                onClick={handleViewPDF}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-primary)',
                                    background: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    color: 'var(--text-secondary)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#F7FAFC'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                                View PDF
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* Bottom Actions - Now outside the card */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'white',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                width: 'fit-content',
                flexShrink: 0,
                zIndex: 10,
                marginTop: '10px',
                marginLeft: 'auto'
            }}>
                {!isSubmitted && (
                    <>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 24px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                height: '40px',
                                background: hoveredBtn === 'draft' && !showCancelModal ? 'var(--theme-primary)' : 'transparent',
                                color: showCancelModal ? '#CBD5E0' : (hoveredBtn === 'draft' ? 'white' : 'var(--text-secondary)'),
                                border: 'none',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: hoveredBtn === 'draft' && !showCancelModal ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredBtn('draft')}
                            onMouseLeave={() => setHoveredBtn(null)}
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span>Save as Draft</span>
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 24px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                height: '40px',
                                background: (!hoveredBtn || hoveredBtn === 'submit') && !showCancelModal ? 'var(--theme-primary)' : 'transparent',
                                color: showCancelModal ? '#CBD5E0' : ((!hoveredBtn || hoveredBtn === 'submit') ? 'white' : 'var(--text-secondary)'),
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: (!hoveredBtn || hoveredBtn === 'submit') && !showCancelModal ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredBtn('submit')}
                            onMouseLeave={() => setHoveredBtn(null)}
                        >
                            <PlusCircle size={18} />
                            <span style={{ fontWeight: 800 }}>Submit for Approval</span>
                        </button>
                    </>
                )}

                <button
                    onClick={() => setShowCancelModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 20px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: showCancelModal || hoveredBtn === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                        color: showCancelModal || hoveredBtn === 'cancel' ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer',
                        height: '40px',
                        transition: 'all 0.2s',
                        boxShadow: showCancelModal || hoveredBtn === 'cancel' ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredBtn('cancel')}
                    onMouseLeave={() => setHoveredBtn(null)}
                >
                    <span style={{ fontSize: '18px', lineHeight: '10px' }}>×</span>
                    <span>Cancel</span>
                </button>
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

export default SalesOrderForm;
