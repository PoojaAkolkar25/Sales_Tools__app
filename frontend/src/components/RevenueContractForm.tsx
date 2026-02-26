import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, RefreshCcw, DollarSign, FileText } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface RevenueContractFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
}

const REVENUE_TYPES = [
    { value: 'LICENSE_PERIOD', label: 'License subscription on period basis' },
    { value: 'LICENSE_CONSUMPTION', label: 'License subscription on consumption basis' },
    { value: 'LICENSE_PERPETUAL', label: 'License subscription on perpetual basis' },
    { value: 'AMC_PERPETUAL', label: 'Annual maintenance fees against perpetual license' },
    { value: 'PS_FIXED_BID', label: 'Professional services – Fixed Bid' },
    { value: 'PS_TM', label: 'Professional services – Time & Material' }
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'];

const RevenueContractForm: React.FC<RevenueContractFormProps> = ({ id, onBack, onSave }) => {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [deals, setDeals] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        contract_id: '',
        revenue_type: 'LICENSE_PERIOD',
        deal: '',
        customer: '',
        total_amount: '',
        currency: 'USD',
        start_date: '',
        end_date: '',
        notes: '',
        status: 'DRAFT'
    });

    useEffect(() => {
        fetchDeals();
        fetchCustomers();
        if (id) {
            fetchContractDetails();
        }
    }, [id]);

    const fetchDeals = async () => {
        try {
            const response = await api.get('/deals/');
            setDeals(response.data);
        } catch (error) {
            console.error('Error fetching deals', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/finance/customers/');
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers', error);
        }
    };

    const fetchContractDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/revenue/contracts/${id}/`);
            const data = response.data;
            setFormData({
                contract_id: data.contract_id,
                revenue_type: data.revenue_type,
                deal: data.deal || '',
                customer: data.customer || '',
                total_amount: data.total_amount,
                currency: data.currency,
                start_date: data.start_date,
                end_date: data.end_date,
                notes: data.notes || '',
                status: data.status
            });
        } catch (error) {
            showNotification('Error fetching contract details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (id) {
                await api.put(`/revenue/contracts/${id}/`, formData);
                showNotification('Revenue contract updated successfully', 'success');
            } else {
                await api.post('/revenue/contracts/', formData);
                showNotification('Revenue contract created successfully', 'success');
            }
            onSave();
        } catch (error: any) {
            const errorMsg = error.response?.data ? Object.values(error.response.data).join(', ') : 'Error saving contract';
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                            {id ? 'Edit Revenue Contract' : 'New Revenue Contract'}
                        </h2>
                        <p className="text-gray-500 text-sm font-medium">Configure revenue recognition rules and details</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onBack}
                        className="px-6 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2 bg-[#FF6B00] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
                        {id ? 'Update Contract' : 'Create Contract'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Info */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 text-[#FF6B00] rounded-lg">
                            <FileText size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Contract ID (Internal Reference)</label>
                            <input
                                type="text"
                                name="contract_id"
                                value={formData.contract_id}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                placeholder="e.g. REV-2024-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Revenue Type</label>
                            <select
                                name="revenue_type"
                                value={formData.revenue_type}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                            >
                                {REVENUE_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Link to Deal</label>
                            <select
                                name="deal"
                                value={formData.deal}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                            >
                                <option value="">-- Select Deal --</option>
                                {deals.map(deal => (
                                    <option key={deal.id} value={deal.id}>{deal.deal_no} - {deal.deal_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Customer</label>
                            <select
                                name="customer"
                                value={formData.customer}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                            >
                                <option value="">-- Select Customer --</option>
                                {customers.map(cust => (
                                    <option key={cust.id} value={cust.id}>{cust.company_name || cust.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Financials and Period */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <DollarSign size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Financials & Timeline</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Total Amount</label>
                                <input
                                    type="number"
                                    name="total_amount"
                                    value={formData.total_amount}
                                    onChange={handleInputChange}
                                    required
                                    step="0.01"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Currency</label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                                >
                                    {CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Start Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">End Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Current Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                            >
                                <option value="DRAFT">Draft</option>
                                <option value="ACTIVE">Active</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-bold text-gray-600 mb-2">Internal Notes</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                        placeholder="Additional details about the contract or recognition terms..."
                    />
                </div>
            </form>
        </div>
    );
};

export default RevenueContractForm;
