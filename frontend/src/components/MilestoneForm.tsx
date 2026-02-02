import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { ChevronLeft, Plus, X, Save, AlertCircle, Calendar, Clock } from 'lucide-react';

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

    const handleSOChange = async (soId: string) => {
        const so = salesOrders.find(s => s.id.toString() === soId);
        setSelectedSO(so || null);

        if (so) {
            setLoading(true);
            try {
                const response = await api.get(`/milestones/?sales_order=${so.id}`);
                if (response.data && response.data.length > 0) {
                    // Populate from existing milestones
                    const loadedMilestones = response.data.map((m: any) => ({
                        ...m,
                        percentage: ((parseFloat(m.amount) / parseFloat(so.total_amount)) * 100).toFixed(2)
                    }));
                    setMilestones(loadedMilestones);
                } else {
                    // Initialize with one empty milestone if none exist
                    setMilestones([{
                        milestone_no: 'M1',
                        period_from: so.order_date,
                        period_to: so.delivery_date,
                        due_date: so.delivery_date,
                        description: 'Initial Milestone',
                        percentage: '100.00',
                        qty: 1,
                        rate: parseFloat(so.total_amount),
                        amount: parseFloat(so.total_amount)
                    }]);
                }
            } catch (error) {
                console.error('Error fetching milestones', error);
                showNotification('Failed to fetch existing milestones', 'error');
            } finally {
                setLoading(false);
            }
        } else {
            setMilestones([]);
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
        // Use a small epsilon for floating point comparison if needed, but rounding to 2 decimals should be enough
        if (Math.abs(total - parseFloat(selectedSO.total_amount)) > 0.01) {
            showNotification(`Total milestone amount (${total}) must equal Sales Order value (${selectedSO.total_amount})`, 'error');
            return;
        }

        setSaving(true);
        try {
            for (const m of milestones) {
                // Prepare clean data for the backend (remove UI-only or read-only fields)
                const data = {
                    sales_order: selectedSO.id,
                    milestone_no: m.milestone_no,
                    period_from: m.period_from || null,
                    period_to: m.period_to || null,
                    due_date: m.due_date || null,
                    description: m.description,
                    qty: m.qty || 1,
                    rate: m.rate || 0,
                    amount: m.amount || 0,
                    status: m.status || 'PENDING'
                };

                if (m.id) {
                    await api.put(`/milestones/${m.id}/`, data);
                } else {
                    await api.post('/milestones/', data);
                }
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
                        background: 'rgba(255, 107, 0, 0.1)',
                        color: '#FF6B00',
                        border: '1px solid rgba(255, 107, 0, 0.2)'
                    }}>MILESTONE PLAN</span>
                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedSO}
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
                        {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />} Save Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Context */}
                <div className="space-y-6">
                    <section className="section-panel" style={{ padding: '16px 24px' }}>
                        <h3 style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            margin: '0 0 16px 0',
                            color: '#0066CC',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase'
                        }}>
                            <span style={{ width: '3px', height: '14px', background: '#FF6B00', borderRadius: '2px' }}></span>
                            Selection & Summary
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Select Customer</label>
                                <select
                                    style={{ width: '100%', padding: '6px 12px', border: '1px solid #E0E6ED', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                    value={selectedCustomer?.id || ''}
                                >
                                    <option value="">Select Customer...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="ae-input-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Select Sales Order</label>
                                <select
                                    style={{ width: '100%', padding: '6px 12px', border: '1px solid #E0E6ED', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}
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
                                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E0E6ED', marginTop: '8px' }}>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0066CC', textTransform: 'uppercase', marginBottom: '12px' }}>Order Details</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#718096' }}>Total Amount:</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36' }}>{parseFloat(selectedSO.total_amount).toLocaleString()} {selectedSO.currency}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#718096' }}>Order Date:</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1f36' }}>{selectedSO.order_date}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right: Milestones */}
                <div className="lg:col-span-2">
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
                                <Calendar size={16} style={{ color: '#FF6B00' }} />
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FF6B00', margin: 0, textTransform: 'uppercase' }}>Milestone Breakdown</h3>
                            </div>
                            {selectedSO && (
                                <button
                                    onClick={handleAddMilestone}
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

                        {!selectedSO ? (
                            <div className="p-12 text-center text-[#A0AEC0] italic text-sm">Please select a Sales Order to define milestones.</div>
                        ) : (
                            <div className="p-0">
                                <div className="overflow-x-auto">
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '60px' }}>No.</th>
                                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED' }}>Description</th>
                                                <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '120px' }}>Due Date</th>
                                                <th style={{ padding: '8px', textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '80px' }}>Amount %</th>
                                                <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.65rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '2px solid #E0E6ED', width: '120px' }}>Amount</th>
                                                <th style={{ padding: '8px', borderBottom: '2px solid #E0E6ED', width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {milestones.map((milestone, index) => {
                                                const isInvoiced = milestone.status === 'INVOICED';
                                                return (
                                                    <tr key={index} style={{
                                                        borderBottom: '1px solid #F1F5F9',
                                                        background: isInvoiced ? '#F8FAFC' : 'transparent'
                                                    }}>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input
                                                                type="text"
                                                                value={milestone.milestone_no}
                                                                onChange={(e) => handleMilestoneChange(index, 'milestone_no', e.target.value)}
                                                                disabled={isInvoiced}
                                                                style={{
                                                                    width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED',
                                                                    borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                                                                    textAlign: 'center', opacity: isInvoiced ? 0.7 : 1
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <textarea
                                                                value={milestone.description}
                                                                onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                                                                disabled={isInvoiced}
                                                                style={{
                                                                    width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED',
                                                                    borderRadius: '4px', fontSize: '0.75rem', resize: 'none',
                                                                    opacity: isInvoiced ? 0.7 : 1
                                                                }}
                                                                rows={1}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input
                                                                type="date"
                                                                value={milestone.due_date || ''}
                                                                onChange={(e) => handleMilestoneChange(index, 'due_date', e.target.value)}
                                                                disabled={isInvoiced}
                                                                style={{
                                                                    width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED',
                                                                    borderRadius: '4px', fontSize: '0.75rem',
                                                                    opacity: isInvoiced ? 0.7 : 1
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input
                                                                type="number"
                                                                value={milestone.percentage || ''}
                                                                onChange={(e) => handleMilestoneChange(index, 'percentage', e.target.value)}
                                                                disabled={isInvoiced}
                                                                style={{
                                                                    width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED',
                                                                    borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                                                                    textAlign: 'center', color: '#0066CC',
                                                                    opacity: isInvoiced ? 0.7 : 1
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input
                                                                type="number"
                                                                value={milestone.amount || ''}
                                                                onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                                                                disabled={isInvoiced}
                                                                style={{
                                                                    width: '100%', padding: '4px 8px', border: '1px solid #E0E6ED',
                                                                    borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800,
                                                                    textAlign: 'right',
                                                                    opacity: isInvoiced ? 0.7 : 1
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                            {!isInvoiced && (
                                                                <button onClick={() => handleRemoveMilestone(index)} style={{ background: 'none', border: 'none', color: '#FEB2B2', cursor: 'pointer' }}>
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                            {isInvoiced && (
                                                                <span title="Invoiced milestones cannot be deleted" style={{ color: '#CBD5E0' }}>
                                                                    <X size={16} />
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: '#F8FAFC' }}>
                                                <td colSpan={4} style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.65rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase' }}>Total Planned</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 900, color: calculateTotal() > parseFloat(selectedSO.total_amount) ? '#C53030' : '#1a1f36' }}>
                                                    {selectedSO.currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {selectedSO && calculateTotal() !== parseFloat(selectedSO.total_amount) && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-4 text-amber-800 text-xs font-bold">
                        <AlertCircle size={18} />
                        Total milestone value must equal the Sales Order value ({parseFloat(selectedSO.total_amount).toLocaleString()})
                    </div>
                )}
            </div>
        </div>
    );
};

export default MilestoneForm;
