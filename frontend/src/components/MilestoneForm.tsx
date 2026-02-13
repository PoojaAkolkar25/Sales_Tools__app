import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { Plus, Save, AlertCircle, Clock, Trash2 } from 'lucide-react';

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
    const [showCancelModal, setShowCancelModal] = useState(false);
    const { showNotification } = useNotification();

    const getCurrencySymbol = (currency: string) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EURO': return '€';
            default: return currency;
        }
    };

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

        // Auto-calculate amount if rate/qty changes
        if (field === 'amount') {
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
        const filteredMilestones = milestones.filter((_, i) => i !== index);
        // Re-index to ensure strictly sequential M1, M2, M3...
        const reindexedMilestones = filteredMilestones.map((m, i) => ({
            ...m,
            milestone_no: `M${i + 1}`
        }));
        setMilestones(reindexedMilestones);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px'
            }}>
                {/* Header with Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <span style={{
                        width: '3px',
                        height: '14px',
                        background: '#FF6B00',
                        borderRadius: '2px'
                    }}></span>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', margin: 0 }}>
                        Create New Milestone Plan
                    </h2>
                </div>

                {/* Selection & Summary Section - Side-by-Side */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        margin: '0 0 16px 0',
                        color: '#0066CC',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textTransform: 'uppercase'
                    }}>
                        <span style={{
                            width: '2px',
                            height: '10px',
                            background: '#0066CC',
                            borderRadius: '1px'
                        }}></span>
                        Selection & Summary
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Select Customer <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <select
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '34px'
                                }}
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                value={selectedCustomer?.id || ''}
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Select Sales Order <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <select
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '34px'
                                }}
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
                    </div>

                    {selectedSO && (
                        <div style={{
                            background: '#F8FAFC',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '40px'
                        }}>
                            <div style={{ flexShrink: 0 }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0066CC', textTransform: 'uppercase', margin: 0 }}>Order Details</h4>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#718096' }}>Total Amount:</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36' }}>
                                    {getCurrencySymbol(selectedSO.currency)} {parseFloat(selectedSO.total_amount).toLocaleString()}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#718096' }}>Order Date:</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1f36' }}>{selectedSO.order_date}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Milestone Breakdown Section */}
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px'
                    }}>
                        <h3 style={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: '#FF6B00',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase',
                            margin: 0
                        }}>
                            <span style={{
                                width: '4px',
                                height: '14px',
                                background: '#0066CC',
                                borderRadius: '2px'
                            }}></span>
                            Milestone Breakdown
                        </h3>
                        {/* Remove top-right Add Row button */}
                    </div>

                    {!selectedSO ? (
                        <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: '#A0AEC0',
                            fontStyle: 'italic',
                            fontSize: '0.85rem',
                            background: '#F8FAFC',
                            borderRadius: '8px',
                            border: '1px dashed #E2E8F0'
                        }}>
                            Please select a Sales Order to define milestones.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                <thead>
                                    <tr style={{ background: '#F8FAFC' }}>
                                        <th style={{ padding: '12px 8px', width: '40px', borderBottom: '1px solid #E0E6ED' }}></th>
                                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '80px' }}>Sr.No.</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED' }}>Description</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '140px' }}>Due Date</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '100px' }}>Amount %</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #E0E6ED', width: '160px' }}>Amount</th>
                                        <th style={{ padding: '12px 8px', borderBottom: '1px solid #E0E6ED', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {milestones.map((milestone, index) => {
                                        const isInvoiced = milestone.status === 'INVOICED';
                                        return (
                                            <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    {index === milestones.length - 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleAddMilestone}
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
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={milestone.milestone_no}
                                                        readOnly
                                                        style={{
                                                            width: '100%', padding: '6px 8px', border: '1px solid #E2E8F0',
                                                            borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                                            textAlign: 'center', background: '#F8FAFC', color: '#4A5568'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <textarea
                                                        value={milestone.description}
                                                        onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                                                        disabled={isInvoiced}
                                                        style={{
                                                            width: '100%', padding: '6px 8px', border: '1px solid #E2E8F0',
                                                            borderRadius: '6px', fontSize: '0.75rem', resize: 'none',
                                                            opacity: isInvoiced ? 0.7 : 1
                                                        }}
                                                        rows={1}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="date"
                                                        value={milestone.due_date || ''}
                                                        onChange={(e) => handleMilestoneChange(index, 'due_date', e.target.value)}
                                                        disabled={isInvoiced}
                                                        style={{
                                                            width: '100%', padding: '6px 8px', border: '1px solid #E2E8F0',
                                                            borderRadius: '6px', fontSize: '0.75rem',
                                                            opacity: isInvoiced ? 0.7 : 1
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="number"
                                                        value={milestone.percentage || ''}
                                                        onChange={(e) => handleMilestoneChange(index, 'percentage', e.target.value)}
                                                        disabled={isInvoiced}
                                                        style={{
                                                            width: '100%', padding: '6px 8px', border: '1px solid #E2E8F0',
                                                            borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                                            textAlign: 'center', color: '#0066CC',
                                                            opacity: isInvoiced ? 0.7 : 1
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <span style={{ position: 'absolute', left: '10px', fontSize: '0.8rem', color: '#718096', fontWeight: 600 }}>{getCurrencySymbol(selectedSO.currency)}</span>
                                                        <input
                                                            type="number"
                                                            value={milestone.amount || ''}
                                                            onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                                                            disabled={isInvoiced}
                                                            style={{
                                                                width: '100%', padding: '6px 8px 6px 24px', border: '1px solid #E2E8F0',
                                                                borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800,
                                                                textAlign: 'right',
                                                                opacity: isInvoiced ? 0.7 : 1
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    {milestones.length > 1 && !isInvoiced && (
                                                        <button
                                                            onClick={() => handleRemoveMilestone(index)}
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
                                                            title="Remove Milestone"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#F8FAFC' }}>
                                        <td colSpan={5} style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase' }}>Total Planned</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '1rem', fontWeight: 900, color: calculateTotal() > parseFloat(selectedSO.total_amount) ? '#C53030' : '#1a1f36' }}>
                                            <span style={{ color: '#FF6B00', marginRight: '4px' }}>{getCurrencySymbol(selectedSO.currency)}</span>
                                            {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {selectedSO && calculateTotal() !== parseFloat(selectedSO.total_amount) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: '#FFF5F5',
                        border: '1px solid #FEB2B2',
                        borderRadius: '8px',
                        marginTop: '20px',
                        color: '#C53030',
                        fontSize: '0.75rem',
                        fontWeight: 700
                    }}>
                        <AlertCircle size={18} />
                        Total milestone value must equal the Sales Order value ({getCurrencySymbol(selectedSO.currency)}{parseFloat(selectedSO.total_amount).toLocaleString()})
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'white',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                width: 'fit-content',
                marginBottom: '20px'
            }}>
                <button
                    onClick={handleSave}
                    disabled={saving || !selectedSO}
                    className="ae-btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                    }}
                >
                    {saving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
                    <span style={{ fontWeight: 800 }}>Save Milestone Plan</span>
                </button>

                <button
                    onClick={() => setShowCancelModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        background: 'transparent',
                        color: '#718096',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
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
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '450px',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden'
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
                                    <AlertCircle size={24} color="#E53E3E" />
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

export default MilestoneForm;
