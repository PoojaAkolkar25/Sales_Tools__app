import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { Plus, Search, FileText, CheckCircle2, Clock, Filter, Receipt } from 'lucide-react';
import MilestoneForm from './MilestoneForm';

const MilestoneDashboard: React.FC = () => {
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterSO, setFilterSO] = useState('');
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchMilestones();
    }, []);

    const fetchMilestones = async () => {
        setLoading(true);
        try {
            // Fetch all milestones (filtering can be added later via API params)
            const response = await api.get('/milestones/');
            setMilestones(response.data);
        } catch (error) {
            showNotification('Error fetching milestones', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvoice = async (milestoneId: number) => {
        if (!window.confirm('Are you sure you want to create an invoice for this milestone?')) return;

        try {
            await api.post(`/milestones/${milestoneId}/create_invoice/`);
            showNotification('Invoice created successfully', 'success');
            fetchMilestones();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to create invoice', 'error');
        }
    };

    const filteredMilestones = milestones.filter(m => {
        const customerMatch = m.sales_order_details?.customer_name?.toLowerCase().includes(filterCustomer.toLowerCase()) ||
            (filterCustomer === '');
        const soMatch = m.sales_order_details?.so_number?.toLowerCase().includes(filterSO.toLowerCase()) ||
            (filterSO === '');
        return customerMatch && soMatch;
    });

    if (showForm) {
        return <MilestoneForm onBack={() => { setShowForm(false); fetchMilestones(); }} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-[#1a1f36] tracking-tight">Milestone Management</h1>
                    <p className="text-sm font-medium text-[#718096] mt-1">Track billing milestones and generate invoices</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="ae-btn-primary flex items-center gap-2 shadow-lg shadow-[#FF6B00]/20"
                >
                    <Plus size={18} /> New Milestone Plan
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-[#E0E6ED] shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-[#718096] tracking-widest mb-1 block">Filter by Customer</label>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
                        <input
                            type="text"
                            placeholder="Customer Name..."
                            value={filterCustomer}
                            onChange={(e) => setFilterCustomer(e.target.value)}
                            className="ae-input pl-9"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-[#718096] tracking-widest mb-1 block">Filter by Sales Order</label>
                    <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" />
                        <input
                            type="text"
                            placeholder="SO Number..."
                            value={filterSO}
                            onChange={(e) => setFilterSO(e.target.value)}
                            className="ae-input pl-9"
                        />
                    </div>
                </div>
                <div className="flex-none pb-1">
                    <button className="ae-btn-secondary !p-2">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-[#718096] font-medium animate-pulse">Loading milestone data...</div>
            ) : filteredMilestones.length === 0 ? (
                <div className="text-center py-20 bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-[#E2E8F0]">
                    <div className="w-16 h-16 bg-[#EDF2F7] rounded-full flex items-center justify-center mx-auto mb-4 text-[#A0AEC0]">
                        <Clock size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-[#2D3748]">No milestones found</h3>
                    <p className="text-sm text-[#718096] mt-1">Create a new milestone plan to get started.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-[#E0E6ED] shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E0E6ED]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#718096] tracking-widest">Milestone</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#718096] tracking-widest">Sales Order</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#718096] tracking-widest">Due Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#718096] tracking-widest text-right">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#718096] tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#718096] tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E6ED]">
                            {filteredMilestones.map((milestone) => (
                                <tr key={milestone.id} className="hover:bg-[#FDFDFD] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#2D3748]">{milestone.milestone_no}</div>
                                        <div className="text-xs text-[#718096] truncate max-w-[200px]" title={milestone.description}>{milestone.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#3182CE]">{milestone.sales_order_details?.so_number}</div>
                                        <div className="text-xs text-[#718096]">{milestone.sales_order_details?.customer_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-[#4A5568]">{new Date(milestone.due_date).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-[#A0AEC0] uppercase font-bold tracking-wider">Due</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-[#2D3748]">{parseFloat(milestone.amount).toLocaleString()}</div>
                                        {milestone.invoice_details && (
                                            <div className="text-[10px] text-green-600 font-bold mt-1">INV: {milestone.invoice_details.invoice_no}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {milestone.status === 'INVOICED' ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wide border border-green-200">
                                                <CheckCircle2 size={12} /> Invoiced
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wide border border-amber-200">
                                                <Clock size={12} /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {milestone.status !== 'INVOICED' && (
                                            <button
                                                onClick={() => handleCreateInvoice(milestone.id)}
                                                className="ae-btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-2 ml-auto hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                                            >
                                                <Receipt size={14} /> Create Invoice
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MilestoneDashboard;
