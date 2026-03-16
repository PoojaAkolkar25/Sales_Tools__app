import React, { useState, useEffect } from 'react';
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
    Loader2,
    RotateCcw,
    X,
    Pencil
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import SearchableDropdown from './SearchableDropdown';
import AutoExpandingTextarea from './AutoExpandingTextarea';
import { formatToAppDate } from '../utils/dateUtils';

interface SalesOrderFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
    user: any;
}

const SalesOrderForm: React.FC<SalesOrderFormProps> = ({ id, onBack, onSave, user }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [estimates, setEstimates] = useState<any[]>([]);

    const [salesOrder, setSalesOrder] = useState<any>(id ? null : {
        so_number: '',
        customer_name: '',
        customer: '',
        cust_id: '',
        estimate: '',
        estimate_no: '',
        estimate_date: '',
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
            qty: '',
            rate: '',
            tax: '',
            discount: '',
            amount: ''
        }],
        total_amount: 0,
        status: 'DRAFT',
        column_labels: {
            item_type: 'Type',
            product_name: 'Product',
            description: 'Description',
            start_date: 'Start Date',
            end_date: 'End Date',
            qty: 'Qty',
            rate: 'Rate',
            discount_percent: 'Disc%'
        }
    });


    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectComment, setRejectComment] = useState('');
    const [showRevertModal, setShowRevertModal] = useState(false);
    const [revertComment, setRevertComment] = useState('');
    const [editingColumn, setEditingColumn] = useState<string | null>(null);

    const [activeAction, setActiveAction] = useState<'draft' | 'submit' | 'cancel' | 'approve' | 'reject' | 'revert'>('submit');
    const { showNotification } = useNotification();
    
    // --- Date Typing Logic (from Deal Form) ---
    const [dateTypingValues, setDateTypingValues] = useState<{ [key: string]: string }>({});

    const handleDateFocus = (name: string, isItemDate: boolean = false, itemIndex: number = -1) => {
        const stateKey = isItemDate ? `${name}_${itemIndex}` : name;
        if (!dateTypingValues[stateKey]) {
            let targetValue = '';
            if (isItemDate && itemIndex >= 0) {
                targetValue = salesOrder.items[itemIndex]?.[name] || '';
            } else {
                targetValue = salesOrder[name] || '';
            }

            if (targetValue) {
                const parts = targetValue.split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts;
                    setDateTypingValues(prev => ({ ...prev, [stateKey]: `${d}-${m}-${y}` }));
                }
            }
        }
    };

    const handleDateInputChange = (name: string, value: string, isItemDate: boolean = false, itemIndex: number = -1) => {
        const stateKey = isItemDate ? `${name}_${itemIndex}` : name;
        const prevValue = dateTypingValues[stateKey] || '';
        const isDeletion = value.length < prevValue.length;

        let processedValue = value;
        if (isDeletion && prevValue.endsWith('-') && !value.endsWith('-')) {
            processedValue = value.slice(0, -1);
        }

        let formatted = '';

        if (processedValue.includes('-') || (prevValue.includes('-') && isDeletion)) {
            const parts = processedValue.split('-');
            const dayStr = (parts[0] || '').replace(/\D/g, '').substring(0, 2);
            const monthStr = (parts[1] || '').replace(/\D/g, '').substring(0, 2);
            const yearStr = (parts[2] || '').replace(/\D/g, '').substring(0, 4);

            if (dayStr.length > 0) {
                if (parseInt(dayStr[0]) > 3) return;
                if (dayStr.length === 2 && (parseInt(dayStr) > 31 || dayStr === '00')) return;
            }
            if (monthStr.length > 0) {
                if (parseInt(monthStr[0]) > 1) return;
                if (monthStr.length === 2 && (parseInt(monthStr) > 12 || monthStr === '00')) return;
            }

            formatted = dayStr;
            if (dayStr.length === 2 || parts.length > 1) {
                formatted += '-';
                if (monthStr.length > 0 || parts.length > 1) {
                    formatted += monthStr;
                    if (monthStr.length === 2 || parts.length > 2) {
                        formatted += '-';
                        if (yearStr.length > 0) {
                            formatted += yearStr;
                        }
                    }
                }
            }

            if (isDeletion && formatted.endsWith('-') && !processedValue.endsWith('-')) {
                formatted = formatted.slice(0, -1);
            }
        } else {
            let digits = processedValue.replace(/\D/g, '');

            if (digits.length > 0) {
                if (parseInt(digits[0]) > 3) return;
                if (digits.length >= 2) {
                    const d = parseInt(digits.substring(0, 2));
                    if (d > 31 || d === 0) if (digits.length === 2) return;
                    if (digits.length >= 3) {
                        if (parseInt(digits[2]) > 1) return;
                        if (digits.length >= 4) {
                            const m = parseInt(digits.substring(2, 4));
                            if (m > 12 || m === 0) return;
                        }
                    }
                }
            }

            if (digits.length > 0) {
                formatted = digits.substring(0, 2);
                if (digits.length > 2 || (digits.length === 2 && !isDeletion)) {
                    formatted += '-';
                    if (digits.length > 2) {
                        formatted += digits.substring(2, 4);
                        if (digits.length > 4 || (digits.length === 4 && !isDeletion)) {
                            formatted += '-';
                            if (digits.length > 4) {
                                formatted += digits.substring(4, 8);
                            }
                        }
                    }
                }
            }
        }

        setDateTypingValues(prev => ({ ...prev, [stateKey]: formatted }));

        if (formatted.length < 10) {
            if (isItemDate && itemIndex >= 0) {
                if (salesOrder.items[itemIndex]?.[name] !== '') {
                    handleItemChange(itemIndex, name, '');
                }
            } else {
                if (salesOrder[name] !== '') {
                    setSalesOrder((prev: any) => ({ ...prev, [name]: '' }));
                }
            }
        } else {
            const [d, m, y] = formatted.split('-').map(Number);
            const isoDate = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            if (isItemDate && itemIndex >= 0) {
                if (salesOrder.items[itemIndex]?.[name] !== isoDate) {
                    handleItemChange(itemIndex, name, isoDate);
                }
            } else {
                if (salesOrder[name] !== isoDate) {
                    setSalesOrder((prev: any) => ({ ...prev, [name]: isoDate }));
                }
            }
        }
    };

    const handleDateBlur = (name: string, isItemDate: boolean = false, itemIndex: number = -1) => {
        const stateKey = isItemDate ? `${name}_${itemIndex}` : name;
        setDateTypingValues(prev => {
            const next = { ...prev };
            delete next[stateKey];
            return next;
        });
    };

    useEffect(() => {
        fetchCustomers();
        if (id) {
            fetchSalesOrderDetails();
        } else {
            // Reset form for fresh creation (e.g. when clicking "Create New" while editing an existing SO)
            setSalesOrder({
                so_number: '',
                customer_name: '',
                customer: '',
                cust_id: '',
                estimate: '',
                estimate_no: '',
                estimate_date: '',
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
                    qty: '',
                    rate: '',
                    tax: '',
                    discount: '',
                    amount: ''
                }],
                total_amount: 0,
                status: 'DRAFT',
                column_labels: {
                    item_type: 'Type',
                    product_name: 'Product',
                    description: 'Description',
                    start_date: 'Start Date',
                    end_date: 'End Date',
                    qty: 'Qty',
                    rate: 'Rate',
                    discount_percent: 'Disc%'
                }
            });
            setEstimates([]);
        }
    }, [id]);

    const fetchEstimatesByCustomer = async (customerId: number) => {
        try {
            const response = await api.get(`/estimates/?customer=${customerId}`);
            setEstimates(response.data);
        } catch (error) {
            console.error('Error fetching estimates for customer', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const [custRes, partRes, compRes] = await Promise.all([
                api.get('/customers/'),
                api.get('/partners/'),
                api.get('/finance/company-profile/')
            ]);
            setCustomers(custRes.data);
            setPartners(partRes.data);
            setCompanies(compRes.data);
        } catch (error) {
            console.error('Error fetching customers/partners/companies', error);
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

    useEffect(() => {
        if (salesOrder?.customer) {
            fetchEstimatesByCustomer(salesOrder.customer);
        }
    }, [salesOrder?.customer]);

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
            const matchedCompany = companies.find((c: any) => c.name === selectedCustomer.name);

            setSalesOrder((prev: any) => ({
                ...prev,
                customer: selectedCustomer.id,
                customer_name: selectedCustomer.name,
                cust_id: selectedCustomer.customer_id || selectedCustomer.cust_id || selectedCustomer.id || prev.cust_id,
                billing_address: matchedPartner?.address || selectedCustomer.address || prev.billing_address,
                shipping_address: matchedPartner?.address || selectedCustomer.address || prev.shipping_address,
                // Prioritize base_currency from Company Profile (User Management)
                currency: matchedCompany?.base_currency ||
                    selectedCustomer.currency ||
                    prev.currency || 'INR'
            }));
        }
    };



    const handleEstimateSelect = (value: string | number) => {
        const selectedEstimate = estimates.find(e => String(e.id) === String(value));
        if (selectedEstimate) {
            setSalesOrder((prev: any) => ({
                ...prev,
                estimate: selectedEstimate.id,
                estimate_no: selectedEstimate.estimate_id,
                estimate_date: selectedEstimate.estimate_date || selectedEstimate.date || (selectedEstimate.created_at ? selectedEstimate.created_at.split('T')[0] : '') || '',
                estimate_amount: selectedEstimate.total_price || 0
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
            newItems[index].discount = initial > 0 ? (initial * (disc_percent / 100)).toFixed(2) : '';
        } else if (field === 'discount') {
            const disc_amt = parseFloat(newItems[index].discount) || 0;
            newItems[index].discount_percent = initial > 0 ? ((disc_amt / initial) * 100).toFixed(2) : '';
        }

        const taxable_amount = initial - (parseFloat(newItems[index].discount) || 0);

        if (field === 'tax_percent' || field === 'discount_percent' || field === 'qty' || field === 'rate') {
            const tax_percent = parseFloat(newItems[index].tax_percent) || 0;
            newItems[index].tax = taxable_amount > 0 ? (taxable_amount * (tax_percent / 100)).toFixed(2) : '';
        } else if (field === 'tax') {
            const tax_amt = parseFloat(newItems[index].tax) || 0;
            newItems[index].tax_percent = taxable_amount > 0 ? ((tax_amt / taxable_amount) * 100).toFixed(2) : '';
        }

        const amt = taxable_amount + (parseFloat(newItems[index].tax) || 0);
        newItems[index].amount = amt > 0 ? amt.toFixed(2) : '';

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
                qty: '',
                rate: '',
                tax: '',
                discount: '',
                amount: ''
            }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = salesOrder.items.filter((_: any, i: number) => i !== index);
        const total = newItems.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        setSalesOrder((prev: any) => ({ ...prev, items: newItems, total_amount: total }));
    };

    const handleHeaderChange = (column: string, value: string) => {
        setSalesOrder((prev: any) => ({
            ...prev,
            column_labels: {
                ...prev.column_labels,
                [column]: value
            }
        }));
    };

    const handleSave = async () => {
        // Basic Validation
        if (!salesOrder.po_number?.trim()) {
            showNotification('PO Number is required even for draft.', 'error');
            return;
        }

        const hasEmptyType = salesOrder.items.some((item: any) => !item.item_type);
        if (hasEmptyType) {
            showNotification('Item Type is mandatory for all line items.', 'error');
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
                estimate: salesOrder.estimate || null,
                estimate_date: salesOrder.estimate_date || null,
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

        const hasEmptyType = salesOrder.items.some((item: any) => !item.item_type);
        if (hasEmptyType) {
            showNotification('Item Type is mandatory for all line items.', 'error');
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
        // Validation: Only Sales Head, Finance Manager or App Admin can approve
        const isSalesHead = user?.role === 'sales_head' || user?.groups?.some((g: any) => g.name === 'Sales Head');
        const isFinanceManager = user?.role === 'finance_manager' || user?.groups?.some((g: any) => g.name === 'Finance Manager');
        const isAdmin = user?.role === 'app_admin' || user?.is_superuser;

        if (!isAdmin && !isSalesHead && !isFinanceManager) {
            showNotification('Only admin approve', 'error');
            return;
        }

        if (!window.confirm('Are you sure you want to Approve this Sales Order?')) return;
        setSaving(true);
        try {
            await api.post(`/sales-orders/${id}/approve/`, { notes: 'Approved' });
            showNotification('Sales Order Approved successfully', 'success');
            fetchSalesOrderDetails();
        } catch (error: any) {
            console.error('Approve Error', error);
            showNotification(error.response?.data?.error || 'Failed to Approve Sales Order', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        // Validation: Only Sales Head, Finance Manager or App Admin can reject
        const isSalesHead = user?.role === 'sales_head' || user?.groups?.some((g: any) => g.name === 'Sales Head');
        const isFinanceManager = user?.role === 'finance_manager' || user?.groups?.some((g: any) => g.name === 'Finance Manager');
        const isAdmin = user?.role === 'app_admin' || user?.is_superuser;

        if (!isAdmin && !isSalesHead && !isFinanceManager) {
            showNotification('Only admin approve', 'error');
            return;
        }

        if (!rejectComment) {
            showNotification('Rejection comments are required', 'error');
            return;
        }

        setSaving(true);
        try {
            await api.post(`/sales-orders/${id}/reject/`, { notes: rejectComment });
            showNotification('Sales Order Rejected successfully', 'success');
            setShowRejectModal(false);
            setRejectComment('');
            fetchSalesOrderDetails();
        } catch (error: any) {
            console.error('Reject Error', error);
            showNotification(error.response?.data?.error || 'Failed to Reject Sales Order', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRevert = async () => {
        // Validation: Only Sales Head, Finance Manager or App Admin can revert
        const isSalesHead = user?.role === 'sales_head' || user?.groups?.some((g: any) => g.name === 'Sales Head');
        const isFinanceManager = user?.role === 'finance_manager' || user?.groups?.some((g: any) => g.name === 'Finance Manager');
        const isAdmin = user?.role === 'app_admin' || user?.is_superuser;

        if (!isAdmin && !isSalesHead && !isFinanceManager) {
            showNotification('Only admin approve', 'error');
            return;
        }

        if (!revertComment) {
            showNotification('Revert comments are required', 'error');
            return;
        }

        setSaving(true);
        try {
            await api.post(`/sales-orders/${id}/revert/`, { notes: revertComment });
            showNotification('Sales Order reverted successfully', 'success');
            setShowRevertModal(false);
            setRevertComment('');
            fetchSalesOrderDetails();
        } catch (error: any) {
            console.error('Revert Error', error);
            showNotification(error.response?.data?.error || 'Failed to revert Sales Order', 'error');
        } finally {
            setSaving(false);
        }
    };

    const getCurrencySymbol = (currency: string) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR': return '€';
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
                <style>
                    {`
                        .ae-no-spinner::-webkit-outer-spin-button,
                        .ae-no-spinner::-webkit-inner-spin-button {
                            -webkit-appearance: none;
                            margin: 0;
                        }
                        .ae-no-spinner {
                            -moz-appearance: textfield;
                        }
                    `}
                </style>
                <div className="space-y-0">
                    {/* 1. Basic Info Section */}
                    <section>
                        <SectionHeader title="Basic Order Information" />
                        <div className="ae-grid-responsive-5">
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
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer ID</label>
                                <input
                                    name="cust_id"
                                    type="text"
                                    value={salesOrder.cust_id || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isSubmitted || !!salesOrder.customer || (!!id && !!salesOrder.cust_id)}
                                    placeholder="Enter Customer ID"
                                    style={salesOrder.customer ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
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
                                    disabled={isSubmitted} placeholder="Purchase Order Number "
                                />
                            </div>



                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Estimate No.</label>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <SearchableDropdown
                                        options={estimates.map(e => ({ value: e.id, label: e.estimate_id }))}
                                        value={salesOrder.estimate || ''}
                                        onChange={handleEstimateSelect}
                                        placeholder="Select Estimate"
                                        disabled={isSubmitted || !salesOrder.customer}
                                    />
                                    {salesOrder.estimate && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--ae-blue)', fontWeight: 700, marginTop: '2px' }}>
                                            Est Amt: {getCurrencySymbol(salesOrder.currency)} {parseFloat(salesOrder.estimate_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Estimate Date</label>
                                {isSubmitted || salesOrder.estimate ? (
                                    <div className="ae-input" style={{
                                        minHeight: '34px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {salesOrder.estimate_date ? formatToAppDate(salesOrder.estimate_date) : ''}
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="estimate_date"
                                            value={dateTypingValues['estimate_date'] !== undefined ? dateTypingValues['estimate_date'] : formatToAppDate(salesOrder.estimate_date)}
                                            placeholder="DD-MM-YYYY"
                                            className="ae-input"
                                            style={{ width: '100%', paddingRight: '32px' }}
                                            onChange={(e) => handleDateInputChange('estimate_date', e.target.value)}
                                            onBlur={() => handleDateBlur('estimate_date')}
                                            onFocus={() => handleDateFocus('estimate_date')}
                                        />
                                        <input
                                            type="date"
                                            id="estimate-date-picker"
                                            name="estimate_date"
                                            value={salesOrder.estimate_date || ''}
                                            onChange={handleInputChange}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                        <Calendar 
                                            size={16} 
                                            style={{ 
                                                position: 'absolute', 
                                                right: '10px', 
                                                color: '#718096', 
                                                cursor: 'pointer' 
                                            }} 
                                            onClick={() => {
                                                const picker = document.getElementById('estimate-date-picker') as HTMLInputElement;
                                                if (picker) picker.showPicker?.();
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Purchase Order Date</label>
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px' }}>{salesOrder.po_date ? formatToAppDate(salesOrder.po_date) : ''}</div>
                                ) : (
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="po_date"
                                            value={dateTypingValues['po_date'] !== undefined ? dateTypingValues['po_date'] : formatToAppDate(salesOrder.po_date)}
                                            placeholder="DD-MM-YYYY"
                                            className="ae-input"
                                            style={{ width: '100%', paddingRight: '32px' }}
                                            onChange={(e) => handleDateInputChange('po_date', e.target.value)}
                                            onBlur={() => handleDateBlur('po_date')}
                                            onFocus={() => handleDateFocus('po_date')}
                                        />
                                        <input
                                            type="date"
                                            id="po-date-picker"
                                            name="po_date"
                                            value={salesOrder.po_date || ''}
                                            onChange={handleInputChange}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                        <Calendar 
                                            size={16} 
                                            style={{ 
                                                position: 'absolute', 
                                                right: '10px', 
                                                color: '#718096', 
                                                cursor: 'pointer' 
                                            }} 
                                            onClick={() => {
                                                const picker = document.getElementById('po-date-picker') as HTMLInputElement;
                                                if (picker) picker.showPicker?.();
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PO Valid From <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px' }}>{salesOrder.po_from_date ? formatToAppDate(salesOrder.po_from_date) : ''}</div>
                                ) : (
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="po_from_date"
                                            value={dateTypingValues['po_from_date'] !== undefined ? dateTypingValues['po_from_date'] : formatToAppDate(salesOrder.po_from_date)}
                                            placeholder="DD-MM-YYYY"
                                            className="ae-input"
                                            style={{ width: '100%', paddingRight: '32px' }}
                                            onChange={(e) => handleDateInputChange('po_from_date', e.target.value)}
                                            onBlur={() => handleDateBlur('po_from_date')}
                                            onFocus={() => handleDateFocus('po_from_date')}
                                        />
                                        <input
                                            type="date"
                                            id="po-from-date-picker"
                                            name="po_from_date"
                                            value={salesOrder.po_from_date || ''}
                                            onChange={handleInputChange}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                        <Calendar 
                                            size={16} 
                                            style={{ 
                                                position: 'absolute', 
                                                right: '10px', 
                                                color: '#718096', 
                                                cursor: 'pointer' 
                                            }} 
                                            onClick={() => {
                                                const picker = document.getElementById('po-from-date-picker') as HTMLInputElement;
                                                if (picker) picker.showPicker?.();
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PO Valid To <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px' }}>{salesOrder.po_to_date ? formatToAppDate(salesOrder.po_to_date) : ''}</div>
                                ) : (
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="po_to_date"
                                            value={dateTypingValues['po_to_date'] !== undefined ? dateTypingValues['po_to_date'] : formatToAppDate(salesOrder.po_to_date)}
                                            placeholder="DD-MM-YYYY"
                                            className="ae-input"
                                            style={{ width: '100%', paddingRight: '32px' }}
                                            onChange={(e) => handleDateInputChange('po_to_date', e.target.value)}
                                            onBlur={() => handleDateBlur('po_to_date')}
                                            onFocus={() => handleDateFocus('po_to_date')}
                                        />
                                        <input
                                            type="date"
                                            id="po-to-date-picker"
                                            name="po_to_date"
                                            value={salesOrder.po_to_date || ''}
                                            onChange={handleInputChange}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                        <Calendar 
                                            size={16} 
                                            style={{ 
                                                position: 'absolute', 
                                                right: '10px', 
                                                color: '#718096', 
                                                cursor: 'pointer' 
                                            }} 
                                            onClick={() => {
                                                const picker = document.getElementById('po-to-date-picker') as HTMLInputElement;
                                                if (picker) picker.showPicker?.();
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Currency</label>
                                <input
                                    type="text"
                                    value={salesOrder.currency
                                        ? salesOrder.currency === 'INR'
                                            ? 'INR - Indian Rupee'
                                            : salesOrder.currency === 'USD'
                                                ? 'USD - US Dollar'
                                                : salesOrder.currency === 'EUR'
                                                    ? 'EURO - Euro'
                                                    : salesOrder.currency
                                        : ''}
                                    readOnly
                                    className="ae-input"
                                    placeholder="Auto-filled from customer"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        color: salesOrder.currency ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        cursor: 'default'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Order Date <span style={{ color: 'var(--theme-primary)' }}>*</span></label>
                                {isSubmitted ? (
                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '34px', ...getHighlightStyle(salesOrder.order_date) }}>{salesOrder.order_date ? formatToAppDate(salesOrder.order_date) : ''}</div>
                                ) : (
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="order_date"
                                            value={dateTypingValues['order_date'] !== undefined ? dateTypingValues['order_date'] : formatToAppDate(salesOrder.order_date)}
                                            placeholder="DD-MM-YYYY"
                                            className="ae-input"
                                            style={{ width: '100%', paddingRight: '32px', height: '34px', ...getHighlightStyle(salesOrder.order_date) }}
                                            onChange={(e) => handleDateInputChange('order_date', e.target.value)}
                                            onBlur={() => handleDateBlur('order_date')}
                                            onFocus={() => handleDateFocus('order_date')}
                                        />
                                        <input
                                            type="date"
                                            id="order-date-picker"
                                            name="order_date"
                                            value={salesOrder.order_date || ''}
                                            onChange={handleInputChange}
                                            tabIndex={-1}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                        <Calendar 
                                            size={16} 
                                            focusable="false" 
                                            style={{ 
                                                position: 'absolute', 
                                                right: '10px', 
                                                color: '#718096', 
                                                cursor: 'pointer' 
                                            }} 
                                            onClick={() => {
                                                const picker = document.getElementById('order-date-picker') as HTMLInputElement;
                                                if (picker) picker.showPicker?.();
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Billing Address</label>
                                <AutoExpandingTextarea
                                    name="billing_address"
                                    value={salesOrder.billing_address || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{
                                        minHeight: '48px',
                                        padding: '4px 12px',
                                        ...getHighlightStyle(salesOrder.billing_address),
                                    }}
                                    disabled={isSubmitted}
                                    placeholder="Billing Address"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Shipping Address</label>
                                <AutoExpandingTextarea
                                    name="shipping_address"
                                    value={salesOrder.shipping_address || ''}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{
                                        minHeight: '48px',
                                        padding: '4px 12px',
                                        ...getHighlightStyle(salesOrder.shipping_address),
                                    }}
                                    disabled={isSubmitted}
                                    placeholder="Shipping Address"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 2. Line Items Section */}
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Product Line Items" />
                        <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-accent)' }}>
                                        <th style={{ padding: '10px 4px', width: '40px', borderBottom: '1px solid #E0E6ED' }}></th>
                                        <th style={{ width: '60px', padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Sr.No.</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '100px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'item_type' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.item_type}
                                                        onChange={(e) => handleHeaderChange('item_type', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.item_type || 'Type'}</span>
                                                        <span style={{ color: 'var(--theme-primary)', marginLeft: '2px' }}>*</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('item_type')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '180px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'product_name' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.product_name}
                                                        onChange={(e) => handleHeaderChange('product_name', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.product_name || 'Product'}</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('product_name')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '180px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'description' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.description}
                                                        onChange={(e) => handleHeaderChange('description', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.description || 'Description'}</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('description')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '150px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'start_date' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.start_date}
                                                        onChange={(e) => handleHeaderChange('start_date', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.start_date || 'Start Date'}</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('start_date')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '150px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'end_date' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.end_date}
                                                        onChange={(e) => handleHeaderChange('end_date', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.end_date || 'End Date'}</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('end_date')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '80px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                {editingColumn === 'qty' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', textAlign: 'center', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.qty}
                                                        onChange={(e) => handleHeaderChange('qty', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.qty || 'Qty'}</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('qty')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '130px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'rate' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', textAlign: 'left', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.rate}
                                                        onChange={(e) => handleHeaderChange('rate', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.rate || 'Rate'}</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('rate')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED', minWidth: '80px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                {editingColumn === 'discount_percent' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', textAlign: 'center', fontSize: '0.75rem' }}
                                                        value={salesOrder.column_labels?.discount_percent}
                                                        onChange={(e) => handleHeaderChange('discount_percent', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{salesOrder.column_labels?.discount_percent || 'Disc%'}</span>
                                                        <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('discount_percent')} />
                                                    </>
                                                )}
                                            </div>
                                        </th>
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
                                                        <Plus size={16} focusable="false" />
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
                                                <AutoExpandingTextarea
                                                    value={item.product_name || item.product || ''}
                                                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                                    className="ae-input"
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '30px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.85rem',
                                                        borderRadius: '6px'
                                                    }}
                                                    placeholder="Product Name"
                                                    disabled={isSubmitted}
                                                    maxRows={5}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px', minWidth: '180px', verticalAlign: 'middle' }}>
                                                <AutoExpandingTextarea
                                                    value={item.description || ''}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="ae-input custom-scrollbar"
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '30px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.85rem',
                                                        borderRadius: '6px',
                                                    }}
                                                    placeholder="Item Description"
                                                    disabled={isSubmitted}
                                                    maxRows={5}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px', position: 'relative', verticalAlign: 'middle' }}>
                                                {isSubmitted ? (
                                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '30px', fontSize: '0.85rem' }}>{item.start_date ? formatToAppDate(item.start_date) : ''}</div>
                                                ) : (
                                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            name={`start_date_${index}`}
                                                            value={dateTypingValues[`start_date_${index}`] !== undefined ? dateTypingValues[`start_date_${index}`] : formatToAppDate(item.start_date)}
                                                            placeholder="DD-MM-YYYY"
                                                            className="ae-input"
                                                            style={{ width: '100%', paddingRight: '28px', fontSize: '0.85rem', height: '30px' }}
                                                            onChange={(e) => handleDateInputChange('start_date', e.target.value, true, index)}
                                                            onBlur={() => handleDateBlur('start_date', true, index)}
                                                            onFocus={() => handleDateFocus('start_date', true, index)}
                                                        />
                                                        <input
                                                            type="date"
                                                            id={`start-date-picker-${index}`}
                                                            name={`start_date_${index}`}
                                                            value={item.start_date || ''}
                                                            onChange={(e) => handleItemChange(index, 'start_date', e.target.value)}
                                                            tabIndex={-1}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                opacity: 0,
                                                                cursor: 'pointer',
                                                                pointerEvents: 'none'
                                                            }}
                                                        />
                                                        <Calendar 
                                                            size={14} 
                                                            focusable="false" 
                                                            style={{ 
                                                                position: 'absolute', 
                                                                right: '8px', 
                                                                color: '#718096', 
                                                                cursor: 'pointer' 
                                                            }} 
                                                            onClick={() => {
                                                                const picker = document.getElementById(`start-date-picker-${index}`) as HTMLInputElement;
                                                                if (picker) picker.showPicker?.();
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '6px 4px', position: 'relative', verticalAlign: 'middle' }}>
                                                {isSubmitted ? (
                                                    <div className="ae-input !bg-gray-50 flex items-center" style={{ minHeight: '30px', fontSize: '0.85rem' }}>{item.end_date ? formatToAppDate(item.end_date) : ''}</div>
                                                ) : (
                                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            name={`end_date_${index}`}
                                                            value={dateTypingValues[`end_date_${index}`] !== undefined ? dateTypingValues[`end_date_${index}`] : formatToAppDate(item.end_date)}
                                                            placeholder="DD-MM-YYYY"
                                                            className="ae-input"
                                                            style={{ width: '100%', paddingRight: '28px', fontSize: '0.85rem', height: '30px' }}
                                                            onChange={(e) => handleDateInputChange('end_date', e.target.value, true, index)}
                                                            onBlur={() => handleDateBlur('end_date', true, index)}
                                                            onFocus={() => handleDateFocus('end_date', true, index)}
                                                        />
                                                        <input
                                                            type="date"
                                                            id={`end-date-picker-${index}`}
                                                            name={`end_date_${index}`}
                                                            value={item.end_date || ''}
                                                            onChange={(e) => handleItemChange(index, 'end_date', e.target.value)}
                                                            tabIndex={-1}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                opacity: 0,
                                                                cursor: 'pointer',
                                                                pointerEvents: 'none'
                                                            }}
                                                        />
                                                        <Calendar 
                                                            size={14} 
                                                            focusable="false" 
                                                            style={{ 
                                                                position: 'absolute', 
                                                                right: '8px', 
                                                                color: '#718096', 
                                                                cursor: 'pointer' 
                                                            }} 
                                                            onClick={() => {
                                                                const picker = document.getElementById(`end-date-picker-${index}`) as HTMLInputElement;
                                                                if (picker) picker.showPicker?.();
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'center', minWidth: '80px', verticalAlign: 'middle' }}>
                                                <div style={{ width: '70px', margin: '0 auto' }}>
                                                    <input
                                                        type="number"
                                                        value={item.qty ?? ''}
                                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                        className="ae-input"
                                                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600, height: '30px' }}
                                                        min="1"
                                                        placeholder="0"
                                                        disabled={isSubmitted}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', minWidth: '130px', verticalAlign: 'middle' }}>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '120px' }}>
                                                    <span style={{ position: 'absolute', left: '8px', color: '#718096', fontSize: '0.85rem', fontWeight: 600 }}>{getCurrencySymbol(salesOrder.currency)}</span>
                                                    <input
                                                        type="number"
                                                        value={item.rate ?? ''}
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        className="ae-input"
                                                        style={{ width: '100%', padding: '4px 8px 4px 20px', fontSize: '0.85rem', fontWeight: 600, height: '30px' }}
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0"
                                                        disabled={isSubmitted}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'center', minWidth: '80px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', width: '80px', margin: '0 auto', border: '1px solid #E0E6ED', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                                                    <input
                                                        type="number"
                                                        value={item.discount_percent ?? ''}
                                                        onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                                                        className="ae-no-spinner"
                                                        style={{ width: '100%', padding: '4px 2px 4px 12px', fontSize: '0.85rem', color: '#C53030', textAlign: 'center', fontWeight: 600, height: '30px', border: 'none', outline: 'none', background: 'transparent' }}
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        placeholder="0"
                                                        disabled={isSubmitted}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab' && !e.shiftKey && index === salesOrder.items.length - 1) {
                                                                // Check if current row is empty (ignore default type)
                                                                const isEmpty = !item.product_name && !item.description && (!item.qty || item.qty === '0') && (!item.rate || item.rate === '0');

                                                                if (isEmpty) {
                                                                    return;
                                                                }

                                                                e.preventDefault();
                                                                handleAddItem();
                                                                setTimeout(() => {
                                                                    const table = (e.target as HTMLElement).closest('table');
                                                                    const rows = table?.querySelectorAll('tbody tr');
                                                                    const lastRow = rows?.[rows.length - 1];
                                                                    if (lastRow) {
                                                                        // Focus the first SearchableDropdown input or the Product name textarea
                                                                        const targetInput = lastRow.querySelector('input, textarea');
                                                                        if (targetInput instanceof HTMLElement) {
                                                                            targetInput.focus();
                                                                        }
                                                                    }
                                                                }, 100);
                                                            }
                                                        }}
                                                    />
                                                    <span style={{ padding: '0 8px 0 0', color: '#C53030', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, lineHeight: '30px', background: 'transparent' }}>%</span>
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
                                                            <Trash2 size={16} focusable="false" />
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


                    {/* 4. Source Document Section */}
                    {salesOrder.po_file_url && (
                        <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                            <SectionHeader title="Source Document" />
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                background: 'rgba(255, 107, 0, 0.05)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 107, 0, 0.2)',
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
                                    <FileText size={18} style={{ color: 'var(--ae-orange)', margin: '0 auto' }} />
                                </div>

                                <span style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: 'var(--ae-orange)',
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
                                background: activeAction === 'draft' ? 'var(--theme-primary)' : 'transparent',
                                color: activeAction === 'draft' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeAction === 'draft' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={() => setActiveAction('draft')}
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
                                background: activeAction === 'submit' ? 'var(--theme-primary)' : 'transparent',
                                color: activeAction === 'submit' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeAction === 'submit' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={() => setActiveAction('submit')}
                        >
                            <PlusCircle size={16} />
                            <span>Submit for Approval</span>
                        </button>
                    </>
                )}

                {(salesOrder.status === 'PENDING_APPROVAL' || salesOrder.status === 'SUBMITTED') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                background: activeAction === 'approve' ? '#00ad48' : '#00C853',
                                color: 'white',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                boxShadow: activeAction === 'approve' ? '0 4px 12px rgba(0, 200, 83, 0.3)' : '0 2px 8px rgba(0, 200, 83, 0.2)'
                            }}
                            onMouseEnter={() => setActiveAction('approve')}
                        >
                            <CheckCircle size={16} />
                            <span>Approve</span>
                        </button>

                        <button
                            onClick={() => setShowRevertModal(true)}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                border: activeAction === 'revert' ? '1px solid #BB4D00' : '1px solid #E2E8F0',
                                background: activeAction === 'revert' ? 'rgba(187, 77, 0, 0.05)' : 'white',
                                color: activeAction === 'revert' ? '#BB4D00' : '#4A5568',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={() => setActiveAction('revert')}
                        >
                            <RotateCcw size={15} />
                            <span>Revert</span>
                        </button>

                        <button
                            onClick={() => setShowRejectModal(true)}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                border: activeAction === 'reject' ? '1px solid #E53E3E' : '1px solid #E2E8F0',
                                background: activeAction === 'reject' ? 'rgba(229, 62, 62, 0.05)' : 'white',
                                color: activeAction === 'reject' ? '#E53E3E' : '#4A5568',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={() => setActiveAction('reject')}
                        >
                            <XCircle size={15} />
                            <span>Reject</span>
                        </button>
                    </div>
                )}

                <button
                    onClick={onBack}
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
                        background: activeAction === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                        color: activeAction === 'cancel' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeAction === 'cancel' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                    }}
                    onMouseEnter={() => setActiveAction('cancel')}
                >
                    <X size={16} />
                    <span>Cancel</span>
                </button>
            </div>

            {/* Branded Action Modal (For Reject/Revert) */}
            {(showRejectModal || showRevertModal) && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(12px)',
                    padding: '24px',
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '400px',
                        borderRadius: '24px',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.3)',
                        overflow: 'hidden',
                        position: 'relative',
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            background: showRejectModal ? '#E53E3E' : '#BB4D00',
                            padding: '28px 24px 24px',
                            position: 'relative',
                        }}>
                            <button
                                onClick={() => { setShowRejectModal(false); setShowRevertModal(false); }}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'transparent',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'white',
                                    opacity: 0.7,
                                }}
                            >
                                <X size={16} strokeWidth={3} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {showRejectModal ? <XCircle size={18} color="white" /> : <RotateCcw size={18} color="white" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 800,
                                        color: 'white',
                                        margin: '0 0 4px 0',
                                        lineHeight: 1.2
                                    }}>{showRejectModal ? 'Reject Sales Order' : 'Revert Sales Order'}</h3>
                                    <p style={{
                                        margin: 0,
                                        color: 'rgba(255,255,255,0.95)',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        lineHeight: 1.4
                                    }}>
                                        {showRejectModal ? 'Provide a reason for rejecting this order.' : 'Provide a reason for reverting this order.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div className="ae-grid-responsive-5" style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    marginBottom: '8px'
                                }}>{showRejectModal ? 'Rejection Reason' : 'Revert Reason'}</label>
                                <AutoExpandingTextarea
                                    className="ae-input"
                                    value={showRejectModal ? rejectComment : revertComment}
                                    onChange={e => showRejectModal ? setRejectComment(e.target.value) : setRevertComment(e.target.value)}
                                    placeholder="Type your reason here..."
                                    autoFocus
                                    style={{
                                        minHeight: '90px',
                                        padding: '12px 16px',
                                        background: '#f8fafc',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    onClick={() => { setShowRejectModal(false); setShowRevertModal(false); }}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '12px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >Cancel</button>
                                <button
                                    onClick={showRejectModal ? handleReject : handleRevert}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '12px',
                                        background: showRejectModal ? '#E53E3E' : '#BB4D00',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >{showRejectModal ? 'Reject' : 'Revert'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default SalesOrderForm;
