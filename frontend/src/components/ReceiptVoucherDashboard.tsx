import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, RefreshCw, CheckCircle, Clock, Eye } from 'lucide-react';
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="ae-hero" style={{ padding: '24px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(255, 107, 0, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Receipt size={24} color="#FF6B00" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FF6B00', margin: 0 }}>
                                Receipt Vouchers
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                Manage and review customer receipts
                            </p>
                        </div>
                    </div>
                    <button onClick={onCreateNew} className="ae-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Create Receipt
                    </button>
                </div>
            </div>

            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'white',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                width: 'fit-content'
            }}>
                <button
                    onClick={() => setActiveTab('UNRECONCILED')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: activeTab === 'UNRECONCILED' ? '#FF6B00' : 'transparent',
                        color: activeTab === 'UNRECONCILED' ? 'white' : '#718096',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Clock size={16} /> For Review
                </button>
                <button
                    onClick={() => setActiveTab('RECONCILED')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: activeTab === 'RECONCILED' ? '#00C853' : 'transparent',
                        color: activeTab === 'RECONCILED' ? 'white' : '#718096',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <CheckCircle size={16} /> Reconciled
                </button>
            </div>

            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th>Receipt No</th>
                            <th>Customer</th>
                            <th>Receipt Date</th>
                            {activeTab === 'RECONCILED' && <th>Reconciliation Date</th>}
                            <th>Amount</th>
                            <th>Reference</th>
                            <th>Status</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={activeTab === 'RECONCILED' ? 8 : 7} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                        ) : filteredVouchers.length === 0 ? (
                            <tr><td colSpan={activeTab === 'RECONCILED' ? 8 : 7} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No vouchers found.</td></tr>
                        ) : (
                            filteredVouchers.map(v => (
                                <tr key={v.id}>
                                    <td style={{ fontWeight: 700, color: '#FF6B00' }}>{v.receipt_no}</td>
                                    <td style={{ fontWeight: 600 }}>{v.customer_name}</td>
                                    <td>{formatDate(v.payment_date)}</td>
                                    {activeTab === 'RECONCILED' && (
                                        <td style={{ color: '#00C853', fontWeight: 600 }}>{formatDate(v.reconciliation_date)}</td>
                                    )}
                                    <td style={{ fontWeight: 700 }}>${parseFloat(v.amount_received).toLocaleString()}</td>
                                    <td>{v.reference_number || '—'}</td>
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
    );
};

export default ReceiptVoucherDashboard;
