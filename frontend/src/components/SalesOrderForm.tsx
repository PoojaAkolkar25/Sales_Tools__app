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
    AlertCircle
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
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchInitialData();
        if (id) {
            fetchSalesOrderDetails();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [custRes, prodRes] = await Promise.all([
                api.get('/customers/'),
                api.get('/products/')
            ]);
            setCustomers(custRes.data);
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

        if (field === 'qty' || field === 'rate' || field === 'tax' || field === 'discount') {
            const qty = parseFloat(newItems[index].qty) || 0;
            const rate = parseFloat(newItems[index].rate) || 0;
            newItems[index].amount = qty * rate;
        }

        setSalesOrder((prev: any) => ({ ...prev, items: newItems }));
    };

    const handleAddItem = () => {
        setSalesOrder((prev: any) => ({
            ...prev,
            items: [...prev.items, { product: '', description: '', qty: 1, rate: 0, tax: 0, discount: 0, amount: 0 }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = salesOrder.items.filter((_: any, i: number) => i !== index);
        setSalesOrder((prev: any) => ({ ...prev, items: newItems }));
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
                                <input type="text" value={salesOrder.so_number || 'Auto-generated on Submit'} className="ae-input !bg-[#F7FAFC] !cursor-not-allowed font-black" disabled />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Customer *</label>
                                <select
                                    name="customer"
                                    value={salesOrder.customer || ''}
                                    onChange={handleInputChange}
                                    className={`ae-input font-bold ${!salesOrder.customer ? 'border-[#FFB7B7] bg-[#FFF5F5] animate-pulse' : ''}`}
                                    disabled={isSubmitted}
                                >
                                    <option value="">-- Match Customer to Master --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {!salesOrder.customer && <span className="text-[10px] text-red-500 font-bold tracking-tighter mt-1 italic block">Auto-extraction could not match name automatically.</span>}
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

                    {/* Line Items Panel */}
                    <div className="section-panel !p-0">
                        <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] rounded-t-2xl flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className="text-[#FF6B00]" />
                                <h3 className="font-extrabold text-[#2D3748] uppercase tracking-tight text-sm">Product Line Items</h3>
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
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-28">Tax</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-28">Discount</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-32 text-right">Amount</th>
                                        {!isSubmitted && <th className="px-4 py-3 w-10"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E0E6ED]">
                                    {salesOrder.items.map((item: any, index: number) => (
                                        <tr key={index} className="group hover:bg-[#FDFDFD]">
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
                                                    value={item.tax || 0}
                                                    onChange={(e) => handleItemChange(index, 'tax', e.target.value)}
                                                    className="w-full p-2 border border-[#E0E6ED] rounded-lg text-sm font-bold bg-white"
                                                    disabled={isSubmitted}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={item.discount || 0}
                                                    onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                    className="w-full p-2 border border-[#E0E6ED] rounded-lg text-sm font-bold bg-white text-red-600"
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
                                    <tr className="bg-[#f1f5f9] font-black">
                                        <td colSpan={4} className="px-4 py-4 text-right text-[#4A5568] uppercase text-xs">Total Order Value</td>
                                        <td className="px-4 py-4 text-right text-[#2D3748] text-lg">
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
                            <button className="ae-btn-secondary !w-auto !px-6 !py-2 text-[10px] font-black uppercase tracking-widest">View PDF Viewer</button>
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
                                <li className={`flex items-center gap-2 text-[10px] font-bold ${salesOrder.customer ? 'text-green-600' : 'text-[#718096]'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${salesOrder.customer ? 'bg-green-500' : 'bg-[#E0E6ED]'}`}></div>
                                    Customer Mapped to Master
                                </li>
                                <li className={`flex items-center gap-2 text-[10px] font-bold ${salesOrder.po_number ? 'text-green-600' : 'text-[#718096]'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${salesOrder.po_number ? 'bg-green-500' : 'bg-[#E0E6ED]'}`}></div>
                                    Valid PO Number Extracted
                                </li>
                                <li className={`flex items-center gap-2 text-[10px] font-bold ${salesOrder.items?.every((i: any) => i.product) ? 'text-green-600' : 'text-[#718096]'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${salesOrder.items?.every((i: any) => i.product) ? 'bg-green-500' : 'bg-[#E0E6ED]'}`}></div>
                                    All Items Mapped to Master
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
