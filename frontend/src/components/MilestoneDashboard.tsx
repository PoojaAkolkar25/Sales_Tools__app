import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import {
    Plus,
    Search,
    FileText,
    CheckCircle2,
    Clock,
    Receipt,
    RefreshCw,
    BarChart3
} from 'lucide-react';
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
            {/* Header section with blue sidebar accent */}
            <div style={{
                borderLeft: '4px solid #FF6100',
                paddingLeft: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: 900,
                        color: '#1a1f36',
                        margin: 0,
                        letterSpacing: '-0.02em'
                    }}>Milestone Management</h1>
                    <p style={{
                        color: '#718096',
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        fontWeight: 500
                    }}>Manage billing milestones and invoicing workflow</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={fetchMilestones}
                        className="ae-btn-secondary"
                        style={{ width: 'auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="ae-btn-primary"
                        style={{ width: 'auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={18} /> New Milestone Plan
                    </button>
                </div>
            </div>

            {/* KPI Cards section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                <div className="ae-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(0, 102, 204, 0.1)', padding: '12px', borderRadius: '12px', color: '#0066CC' }}>
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 900, color: '#718096', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>Total Milestones</p>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#1a1f36', margin: 0 }}>{milestones.length}</h3>
                    </div>
                </div>
                <div className="ae-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(255, 107, 0, 0.1)', padding: '12px', borderRadius: '12px', color: '#FF6B00' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 900, color: '#718096', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>Pending Invoicing</p>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#1a1f36', margin: 0 }}>{milestones.filter(m => m.status !== 'INVOICED').length}</h3>
                    </div>
                </div>
                <div className="ae-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(0, 200, 83, 0.1)', padding: '12px', borderRadius: '12px', color: '#00C853' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 900, color: '#718096', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>Total Invoiced</p>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#1a1f36', margin: 0 }}>{milestones.filter(m => m.status === 'INVOICED').length}</h3>
                    </div>
                </div>
            </div>

            {/* Filters section */}
            <div className="ae-card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-end', background: '#FAFBFC' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', fontWeight: 900, color: '#718096', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Search Customer</label>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} size={16} />
                        <input
                            type="text"
                            placeholder="Type customer name..."
                            value={filterCustomer}
                            onChange={(e) => setFilterCustomer(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                borderRadius: '10px',
                                border: '1px solid #E2E8F0',
                                fontSize: '14px',
                                fontWeight: 600,
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', fontWeight: 900, color: '#718096', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Sales Order No.</label>
                    <div style={{ position: 'relative' }}>
                        <FileText style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} size={16} />
                        <input
                            type="text"
                            placeholder="SO number..."
                            value={filterSO}
                            onChange={(e) => setFilterSO(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                borderRadius: '10px',
                                border: '1px solid #E2E8F0',
                                fontSize: '14px',
                                fontWeight: 600,
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Table section */}
            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th style={{ background: '#FAFBFC', fontSize: '11px', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', padding: '16px 20px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Milestone / Description</th>
                            <th style={{ background: '#FAFBFC', fontSize: '11px', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', padding: '16px 20px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Sales Order</th>
                            <th style={{ background: '#FAFBFC', fontSize: '11px', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', padding: '16px 20px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Due Date</th>
                            <th style={{ background: '#FAFBFC', fontSize: '11px', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', padding: '16px 20px', textAlign: 'right', borderBottom: '2px solid #E2E8F0' }}>Amount</th>
                            <th style={{ background: '#FAFBFC', fontSize: '11px', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', padding: '16px 20px', textAlign: 'center', borderBottom: '2px solid #E2E8F0' }}>Status</th>
                            <th style={{ background: '#FAFBFC', fontSize: '11px', fontWeight: 800, color: '#4A5568', textTransform: 'uppercase', padding: '16px 20px', textAlign: 'right', borderBottom: '2px solid #E2E8F0' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#718096', fontWeight: 600 }}>Loading milestone records...</td>
                            </tr>
                        ) : filteredMilestones.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No milestones found matching criteria.</td>
                            </tr>
                        ) : (
                            filteredMilestones.map((milestone) => (
                                <tr key={milestone.id} style={{ transition: 'all 0.2s' }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 800, color: '#1A1F36', fontSize: '14px' }}>{milestone.milestone_no}</div>
                                        <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>{milestone.description}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 700, color: '#0066CC', fontSize: '13px' }}>{milestone.sales_order_details?.so_number}</div>
                                        <div style={{ fontSize: '11px', color: '#4A5568', textTransform: 'uppercase', fontWeight: 600 }}>{milestone.sales_order_details?.customer_name}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 700, color: '#4A5568', fontSize: '13px' }}>{new Date(milestone.due_date).toLocaleDateString()}</div>
                                        <div style={{ fontSize: '10px', color: '#A0AEC0', fontWeight: 800, textTransform: 'uppercase' }}>Milestone Due</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ fontWeight: 900, color: '#1a1f36', fontSize: '15px' }}>${parseFloat(milestone.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        {milestone.invoice_details && (
                                            <div style={{ fontSize: '10px', color: '#00C853', fontWeight: 800, marginTop: '4px' }}>INV: {milestone.invoice_details.invoice_no}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        {milestone.status === 'INVOICED' ? (
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '10px',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                background: 'rgba(0, 200, 83, 0.1)',
                                                color: '#00C853',
                                                border: '1px solid rgba(0, 200, 83, 0.2)'
                                            }}>Invoiced</span>
                                        ) : (
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
                                            }}>Pending</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        {milestone.status !== 'INVOICED' && (
                                            <button
                                                onClick={() => handleCreateInvoice(milestone.id)}
                                                className="ae-btn-secondary"
                                                style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
                                            >
                                                <Receipt size={14} /> Create Invoice
                                            </button>
                                        )}
                                        {milestone.status === 'INVOICED' && (
                                            <div style={{ color: '#A0AEC0', fontSize: '11px', fontWeight: 700 }}>Processing Complete</div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MilestoneDashboard;
