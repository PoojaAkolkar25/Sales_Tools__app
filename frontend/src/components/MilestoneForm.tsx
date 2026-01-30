import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { ChevronLeft, Plus, X, Save, AlertCircle, Info, Calendar } from 'lucide-react';

interface MilestoneFormProps {
    onBack: () => void;
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({ onBack }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [selectedSO, setSelectedSO] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (selectedCustomer) {
            fetchSalesOrders(selectedCustomer.id);
        } else {
            setSalesOrders([]);
            setSelectedSO(null);
        }
    }, [selectedCustomer]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers/');
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers', error);
        }
    };

    const fetchSalesOrders = async (customerId: number) => {
        setLoading(true);
        try {
            // Only fetch Submitted (Active) Sales Orders
            const response = await api.get(`/sales-orders/?customer=${customerId}&status_filter=SUBMITTED`);
            // Note: Check backend filtering support in SalesOrderViewSet. 
            // If not supported, I might need to filter client side or update backend. 
            // update: 'status' field exists.
            setSalesOrders(response.data.filter((so: any) => so.status === 'SUBMITTED' || so.so_number));
        } catch (error) {
            console.error('Error fetching sales orders', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerChange = (customerId: string) => {
        const customer = customers.find(c => c.id.toString() === customerId);
        setSelectedCustomer(customer || null);
        setSelectedSO(null);
        setMilestones([]);
    };

    const handleSOChange = (soId: string) => {
        const so = salesOrders.find(s => s.id.toString() === soId);
        setSelectedSO(so || null);
        setMilestones([]); // Reset milestones when SO changes? Or maybe auto-create one?
        if (so) {
            // Initialize with one empty milestone
            setMilestones([{
                milestone_no: 'M1',
                period_from: so.order_date,
                period_to: so.delivery_date,
                due_date: so.delivery_date,
                description: 'Initial Milestone',
                percentage: 100,
                qty: 1,
                rate: parseFloat(so.total_amount),
                amount: parseFloat(so.total_amount)
            }]);
        }
    };

    const handleMilestoneChange = (index: number, field: string, value: any) => {
        const newMilestones = [...milestones];
        newMilestones[index] = { ...newMilestones[index], [field]: value };

        // Auto-calculate amount if rate/qty changes (though simpler to just use amount directly for milestones)
        if (field === 'amount') {
            // Update percentage?
            if (selectedSO && parseFloat(selectedSO.total_amount) > 0) {
                newMilestones[index].percentage = ((parseFloat(value) / parseFloat(selectedSO.total_amount)) * 100).toFixed(2);
            }
        } else if (field === 'percentage') {
            if (selectedSO) {
                newMilestones[index].amount = (parseFloat(selectedSO.total_amount) * (parseFloat(value) / 100)).toFixed(2);
            }
        }

        setMilestones(newMilestones);
    };

    const handleAddMilestone = () => {
        const nextNo = milestones.length + 1;
        setMilestones([...milestones, {
            milestone_no: `M${nextNo}`,
            period_from: '',
            period_to: '',
            due_date: '',
            description: '',
            percentage: 0,
            qty: 1,
            rate: 0,
            amount: 0
        }]);
    };

    const handleRemoveMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    };

    const handleSave = async () => {
        if (!selectedSO) return;

        const total = calculateTotal();
        if (total > parseFloat(selectedSO.total_amount)) {
            showNotification(`Total milestone amount (${total}) exceeds Sales Order value (${selectedSO.total_amount})`, 'error');
            return;
        }

        setSaving(true);
        try {
            // Save each milestone sequentially
            for (const m of milestones) {
                await api.post('/milestones/', {
                    sales_order: selectedSO.id,
                    ...m
                });
            }
            showNotification('Milestones saved successfully', 'success');
            onBack();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to save milestones', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E0E6ED] shadow-sm">
                <button onClick={onBack} className="flex items-center gap-2 text-[#718096] font-bold text-sm hover:text-[#2D3748] transition-colors">
                    <ChevronLeft size={20} /> Back
                </button>
                <h2 className="font-extrabold text-[#2D3748] uppercase tracking-tight text-sm">Define Milestones</h2>
                <button onClick={handleSave} disabled={saving || !selectedSO} className="ae-btn-primary flex items-center gap-2">
                    {saving ? <div className="animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent"></div> : <Save size={16} />}
                    Save Plan
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Context */}
                <div className="space-y-6">
                    <div className="section-panel !p-0">
                        <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] rounded-t-2xl">
                            <h3 className="font-extrabold text-[#2D3748] uppercase tracking-tight text-sm">Target Sales Order</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Customer</label>
                                <select
                                    className="ae-input font-bold"
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                    value={selectedCustomer?.id || ''}
                                >
                                    <option value="">Select Customer...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="ae-input-group">
                                <label className="ae-label uppercase !text-[10px] tracking-widest !font-black !mb-2 opacity-70">Sales Order</label>
                                <select
                                    className="ae-input font-bold"
                                    onChange={(e) => handleSOChange(e.target.value)}
                                    value={selectedSO?.id || ''}
                                    disabled={!selectedCustomer || loading}
                                >
                                    <option value="">{loading ? 'Loading...' : 'Select Sales Order...'}</option>
                                    {salesOrders.map(so => (
                                        <option key={so.id} value={so.id}>
                                            {so.so_number} - {so.currency} {parseFloat(so.total_amount).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedSO && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                                    <h4 className="font-bold text-blue-900 text-xs uppercase mb-2">Order Summary</h4>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-blue-700">Total Value:</span>
                                        <span className="font-black text-blue-900">{parseFloat(selectedSO.total_amount).toLocaleString()} {selectedSO.currency}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-blue-700">Order Date:</span>
                                        <span className="font-medium text-blue-900">{selectedSO.order_date}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Milestones */}
                <div className="lg:col-span-2">
                    <div className="section-panel !p-0">
                        <div className="bg-[#F8FAFC] p-4 border-b border-[#E0E6ED] rounded-t-2xl flex justify-between items-center">
                            <h3 className="font-extrabold text-[#2D3748] uppercase tracking-tight text-sm">Milestone Breakdown</h3>
                            <button onClick={handleAddMilestone} disabled={!selectedSO} className="text-xs font-black text-[#3182CE] uppercase hover:underline flex items-center gap-1">
                                <Plus size={14} /> Add Milestone
                            </button>
                        </div>

                        {!selectedSO ? (
                            <div className="p-12 text-center text-[#A0AEC0] italic text-sm">Please select a Sales Order to define milestones.</div>
                        ) : (
                            <div className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#f8fafc] border-b border-[#E0E6ED]">
                                            <tr>
                                                <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-16">No.</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase min-w-[200px]">Description</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-32">Due Date</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-20 text-center">%</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-[#718096] uppercase w-32 text-right">Amount</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E0E6ED]">
                                            {milestones.map((milestone, index) => (
                                                <tr key={index} className="group hover:bg-[#FDFDFD]">
                                                    <td className="px-4 py-3 align-top">
                                                        <input
                                                            type="text"
                                                            value={milestone.milestone_no}
                                                            onChange={(e) => handleMilestoneChange(index, 'milestone_no', e.target.value)}
                                                            className="w-full p-2 border border-[#E0E6ED] rounded-lg text-xs font-bold bg-white text-center"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <textarea
                                                            value={milestone.description}
                                                            onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                                                            className="w-full p-2 border border-[#E0E6ED] rounded-lg text-xs bg-white min-h-[38px] resize-none"
                                                            rows={1}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <input
                                                            type="date"
                                                            value={milestone.due_date || ''}
                                                            onChange={(e) => handleMilestoneChange(index, 'due_date', e.target.value)}
                                                            className="w-full p-2 border border-[#E0E6ED] rounded-lg text-xs font-medium bg-white"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <input
                                                            type="number"
                                                            value={milestone.percentage || ''}
                                                            onChange={(e) => handleMilestoneChange(index, 'percentage', e.target.value)}
                                                            className="w-full p-2 border border-[#E0E6ED] rounded-lg text-xs font-bold bg-white text-center text-purple-600"
                                                            placeholder="%"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <input
                                                            type="number"
                                                            value={milestone.amount || ''}
                                                            onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                                                            className="w-full p-2 border border-[#E0E6ED] rounded-lg text-xs font-black bg-white text-right"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 align-top text-center pt-4">
                                                        <button onClick={() => handleRemoveMilestone(index)} className="text-red-300 hover:text-red-500 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-[#f8fafc] border-t border-[#E0E6ED]">
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase text-[#718096] tracking-widest">Total Planned</td>
                                                <td className={`px-4 py-3 text-right font-black text-sm ${calculateTotal() > parseFloat(selectedSO.total_amount) ? 'text-red-600' : 'text-[#2D3748]'}`}>
                                                    {parseFloat(selectedSO.total_amount) > 0 && selectedSO.currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase text-[#718096] tracking-widest">Balance Remaining</td>
                                                <td className="px-4 py-3 text-right font-bold text-xs text-[#718096]">
                                                    {(parseFloat(selectedSO.total_amount) - calculateTotal()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedSO && calculateTotal() !== parseFloat(selectedSO.total_amount) && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-4 text-amber-800 text-xs font-bold">
                            <AlertCircle size={18} />
                            Total milestone value must equal the Sales Order value ({parseFloat(selectedSO.total_amount).toLocaleString()})
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MilestoneForm;
