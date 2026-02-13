import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Eye } from 'lucide-react';
import api from '../api';

interface ReceiptVoucher {
    id: number;
    receipt_no: string;
    customer_name: string;
    payment_date: string;
    amount_received: string;
    status: 'UNRECONCILED' | 'RECONCILED';
    reference_number: string;
    reconciliation_date?: string;
}

const ReceiptVoucherDashboard: React.FC<{ onCreateNew: () => void; onView: (id: number) => void }> = ({ onCreateNew, onView }) => {
    const [vouchers, setVouchers] = useState<ReceiptVoucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'UNRECONCILED' | 'RECONCILED'>('UNRECONCILED');

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/finance/receipt-vouchers/');
            setVouchers(response.data);
        } catch (error) {
            console.error('Error fetching vouchers', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVouchers = vouchers.filter(v => v.status === activeTab);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        Receipt Vouchers
                    </h2>
                </div>
            </div>

            <div className="ae-table-container" style={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Controls Area (Tabs and Create Button) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid #F1F5F9'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        <button
                            onClick={() => setActiveTab('UNRECONCILED')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: activeTab === 'UNRECONCILED' ? '#FF6B00' : 'transparent',
                                color: activeTab === 'UNRECONCILED' ? 'white' : '#64748B',
                                boxShadow: activeTab === 'UNRECONCILED' ? '0 2px 8px rgba(255, 107, 0, 0.2)' : 'none'
                            }}
                        >
                            FOR REVIEW
                        </button>
                        <button
                            onClick={() => setActiveTab('RECONCILED')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: activeTab === 'RECONCILED' ? '#FF6B00' : 'transparent',
                                color: activeTab === 'RECONCILED' ? 'white' : '#64748B',
                                boxShadow: activeTab === 'RECONCILED' ? '0 2px 8px rgba(255, 107, 0, 0.2)' : 'none'
                            }}
                        >
                            RECONCILED
                        </button>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E0E6ED',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <button
                            onClick={onCreateNew}
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
                                background: '#F7FAFC',
                                color: '#718096'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#FF6B00';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 0, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#F7FAFC';
                                e.currentTarget.style.color = '#718096';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <Plus size={18} /> Create Receipt
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="ae-table">
                        <thead>
                            <tr>
                                <th style={{ backgroundColor: '#FAFBFC' }}>Receipt No</th>
                                <th style={{ backgroundColor: '#FAFBFC' }}>Customer</th>
                                <th style={{ backgroundColor: '#FAFBFC' }}>Receipt Date</th>
                                {activeTab === 'RECONCILED' && <th style={{ backgroundColor: '#FAFBFC' }}>Reconciliation Date</th>}
                                <th style={{ backgroundColor: '#FAFBFC' }}>Amount</th>
                                <th style={{ backgroundColor: '#FAFBFC' }}>Reference</th>
                                <th style={{ backgroundColor: '#FAFBFC' }}>Status</th>
                                <th style={{ width: '130px', textAlign: 'center', backgroundColor: '#FAFBFC' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={activeTab === 'RECONCILED' ? 8 : 7} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : filteredVouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'RECONCILED' ? 8 : 7} style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
                                        <div style={{ opacity: 0.3, fontSize: '3rem', marginBottom: '12px' }}>📄</div>
                                        <div style={{ fontWeight: 600 }}>No vouchers found.</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredVouchers.map(v => (
                                    <tr key={v.id}>
                                        <td style={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace' }}>{v.receipt_no}</td>
                                        <td style={{ fontWeight: 600, color: '#4A5568' }}>{v.customer_name}</td>
                                        <td style={{ fontWeight: 600, color: '#4A5568' }}>{formatDate(v.payment_date)}</td>
                                        {activeTab === 'RECONCILED' && (
                                            <td style={{ color: '#00C853', fontWeight: 600 }}>{formatDate(v.reconciliation_date)}</td>
                                        )}
                                        <td style={{ fontWeight: 700, color: '#1a1f36' }}>${parseFloat(v.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={{ color: '#718096' }}>{v.reference_number || '—'}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                background: v.status === 'RECONCILED' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                                                color: v.status === 'RECONCILED' ? '#00C853' : '#FF6B00'
                                            }}>
                                                {v.status === 'UNRECONCILED' ? 'For Review' : 'Reconciled'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => onView(v.id)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    background: '#0066CC',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#0052A3'}
                                                onMouseOut={(e) => e.currentTarget.style.background = '#0066CC'}
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReceiptVoucherDashboard;
