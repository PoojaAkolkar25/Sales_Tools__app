import React, { useState, useEffect } from 'react';
import {
    Save,
    ChevronLeft,
    Clock,
    ShoppingBag,
    Truck,
    MapPin,
    FileText,
    Plus,
    X,
    CheckCircle2,
    Briefcase,
    AlertCircle,
    Link as LinkIcon
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
            const [prodRes] = await Promise.all([
                api.get('/products/')
            ]);
            setProducts(prodRes.data);
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
        setSaving(true);
        try {
            await api.patch(`/sales-orders/${id}/`, salesOrder);
            showNotification('Sales Order updated successfully', 'success');
            onSave();
        } catch (error) {
            showNotification('Failed to update Sales Order', 'error');
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
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E0E6ED] shadow-sm">
                <button onClick={onBack} className="flex items-center gap-2 text-[#718096] font-bold text-sm hover:text-[#2D3748] transition-colors">
                    <ChevronLeft size={20} /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${salesOrder.status === 'SUBMITTED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {salesOrder.status} ORDER
                    </span>
                    {!isSubmitted && (
                        <>
                            <button onClick={handleSave} disabled={saving} className="ae-btn-secondary !w-auto !py-1.5 !px-6 shadow-sm">
                                {saving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />} Save Draft
                            </button>
                            <button onClick={handleSubmit} disabled={saving} className="ae-btn-primary !w-auto !py-1.5 !px-8 shadow-lg shadow-[#FF6B00]/20 flex items-center gap-2">
                                <CheckCircle2 size={16} /> Submit Order
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Form Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Core Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Basic Info Panel */}
                    <div className="section-panel !p-0">
                        <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] rounded-t-2xl flex items-center gap-2">
                            <Briefcase size={18} className="text-[#3182CE]" />
                            <h3 className="font-extrabold text-[#2D3748] uppercase tracking-tight text-sm">Basic Order Information</h3>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Sales Order Number</label>
                                <input
                                    type="text"
                                    value={salesOrder.so_number || 'Auto-generated on Submit'}
                                    className="ae-input !bg-[#F7FAFC] !cursor-not-allowed"
                                    style={{ fontWeight: 700, color: 'rgb(0, 102, 204)' }}
                                    disabled
                                />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Customer Name</label>
                                {salesOrder.customer ? (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 bg-green-50 p-2 rounded border border-green-200">
                                            <CheckCircle2 size={16} className="text-green-600" />
                                            <span className="text-sm font-bold text-green-900">{salesOrder.customer_detail?.name || 'Mapped Customer'}</span>
                                        </div>
                                        <span className="text-[10px] text-green-600 font-bold ml-1">Mapped to Master Data</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="text"
                                            value={salesOrder.customer_name || 'N/A'}
                                            className="ae-input font-black !bg-red-50 !border-red-200 !text-red-900"
                                            readOnly
                                        />
                                        <div className="flex items-center gap-1 text-red-600 mt-1">
                                            <AlertCircle size={12} />
                                            <span className="text-[10px] font-bold">Not Matched with Master Data</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Customer Code</label>
                                <input name="customer_code" type="text" value={salesOrder.customer_code || ''} onChange={handleInputChange} className="ae-input font-bold" disabled={isSubmitted} placeholder="Enter Customer Code" />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Purchase Order Number *</label>
                                <input name="po_number" type="text" value={salesOrder.po_number || ''} onChange={handleInputChange} className="ae-input font-bold" disabled={isSubmitted} />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Purchase Order Date</label>
                                <input name="po_date" type="date" value={salesOrder.po_date || ''} onChange={handleInputChange} className="ae-input" disabled={isSubmitted} />
                            </div>
                        </div>
                    </div>

                    {/* Estimate Linking Panel */}
                    {salesOrder.customer && (
                        <div className="section-panel !p-0">
                            <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] rounded-t-2xl flex items-center gap-2">
                                <LinkIcon size={18} className="text-[#3182CE]" />
                                <h3 className="uppercase tracking-tight text-sm" style={{ fontWeight: 700, color: 'rgb(0, 102, 204)' }}>Link Approved Estimates</h3>
                            </div>
                            <div className="p-0">
                                {availableEstimates.length === 0 ? (
                                    <div className="p-4 text-sm text-[#718096] italic">No approved estimates found for this customer.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#F7FAFC] text-xs font-bold text-[#4A5568] uppercase tracking-wider border-b border-[#E2E8F0]">
                                                <th className="p-3 w-10">
                                                    {/* Header Checkbox (Optional: Implement Select All if needed, currently skipped for simplicity) */}
                                                </th>
                                                <th className="p-3">Est Date</th>
                                                <th className="p-3">Est Number</th>
                                                <th className="p-3">Description</th>
                                                <th className="p-3 text-right">Qty</th>
                                                <th className="p-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {availableEstimates.map(est => {
                                                const totalQty = est.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.qty) || 0), 0) || 0;
                                                const description = est.description_memo || est.project_name || '—';
                                                const isSelected = salesOrder.estimates?.includes(est.id) || false;

                                                return (
                                                    <tr
                                                        key={est.id}
                                                        className={`border-b border-[#E2E8F0] last:border-0 hover:bg-blue-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                                                        onClick={() => {
                                                            const current = salesOrder.estimates || [];
                                                            if (!isSelected) {
                                                                setSalesOrder({ ...salesOrder, estimates: [...current, est.id] });
                                                            } else {
                                                                setSalesOrder({ ...salesOrder, estimates: current.filter((id: number) => id !== est.id) });
                                                            }
                                                        }}
                                                    >
                                                        <td className="p-3">
                                                            <input
                                                                type="checkbox"
                                                                className="ae-checkbox"
                                                                checked={isSelected}
                                                                readOnly // Handled by row click
                                                                disabled={isSubmitted}
                                                            />
                                                        </td>
                                                        <td className="p-3 text-sm font-medium text-[#2D3748]">
                                                            {new Date(est.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-3 text-sm font-bold text-[#3182CE]">
                                                            {est.estimate_id}
                                                            <span className="ml-2 text-[10px] text-[#718096] bg-[#EDF2F7] px-1.5 py-0.5 rounded">v{est.version}</span>
                                                        </td>
                                                        <td className="p-3 text-sm text-[#4A5568] truncate max-w-[200px]" title={description}>
                                                            {description}
                                                        </td>
                                                        <td className="p-3 text-sm font-bold text-[#2D3748] text-right">
                                                            {totalQty}
                                                        </td>
                                                        <td className="p-3 text-sm font-bold text-[#38A169] text-right">
                                                            ${parseFloat(est.total_price).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Line Items Panel */}
                    <div className="section-panel !p-0">
                        <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] rounded-t-2xl flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className="text-[#FF6B00]" />
                                <h3 className="uppercase tracking-tight text-sm" style={{ fontWeight: 700, color: 'rgb(0, 102, 204)' }}>Product Line Items</h3>
                            </div>
                            {!isSubmitted && (
                                <button onClick={handleAddItem} className="text-xs font-black text-[#3182CE] uppercase hover:underline flex items-center gap-1">
                                    <Plus size={14} /> Add Manual Row
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#f8fafc] text-left border-b border-[#E0E6ED]">
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase">Product</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase">Description</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-20">Qty</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-32">Rate</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-24">Disc (%)</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-32">Taxable Amt</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-24">Tax (%)</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-32 text-right">Total</th>
                                        {!isSubmitted && <th className="px-4 py-3 w-10"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E0E6ED]">
                                    {salesOrder.items.map((item: any, index: number) => (
                                        <tr key={index} className="group hover:bg-[#FDFDFD}">
                                            <td className="px-4 py-3 align-top min-w-[200px]">
                                                <select
                                                    value={item.product || ''}
                                                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                                    className={`w-full p-2 border rounded-lg text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#3182CE]/10 ${!item.product ? 'border-amber-200' : 'border-[#E0E6ED]'}`}
                                                    disabled={isSubmitted}
                                                >
                                                    <option value="">Select Product...</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                {!item.product && <span className="text-[9px] text-amber-600 font-black tracking-widest uppercase mt-1 block">Unmapped Item</span>}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <textarea
                                                    value={item.description || ''}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="w-full p-2 border border-[#E0E6ED] rounded-lg text-sm bg-white min-h-[40px] outline-none"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                    className="w-full p-2 border border-[#E0E6ED] rounded-lg text-sm font-bold bg-white text-center"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                    className="w-full p-2 border border-[#E0E6ED] rounded-lg text-sm font-bold bg-white"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={item.discount_percent || 0}
                                                    onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                                                    className="w-full p-2 border border-[#E0E6ED] rounded-lg text-sm font-bold bg-white text-red-600"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top whitespace-nowrap pt-5 min-w-[100px]">
                                                <span className="text-sm font-bold text-[#4A5568]">
                                                    {((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0) - (parseFloat(item.discount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={item.tax_percent || 0}
                                                    onChange={(e) => handleItemChange(index, 'tax_percent', e.target.value)}
                                                    className="w-full p-2 border border-[#E0E6ED] rounded-lg text-sm font-bold bg-white"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top text-right whitespace-nowrap pt-5">
                                                <span className="text-sm font-black text-[#1a1f36]">
                                                    {salesOrder.currency} {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            {!isSubmitted && (
                                                <td className="px-4 py-3 align-top text-right pt-5">
                                                    <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={18} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#f1f5f9] font-black text-[#2D3748]">
                                        <td colSpan={5} className="px-4 py-4 text-right text-[#4A5568] uppercase text-xs tracking-widest">Total Order Value</td>
                                        <td className="px-4 py-4 text-right text-lg border-l border-white">
                                            {salesOrder.currency} {parseFloat(salesOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        {!isSubmitted && <td></td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Meta & Logistics */}
                <div className="space-y-6">


                    {/* Logistics Panel */}
                    <div className="section-panel !p-0">
                        <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] flex items-center gap-2">
                            <Truck size={18} className="text-purple-500" />
                            <h3 className="font-extrabold text-[#2D3748] uppercase tracking-tight text-sm">Logistics & Currency</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Currency</label>
                                <select name="currency" value={salesOrder.currency} onChange={handleInputChange} className="ae-input font-bold" disabled={isSubmitted}>
                                    <option value="INR">INR - Indian Rupee</option>
                                    <option value="USD">USD - US Dollar</option>
                                </select>
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Order Date</label>
                                <input name="order_date" type="date" value={salesOrder.order_date || ''} onChange={handleInputChange} className="ae-input" disabled={isSubmitted} />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70 text-purple-600">Expected Delivery Date</label>
                                <input name="delivery_date" type="date" value={salesOrder.delivery_date || ''} onChange={handleInputChange} className="ae-input border-purple-200" disabled={isSubmitted} />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70 flex items-center gap-2">
                                    <MapPin size={12} /> Billing Address
                                </label>
                                <textarea name="billing_address" value={salesOrder.billing_address || ''} onChange={handleInputChange} className="ae-input text-xs" rows={3} disabled={isSubmitted} />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70 flex items-center gap-2">
                                    <MapPin size={12} /> Shipping Address
                                </label>
                                <textarea name="shipping_address" value={salesOrder.shipping_address || ''} onChange={handleInputChange} className="ae-input text-xs" rows={3} disabled={isSubmitted} />
                            </div>
                        </div>
                    </div>

                    {/* Validation Hints */}

                    {/* Source Document Panel (Moved to end) */}
                    <div className="section-panel !p-0 overflow-hidden">
                        <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] flex items-center gap-2">
                            <FileText size={18} className="text-red-500" />
                            <h3 className="font-extrabold text-[#2D3748] uppercase tracking-tight text-sm">Source Document</h3>
                        </div>
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                                <FileText size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-[#1a1f36] uppercase">Original PO PDF</p>
                                <p className="text-[10px] text-[#718096] font-medium truncate mt-1">{salesOrder.po_file_name || 'PurchaseOrder.pdf'}</p>
                            </div>
                            <button
                                onClick={handleViewPDF}
                                className="ae-btn-secondary !w-auto !px-6 !py-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                View PDF Viewer
                            </button>
                        </div>
                    </div>

                    {/* Validation Hints (Moved to end) */}
                    {!isSubmitted && (
                        <div className="bg-[#FFF8F0] p-6 rounded-2xl border border-[#FFEBCB] space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 text-[#C05621]">
                                <AlertCircle size={20} />
                                <h4 className="font-black text-xs uppercase tracking-tight">Review Checklist</h4>
                            </div>
                            <ul className="space-y-2">
                                <li className={`flex items-center gap-2 text-[10px] font-bold text-green-600`}>
                                    <div className={`w-1.5 h-1.5 rounded-full bg-green-500`}></div>
                                    Customer Name Extracted
                                </li>
                                <li className={`flex items-center gap-2 text-[10px] font-bold ${salesOrder.po_number ? 'text-green-600' : 'text-[#718096]'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${salesOrder.po_number ? 'bg-green-500' : 'bg-[#E0E6ED]'}`}></div>
                                    Valid PO Number Extracted
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesOrderForm;
