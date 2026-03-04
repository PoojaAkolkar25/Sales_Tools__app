import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { Plus, Save, AlertCircle, Clock, Trash2, Calendar } from 'lucide-react';
import SearchableDropdown from './SearchableDropdown';
import { formatToAppDate } from '../utils/dateUtils';

interface MilestoneFormProps {
    onBack: () => void;
    id?: number | null;
    initialSoId?: number | null;
}

const MilestoneForm: React.FC<MilestoneFormProps> = ({ onBack, id, initialSoId }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [selectedSO, setSelectedSO] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeAction, setActiveAction] = useState<'save' | 'cancel' | null>('save');

    const { showNotification, showConfirm } = useNotification();

    const getCurrencySymbol = (currency: string) => {
        if (!currency) return '';
        const code = currency.toUpperCase().trim();
        switch (code) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR':
            case 'EURO': return '€';
            case 'GBP': return '£';
            default: return code; // Return the code itself if no symbol matches
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (id && customers.length > 0) {
            fetchMilestoneForEdit(id);
        } else if (!id && initialSoId && customers.length > 0) {
            handleInitialSo(initialSoId);
        }
    }, [id, initialSoId, customers]);

    const handleInitialSo = async (soId: number) => {
        setLoading(true);
        try {
            const soRes = await api.get(`/sales-orders/${soId}/`);
            const so = soRes.data;
            if (so.customer) {
                const customer = customers.find(c => c.id === so.customer);
                setSelectedCustomer(customer || null);

                // Fetch all SOs for this customer to populate dropdown
                const sosRes = await api.get(`/sales-orders/?customer=${so.customer}`);
                setSalesOrders(sosRes.data);
                setSelectedSO(so);

                // Initialize milestones for this SO
                await handleSOChange(soId);
            }
        } catch (err) {
            console.error('Error loading initial Sales Order', err);
        } finally {
            setLoading(false);
        }
    };



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
            // Fetch Sales Orders for this customer (any status)
            const response = await api.get(`/sales-orders/?customer=${customerId}`);
            setSalesOrders(response.data);
        } catch (error) {
            console.error('Error fetching sales orders', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerChange = (customerId: string | number) => {
        const customer = customers.find(c => c.id.toString() === customerId.toString());
        setSelectedCustomer(customer || null);
        setSelectedSO(null);
        setMilestones([]);
        if (customer) {
            fetchSalesOrders(customer.id);
        } else {
            setSalesOrders([]);
        }
    };

    const fetchMilestoneForEdit = async (milestoneId: number) => {
        if (loading) return;
        setLoading(true);
        try {
            const response = await api.get(`/milestones/${milestoneId}/`);
            const ms = response.data;

            if (ms.sales_order_details) {
                const customer = customers.find(c => c.id === ms.sales_order_details.customer);
                setSelectedCustomer(customer || null);

                // Fetch SOs for this customer so the dropdown works
                if (customer) {
                    const soResponse = await api.get(`/sales-orders/?customer=${customer.id}`);
                    setSalesOrders(soResponse.data);

                    const so = soResponse.data.find((s: any) => s.id === ms.sales_order);
                    setSelectedSO(so || ms.sales_order_details); // Use details if not in list

                    // Always fetch all milestones for this SO to avoid hidden duplicates
                    try {
                        const allMsRes = await api.get(`/milestones/?sales_order=${ms.sales_order}`);
                        const totalAmt = so ? parseFloat(so.total_amount) : parseFloat(ms.sales_order_details.total_amount);

                        const allMs = allMsRes.data.map((m: any) => ({
                            ...m,
                            percentage: totalAmt > 0 ? (parseFloat(m.amount) / totalAmt * 100).toFixed(2) : "0.00"
                        }));
                        setMilestones(allMs);
                    } catch (err) {
                        console.error('Error fetching all milestones', err);
                        // Fallback to just the current one if bulk fetch fails
                        setMilestones([{
                            ...ms,
                            percentage: ms.sales_order_details.total_amount > 0
                                ? (parseFloat(ms.amount) / parseFloat(ms.sales_order_details.total_amount) * 100).toFixed(2)
                                : "0.00"
                        }]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching milestone', error);
            showNotification('Error loading milestone details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSOChange = async (soId: string | number) => {
        const so = salesOrders.find(s => s.id.toString() === soId.toString());
        setSelectedSO(so || null);

        if (so) {
            setLoading(true);
            try {
                // Check for existing milestones for this SO
                const response = await api.get(`/milestones/?sales_order=${so.id}`);
                if (response.data && response.data.length > 0) {
                    const existingMilestones = response.data.map((m: any) => ({
                        ...m,
                        percentage: (parseFloat(m.amount) / parseFloat(so.total_amount) * 100).toFixed(2)
                    }));
                    setMilestones(existingMilestones);
                    showNotification('Loaded existing milestones for this Sales Order', 'info');
                } else {
                    // Initialize with default M1 if no existing milestones
                    setMilestones([{
                        milestone_no: 'M1',
                        period_from: so.order_date,
                        period_to: so.delivery_date,
                        due_date: so.delivery_date,
                        description: 'Initial Milestone',
                        percentage: 100,
                        qty: 1,
                        rate: parseFloat(so.total_amount).toFixed(2),
                        amount: parseFloat(so.total_amount).toFixed(2)
                    }]);
                }
            } catch (error) {
                console.error('Error fetching existing milestones', error);
                // Fallback to default
                setMilestones([{
                    milestone_no: 'M1',
                    period_from: so.order_date,
                    period_to: so.delivery_date,
                    due_date: so.delivery_date,
                    description: 'Initial Milestone',
                    percentage: 100,
                    qty: 1,
                    rate: parseFloat(so.total_amount).toFixed(2),
                    amount: parseFloat(so.total_amount).toFixed(2)
                }]);
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
        if (Math.abs(total - parseFloat(selectedSO.total_amount)) > 0.01) {
            showNotification(`Total milestone amount (${total.toFixed(2)}) must equal Sales Order value (${selectedSO.total_amount})`, 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                sales_order: selectedSO.id,
                milestones: milestones.map(m => ({
                    id: m.id,
                    milestone_no: m.milestone_no,
                    period_from: m.period_from || null,
                    period_to: m.period_to || null,
                    due_date: m.due_date || null,
                    description: m.description,
                    qty: m.qty || 1,
                    rate: m.rate || 0,
                    amount: m.amount || 0,
                    status: m.status || 'DRAFT'
                }))
            };

            const response = await api.post('/milestones/bulk_save/', payload);

            const msg = response.data?.message || 'Milestones saved as draft';
            showNotification(msg, 'success');
            onBack();
        } catch (error: any) {
            let errorMsg = 'Failed to save milestones';
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
                {/* Header with Title and Back button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            width: '4px',
                            height: '18px',
                            background: 'var(--ae-blue)',
                            borderRadius: '2px'
                        }}></span>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', margin: 0 }}>
                            {id ? 'View / Edit Milestone Plan' : 'Create New Milestone Plan'}
                        </h2>
                    </div>

                </div>

                {/* Selection & Summary Section - Side-by-Side */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        margin: '0 0 16px 0',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textTransform: 'uppercase'
                    }}>
                        <span style={{
                            width: '2px',
                            height: '10px',
                            background: 'var(--ae-blue)',
                            borderRadius: '1px'
                        }}></span>
                        Selection & Summary
                    </h3>

                    <div className="ae-grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                                Select Customer <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <SearchableDropdown
                                options={customers.map(c => ({ value: c.id.toString(), label: c.name }))}
                                value={selectedCustomer?.id?.toString() || ''}
                                onChange={handleCustomerChange}
                                placeholder="Select Customer..."
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                                Select Sales Order <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <SearchableDropdown
                                options={salesOrders.map(so => ({
                                    value: so.id.toString(),
                                    label: `${so.so_number || `DRAFT-${so.id} (${so.po_number || 'No PO'})`} - ${getCurrencySymbol(so.currency)} ${parseFloat(so.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                }))}
                                value={selectedSO?.id?.toString() || ''}
                                onChange={handleSOChange}
                                placeholder={loading ? 'Loading...' : 'Select Sales Order...'}
                                disabled={!selectedCustomer || loading}
                            />
                        </div>
                    </div>

                    {selectedSO && (
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '20px'
                        }}>
                            <div style={{ flexShrink: 0 }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Order Details</h4>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#718096' }}>Total Amount:</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36' }}>
                                    {getCurrencySymbol(selectedSO.currency)} {parseFloat(selectedSO.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            color: 'var(--theme-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase',
                            margin: 0
                        }}>
                            <span style={{
                                width: '4px',
                                height: '14px',
                                background: 'var(--ae-blue)',
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
                        <div className="ae-table-wrapper" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                <thead style={{ background: 'var(--bg-accent)' }}>
                                    <tr>
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
                                            <tr key={milestone.id || index} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    {index === milestones.length - 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleAddMilestone}
                                                            style={{
                                                                padding: '4px',
                                                                background: 'var(--bg-accent)',
                                                                border: '1px solid var(--theme-primary)',
                                                                borderRadius: '6px',
                                                                color: 'var(--theme-primary)',
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
                                                        className="ae-input"
                                                        style={{
                                                            width: '100%', height: '48px', padding: '8px 12px', border: '1px solid #E2E8F0',
                                                            borderRadius: '6px', fontSize: '0.75rem', resize: 'none',
                                                            opacity: isInvoiced ? 0.7 : 1
                                                        }}
                                                        rows={1}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            value={formatToAppDate(milestone.due_date || '')}
                                                            readOnly
                                                            disabled={isInvoiced}
                                                            style={{
                                                                width: '100%', padding: '6px 8px', paddingRight: '28px', border: '1px solid #E2E8F0',
                                                                borderRadius: '6px', fontSize: '0.75rem',
                                                                opacity: isInvoiced ? 0.7 : 1,
                                                                color: 'var(--text-primary)',
                                                                background: isInvoiced ? '#F8FAFC' : 'white',
                                                                cursor: isInvoiced ? 'not-allowed' : 'pointer',
                                                                minHeight: '30px'
                                                            }}
                                                            onClick={(e) => {
                                                                if (!isInvoiced) {
                                                                    const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                                                    if (dateInput) dateInput.showPicker();
                                                                }
                                                            }}
                                                            placeholder="Enter date"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={milestone.due_date || ''}
                                                            onChange={(e) => handleMilestoneChange(index, 'due_date', e.target.value)}
                                                            disabled={isInvoiced}
                                                            style={{
                                                                position: 'absolute',
                                                                width: '100%',
                                                                height: '100%',
                                                                opacity: 0,
                                                                cursor: isInvoiced ? 'not-allowed' : 'pointer',
                                                                zIndex: 1,
                                                                left: 0,
                                                                top: 0
                                                            }}
                                                        />
                                                        <Calendar size={14} style={{ position: 'absolute', right: '8px', color: '#A0AEC0', pointerEvents: 'none', zIndex: 2 }} />
                                                    </div>
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
                                                            textAlign: 'center', color: 'var(--text-secondary)',
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
                                    <tr style={{ background: 'var(--bg-accent)' }}>
                                        <td colSpan={5} style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Planned</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '1rem', fontWeight: 900, color: calculateTotal() > parseFloat(selectedSO.total_amount) ? '#C53030' : 'var(--text-primary)' }}>
                                            <span style={{ color: 'var(--theme-primary)', marginRight: '4px' }}>{getCurrencySymbol(selectedSO.currency)}</span>
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
                gap: '8px',
                background: 'white',
                padding: '8px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                width: 'fit-content',
                marginLeft: 'auto',
                marginBottom: '20px'
            }}>
                <button
                    onClick={handleSave}
                    disabled={saving || !selectedSO}
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
                        cursor: (saving || !selectedSO) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        background: activeAction === 'save' ? 'var(--theme-primary)' : 'transparent',
                        color: activeAction === 'save' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeAction === 'save' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                    }}
                    onMouseEnter={() => setActiveAction('save')}
                    onMouseLeave={() => setActiveAction(null)}
                >
                    {saving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
                    <span>Save Milestone</span>
                </button>

                <button
                    onClick={() => {
                        showConfirm({
                            title: 'Are you sure you want to exit?',
                            onConfirm: () => onBack(),
                            onCancel: () => { }
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
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeAction === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                        color: activeAction === 'cancel' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeAction === 'cancel' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                    }}
                    onMouseEnter={() => setActiveAction('cancel')}
                    onMouseLeave={() => setActiveAction(null)}
                >
                    <span style={{ fontSize: '18px', lineHeight: '10px' }}>×</span>
                    <span>Cancel</span>
                </button>
            </div>


        </div >
    );
};

export default MilestoneForm;
