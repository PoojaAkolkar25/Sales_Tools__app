import React, { useState, useEffect, type ChangeEvent } from 'react';
import {
    Trash2,
    Save,
    CheckCircle,
    XCircle,
    Download,
    PlusCircle,
    Plus,
    Eye,
    Calendar,
    FileText,
    Loader2
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import SearchableDropdown from './SearchableDropdown';
import { formatToAppDate } from '../utils/dateUtils';

interface SalesOrderFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
    onUploadPO?: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
    isExtractingSO?: boolean;
}

const SalesOrderForm: React.FC<SalesOrderFormProps> = ({ id, onBack, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);

    const [salesOrder, setSalesOrder] = useState<any>(id ? null : {
        so_number: '',
        customer_name: '',
        customer: '',
        customer_code: '',
        po_number: '',
        po_date: '',
        po_from_date: '',
        po_to_date: '',
        currency: 'INR',
        order_date: new Date().toISOString().split('T')[0],
        billing_address: '',
        shipping_address: '',
        items: [{
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
        }],
        total_amount: 0,
        status: 'DRAFT'
    });


    const [hoveredBtn, setHoveredBtn] = useState<string | null>('submit');
    const [isConfirmingExit, setIsConfirmingExit] = useState(false);

    useEffect(() => {
        if (isConfirmingExit) {
            setHoveredBtn('cancel');
        }
    }, [isConfirmingExit]);
    const { showNotification, showConfirm } = useNotification();

    useEffect(() => {
        fetchCustomers();
        if (id) {
            fetchSalesOrderDetails();
        }
    }, [id]);

    const fetchCustomers = async () => {
        try {
            const [custRes, partRes] = await Promise.all([
                api.get('/customers/'),
                api.get('/partners/')
            ]);
            setCustomers(custRes.data);
            setPartners(partRes.data);
        } catch (error) {
            console.error('Error fetching customers/partners', error);
        }
    };

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

    const handleCustomerSelect = (value: string | number) => {
        const selectedCustomer = customers.find(c => c.id === parseInt(value.toString()));
        if (selectedCustomer) {
            const matchedPartner = partners.find(p => p.name === selectedCustomer.name);

            setSalesOrder((prev: any) => ({
                ...prev,
                customer: selectedCustomer.id,
                customer_name: selectedCustomer.name,
                customer_code: selectedCustomer.customer_id || prev.customer_code,
                billing_address: matchedPartner?.address || selectedCustomer.address || prev.billing_address,
                shipping_address: matchedPartner?.address || selectedCustomer.address || prev.shipping_address,
                currency: selectedCustomer.currency || prev.currency
            }));
        }
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

            if (id) {
                await api.patch(`/sales-orders/${id}/`, payload);
                showNotification('Sales Order updated successfully', 'success');
            } else {
                await api.post('/sales-orders/', payload);
                showNotification('Sales Order created successfully', 'success');
            }
            onSave();
        } catch (error: any) {
            console.error('Save Error:', error);
            let errorMsg = 'Failed to update Sales Order';
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

            let currentId = id;
            if (id) {
                await api.patch(`/sales-orders/${id}/`, payload);
            } else {
                const response = await api.post('/sales-orders/', payload);
                currentId = response.data.id;
            }

            // Then, trigger the submit action
            await api.post(`/sales-orders/${currentId}/submit/`);
            showNotification('Sales Order submitted successfully', 'success');
            onSave();
        } catch (error: any) {
            console.error('Submit Error:', error);
            let errorMsg = 'Failed to submit Sales Order';
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

    const handleDownloadPDF = () => {
        if (salesOrder.po_file_url) {
            const baseUrl = api.defaults.baseURL?.replace('/api', '').replace(/\/$/, '') || '';
            const fullUrl = `${baseUrl}${salesOrder.po_file_url}`;
            const link = document.createElement('a');
            link.href = fullUrl;
            link.download = salesOrder.po_file_name || 'PurchaseOrder.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
                        <div className="ae-grid-5">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Sales Order Number</label>
                                <input
                                    type="text"
                                    value={salesOrder.so_number || 'Auto-generated on Submit'}
                                    className="ae-input"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-secondary)',
                                    }}
                                    disabled
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                                {!id ? (
                                    <SearchableDropdown
                                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                                        value={salesOrder.customer || ''}
                                        onChange={handleCustomerSelect}
                                        placeholder="Select Customer"
                                    />
                                ) : (
                                    <div className="ae-input" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        minHeight: '34px',
                                        cursor: 'default'
                                    }}>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {salesOrder.customer_detail?.name || salesOrder.customer_name || 'No Customer Extracted'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer Code</label>
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
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Purchase Order Number <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                <input
                                    name="po_number"
                                    type="text"
                                    value={salesOrder.po_number || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Purchase Order Date</label>
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px' }}>{salesOrder.po_date ? formatToAppDate(salesOrder.po_date) : ''}</div>
                                ) : (
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={salesOrder.po_date ? formatToAppDate(salesOrder.po_date) : ''}
                                            readOnly
                                            className="ae-input"
                                            style={{ backgroundColor: 'white', cursor: 'pointer', paddingRight: '32px' }}
                                            onClick={(e) => {
                                                const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                                if (dateInput) dateInput.showPicker();
                                            }}
                                            placeholder="Select Date"
                                        />
                                        <input
                                            name="po_date"
                                            type="date"
                                            value={salesOrder.po_date || ''}
                                            onChange={handleInputChange}
                                            style={{
                                                position: 'absolute',
                                                visibility: 'hidden',
                                                width: 0,
                                                height: 0
                                            }}
                                        />
                                        <Calendar size={14} style={{ position: 'absolute', right: '10px', color: '#718096', pointerEvents: 'none' }} />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PO Valid From <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px' }}>{salesOrder.po_from_date ? formatToAppDate(salesOrder.po_from_date) : ''}</div>
                                ) : (
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={salesOrder.po_from_date ? formatToAppDate(salesOrder.po_from_date) : ''}
                                            readOnly
                                            className="ae-input"
                                            style={{ backgroundColor: 'white', cursor: 'pointer', paddingRight: '32px' }}
                                            onClick={(e) => {
                                                const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                                if (dateInput) dateInput.showPicker();
                                            }}
                                            placeholder="Select Date"
                                        />
                                        <input
                                            name="po_from_date"
                                            type="date"
                                            value={salesOrder.po_from_date || ''}
                                            onChange={handleInputChange}
                                            style={{
                                                position: 'absolute',
                                                visibility: 'hidden',
                                                width: 0,
                                                height: 0
                                            }}
                                        />
                                        <Calendar size={14} style={{ position: 'absolute', right: '10px', color: '#718096', pointerEvents: 'none' }} />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PO Valid To <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px' }}>{salesOrder.po_to_date ? formatToAppDate(salesOrder.po_to_date) : ''}</div>
                                ) : (
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={salesOrder.po_to_date ? formatToAppDate(salesOrder.po_to_date) : ''}
                                            readOnly
                                            className="ae-input"
                                            style={{ backgroundColor: 'white', cursor: 'pointer', paddingRight: '32px' }}
                                            onClick={(e) => {
                                                const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                                if (dateInput) dateInput.showPicker();
                                            }}
                                            placeholder="Select Date"
                                        />
                                        <input
                                            name="po_to_date"
                                            type="date"
                                            value={salesOrder.po_to_date || ''}
                                            onChange={handleInputChange}
                                            style={{
                                                position: 'absolute',
                                                visibility: 'hidden',
                                                width: 0,
                                                height: 0
                                            }}
                                        />
                                        <Calendar size={14} style={{ position: 'absolute', right: '10px', color: '#718096', pointerEvents: 'none' }} />
                                    </div>
                                )}
                            </div>

                        </div>
                    </section>

                    {/* 2. Line Items Section */}
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Product Line Items" />
                        <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#F8FAFC' }}>
                                        <th style={{ padding: '10px 4px', width: '40px', borderBottom: '1px solid #E0E6ED' }}></th>
                                        <th style={{ width: '60px', padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Sr.No.</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '100px' }}>Type</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '180px' }}>Product</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '180px' }}>Description</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '150px' }}>Start Date</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '150px' }}>End Date</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '80px' }}>Qty</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '130px' }}>Rate</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '80px' }}>Disc%</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Total</th>
                                        {!isSubmitted && <th style={{ padding: '10px 4px', borderBottom: '1px solid #E0E6ED', width: '40px' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesOrder.items.map((item: any, index: number) => (
                                        <tr key={item.id ?? `new-${index}`} style={{ borderBottom: index === salesOrder.items.length - 1 ? 'none' : '1px solid #E0E6ED' }}>
                                            <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
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
                                            <td style={{ padding: '6px 4px', textAlign: 'center', fontSize: '0.85rem', color: '#4A5568', fontWeight: 600, verticalAlign: 'middle' }}>{index + 1}</td>
                                            <td style={{ padding: '6px 4px', minWidth: '100px', verticalAlign: 'middle' }}>
                                                <div style={{ width: '100px' }}>
                                                    <SearchableDropdown
                                                        options={[
                                                            { value: 'LICENSE', label: 'License' },
                                                            { value: 'SERVICES', label: 'Services' },
                                                        ]}
                                                        value={item.item_type || ''}
                                                        onChange={(val) => handleItemChange(index, 'item_type', val as string)}
                                                        placeholder="Type"
                                                        className="w-full"
                                                        disabled={isSubmitted}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', minWidth: '180px', verticalAlign: 'middle' }}>
                                                <input
                                                    type="text"
                                                    value={item.product_name || item.product || ''}
                                                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                                    className="ae-input"
                                                    style={{
                                                        width: '100%',
                                                        height: '30px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.85rem',
                                                        borderRadius: '6px'
                                                    }}
                                                    placeholder="Product Name"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px', minWidth: '180px', verticalAlign: 'middle' }}>
                                                <textarea
                                                    value={item.description || ''}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="ae-input custom-scrollbar"
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '30px',
                                                        height: '30px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.85rem',
                                                        borderRadius: '6px',
                                                        resize: 'vertical'
                                                    }}
                                                    placeholder="Item Description"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px', position: 'relative', verticalAlign: 'middle' }}>
                                                {isSubmitted ? (
                                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '30px', fontSize: '0.85rem' }}>{item.start_date ? formatToAppDate(item.start_date) : ''}</div>
                                                ) : (
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '140px' }}>
                                                        <input
                                                            type="text"
                                                            value={item.start_date ? formatToAppDate(item.start_date) : ''}
                                                            readOnly
                                                            className="ae-input"
                                                            style={{ backgroundColor: 'white', cursor: 'pointer', paddingRight: '28px', fontSize: '0.85rem', width: '100%', height: '30px' }}
                                                            onClick={(e) => {
                                                                const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                                                if (dateInput) dateInput.showPicker();
                                                            }}
                                                            placeholder="Select Date"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={item.start_date || ''}
                                                            onChange={(e) => handleItemChange(index, 'start_date', e.target.value)}
                                                            style={{
                                                                position: 'absolute',
                                                                visibility: 'hidden',
                                                                width: 0,
                                                                height: 0
                                                            }}
                                                        />
                                                        <Calendar size={14} style={{ position: 'absolute', right: '8px', color: '#718096', pointerEvents: 'none' }} />
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '6px 4px', position: 'relative', verticalAlign: 'middle' }}>
                                                {isSubmitted ? (
                                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '30px', fontSize: '0.85rem' }}>{item.end_date ? formatToAppDate(item.end_date) : ''}</div>
                                                ) : (
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '140px' }}>
                                                        <input
                                                            type="text"
                                                            value={item.end_date ? formatToAppDate(item.end_date) : ''}
                                                            readOnly
                                                            className="ae-input"
                                                            style={{ backgroundColor: 'white', cursor: 'pointer', paddingRight: '28px', fontSize: '0.85rem', width: '100%', height: '30px' }}
                                                            onClick={(e) => {
                                                                const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                                                if (dateInput) dateInput.showPicker();
                                                            }}
                                                            placeholder="Select Date"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={item.end_date || ''}
                                                            onChange={(e) => handleItemChange(index, 'end_date', e.target.value)}
                                                            style={{
                                                                position: 'absolute',
                                                                visibility: 'hidden',
                                                                width: 0,
                                                                height: 0
                                                            }}
                                                        />
                                                        <Calendar size={14} style={{ position: 'absolute', right: '8px', color: '#718096', pointerEvents: 'none' }} />
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'center', minWidth: '80px', verticalAlign: 'middle' }}>
                                                <div style={{ width: '70px', margin: '0 auto' }}>
                                                    <input
                                                        type="number"
                                                        value={item.qty || ''}
                                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                        className="ae-input"
                                                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600, height: '30px' }}
                                                        min="1"
                                                        disabled={isSubmitted}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', minWidth: '130px', verticalAlign: 'middle' }}>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '120px' }}>
                                                    <span style={{ position: 'absolute', left: '8px', color: '#718096', fontSize: '0.85rem', fontWeight: 600 }}>{getCurrencySymbol(salesOrder.currency)}</span>
                                                    <input
                                                        type="number"
                                                        value={item.rate || ''}
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        className="ae-input"
                                                        style={{ width: '100%', padding: '4px 8px 4px 20px', fontSize: '0.85rem', fontWeight: 600, height: '30px' }}
                                                        min="0"
                                                        step="0.01"
                                                        disabled={isSubmitted}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'center', minWidth: '80px', verticalAlign: 'middle' }}>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '70px', margin: '0 auto' }}>
                                                    <input
                                                        type="number"
                                                        value={item.discount_percent || 0}
                                                        onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                                                        className="ae-input"
                                                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.85rem', color: '#C53030', textAlign: 'center', fontWeight: 600, height: '30px' }}
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        disabled={isSubmitted}
                                                    />
                                                    <span style={{ position: 'absolute', right: '8px', color: '#C53030', fontSize: '0.85rem', pointerEvents: 'none' }}>%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: '#2D3748', verticalAlign: 'middle' }}>
                                                <span style={{ color: 'var(--theme-primary)', marginRight: '4px' }}>{getCurrencySymbol(salesOrder.currency)}</span>
                                                {((parseFloat(item.qty as unknown as string) || 0) * (parseFloat(item.rate as unknown as string) || 0) * (1 - (parseFloat(item.discount_percent as unknown as string) || 0) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                    <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E0E6ED' }}>
                                        <td colSpan={10} style={{ padding: '8px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Order Value</td>
                                        <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
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
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Logistics & Currency" />
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 150px 1fr 1fr', gap: '16px' }}>
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
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px', ...getHighlightStyle(salesOrder.order_date) }}>{salesOrder.order_date ? formatToAppDate(salesOrder.order_date) : ''}</div>
                                ) : (
                                    <input
                                        name="order_date"
                                        type="date"
                                        value={salesOrder.order_date || ''}
                                        onChange={handleInputChange}
                                        className="ae-input"
                                        style={{ ...getHighlightStyle(salesOrder.order_date), height: '34px' }}
                                    />
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Billing Address</label>
                                <textarea
                                    name="billing_address"
                                    value={salesOrder.billing_address || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{
                                        minHeight: '60px',
                                        height: '60px',
                                        ...getHighlightStyle(salesOrder.billing_address),
                                        padding: '4px 8px',
                                        fontSize: '0.85rem'
                                    }}
                                    rows={2}
                                    disabled={isSubmitted}
                                    placeholder="Billing Address"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Shipping Address</label>
                                <textarea
                                    name="shipping_address"
                                    value={salesOrder.shipping_address || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{
                                        minHeight: '60px',
                                        height: '60px',
                                        ...getHighlightStyle(salesOrder.shipping_address),
                                        padding: '4px 8px',
                                        fontSize: '0.85rem'
                                    }}
                                    rows={2}
                                    disabled={isSubmitted}
                                    placeholder="Shipping Address"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 4. Source Document Section */}
                    {salesOrder.po_file_url && (
                        <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                            <SectionHeader title="Source Document" />
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                background: '#F8FAFC',
                                borderRadius: '16px',
                                border: '1px solid #E2E8F0',
                                maxWidth: '100%',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #EDF2F7',
                                    flexShrink: 0
                                }}>
                                    <FileText size={18} style={{ color: 'var(--theme-primary)', margin: '0 auto' }} />
                                </div>

                                <span style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#2D3748',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '300px'
                                }}>
                                    {salesOrder.po_file_name || 'PurchaseOrder.pdf'}
                                </span>

                                <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                                    <button
                                        onClick={handleViewPDF}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: '#EBF8FF',
                                            color: '#3182CE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        className="hover:bg-[#BEE3F8]"
                                        title="View PDF"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={handleDownloadPDF}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: '#F7FAFC',
                                            color: '#718096',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            border: '1px solid #E2E8F0'
                                        }}
                                        className="hover:bg-[#EDF2F7]"
                                        title="Download PDF"
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}
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
            }}
                className="button-container"
                onMouseLeave={() => {
                    if (!isConfirmingExit) {
                        setHoveredBtn('submit');
                    }
                }}
            >
                {!isSubmitted && (
                    <>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: hoveredBtn === 'draft' ? 'var(--theme-primary)' : 'transparent',
                                color: hoveredBtn === 'draft' ? 'white' : 'var(--text-secondary)',
                                boxShadow: hoveredBtn === 'draft' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={() => !isConfirmingExit && setHoveredBtn('draft')}
                            onMouseLeave={() => setHoveredBtn('')}
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            <span>Save as Draft</span>
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: hoveredBtn === 'submit' ? 'var(--theme-primary)' : 'rgba(255, 107, 0, 0.05)',
                                color: hoveredBtn === 'submit' ? 'white' : 'var(--ae-orange)',
                                boxShadow: hoveredBtn === 'submit' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={() => !isConfirmingExit && setHoveredBtn('submit')}
                            onMouseLeave={() => setHoveredBtn('')}
                        >
                            <PlusCircle size={16} />
                            <span>Submit for Approval</span>
                        </button>
                    </>
                )}

                {(salesOrder.status === 'PENDING_APPROVAL' || salesOrder.status === 'SUBMITTED') && (
                    <>
                        <button
                            onClick={handleApprove}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                background: '#00C853',
                                color: 'white',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0, 200, 83, 0.2)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#00ad48'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#00C853'; }}
                        >
                            <CheckCircle size={16} />
                            <span>Approve</span>
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                background: 'rgba(229,62,62,0.06)',
                                color: '#E53E3E',
                                border: '1px solid rgba(229,62,62,0.4)',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#E53E3E'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#E53E3E'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(229,62,62,0.06)'; e.currentTarget.style.color = '#E53E3E'; e.currentTarget.style.borderColor = 'rgba(229,62,62,0.4)'; }}
                        >
                            <XCircle size={16} />
                            <span>Reject</span>
                        </button>
                    </>
                )}

                <button
                    onClick={() => {
                        setIsConfirmingExit(true);
                        showConfirm({
                            title: 'Are you sure you want to exit?',
                            onConfirm: () => onBack(),
                            onCancel: () => setIsConfirmingExit(false)
                        });
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 16px',
                        height: '32px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: 'none',
                        background: hoveredBtn === 'cancel' ? 'rgba(255, 107, 0, 0.05)' : 'transparent',
                        color: hoveredBtn === 'cancel' ? 'var(--ae-orange)' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={() => !isConfirmingExit && setHoveredBtn('cancel')}
                    onMouseLeave={() => setHoveredBtn('')}
                >
                    <span style={{ fontSize: '16px', lineHeight: '16px', fontWeight: 700 }}>×</span>
                    <span>Cancel</span>
                </button>
            </div>


        </div>
    );
};
export default SalesOrderForm;
