import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Eye, Filter, Search } from 'lucide-react';
import api from '../api';
import Pagination from './Pagination';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        receipt_no: '',
        customer_name: '',
        reference_number: ''
    });
    const ITEMS_PER_PAGE = 20;

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

    const filteredVouchers = vouchers.filter(v => {
        const matchesTab = v.status === activeTab;
        const matchesReceiptNo = (v.receipt_no || '').toLowerCase().includes(filters.receipt_no.toLowerCase());
        const matchesCustomer = (v.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesReference = (v.reference_number || '').toLowerCase().includes(filters.reference_number.toLowerCase());

        return matchesTab && matchesReceiptNo && matchesCustomer && matchesReference;
    });

    const paginatedVouchers = filteredVouchers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

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
                    <div style={{ width: '4px', height: '24px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Receipt Vouchers
                    </h2>
                </div>
            </div>

            <div className="ae-table-container" style={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: 'none',
                overflowY: 'visible'
            }}>
                {/* Controls Area (Tabs and Create Button) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-primary)'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-sm)'
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
                                background: activeTab === 'UNRECONCILED' ? 'var(--theme-primary)' : 'transparent',
                                color: activeTab === 'UNRECONCILED' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'UNRECONCILED' ? 'var(--shadow-md)' : 'none'
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
                                background: activeTab === 'RECONCILED' ? 'var(--theme-primary)' : 'transparent',
                                color: activeTab === 'RECONCILED' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'RECONCILED' ? 'var(--shadow-md)' : 'none'
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
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowFilters(!showFilters)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: showFilters ? 'var(--bg-secondary)' : 'white',
                                    color: showFilters ? 'var(--theme-primary)' : 'var(--text-secondary)',
                                    borderColor: showFilters ? 'var(--theme-primary)' : 'var(--border-primary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                                title={showFilters ? "Hide Filters" : "Show Filters"}
                            >
                                <Filter size={16} /> Filters
                            </button>
                            <button
                                onClick={onCreateNew}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 18px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--theme-primary)';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-secondary)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <Plus size={18} /> Create Receipt
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="ae-table">
                        <thead>
                            <tr>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Receipt No</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Customer</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Receipt Date</th>
                                {activeTab === 'RECONCILED' && <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Reconciliation Date</th>}
                                <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Amount</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Reference</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Status</th>
                                <th style={{ width: '130px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <div className="ae-input-group">
                                            <Search className="ae-search-icon" size={12} />
                                            <input
                                                className="ae-input"
                                                placeholder="Filter..."
                                                value={filters.receipt_no}
                                                onChange={e => setFilters({ ...filters, receipt_no: e.target.value })}
                                                style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                            />
                                        </div>
                                    </th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <div className="ae-input-group">
                                            <Search className="ae-search-icon" size={12} />
                                            <input
                                                className="ae-input"
                                                placeholder="Filter..."
                                                value={filters.customer_name}
                                                onChange={e => setFilters({ ...filters, customer_name: e.target.value })}
                                                style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                            />
                                        </div>
                                    </th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    {activeTab === 'RECONCILED' && <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>}
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <div className="ae-input-group">
                                            <Search className="ae-search-icon" size={12} />
                                            <input
                                                className="ae-input"
                                                placeholder="Filter..."
                                                value={filters.reference_number}
                                                onChange={e => setFilters({ ...filters, reference_number: e.target.value })}
                                                style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                            />
                                        </div>
                                    </th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                                        <button
                                            onClick={() => setFilters({
                                                receipt_no: '', customer_name: '', reference_number: ''
                                            })}
                                            style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={activeTab === 'RECONCILED' ? 8 : 7} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : paginatedVouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'RECONCILED' ? 8 : 7} style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
                                        <div style={{ opacity: 0.3, fontSize: '3rem', marginBottom: '12px' }}>📄</div>
                                        <div style={{ fontWeight: 600 }}>No vouchers found.</div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedVouchers.map(v => (
                                    <tr key={v.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--theme-primary)', fontFamily: 'monospace' }}>{v.receipt_no}</td>
                                        <td style={{ fontWeight: 600 }}>{v.customer_name}</td>
                                        <td style={{ fontWeight: 600 }}>{formatDate(v.payment_date)}</td>
                                        {activeTab === 'RECONCILED' && (
                                            <td style={{ color: '#00C853', fontWeight: 600 }}>{formatDate(v.reconciliation_date)}</td>
                                        )}
                                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${parseFloat(v.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={{ color: '#718096' }}>{v.reference_number || '—'}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                background: v.status === 'RECONCILED' ? 'rgba(0, 200, 83, 0.1)' : 'var(--bg-secondary)',
                                                color: v.status === 'RECONCILED' ? '#00C853' : 'var(--theme-primary)'
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
                                                    background: 'var(--ae-blue)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--theme-primary)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--ae-blue)'}
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

                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredVouchers.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default ReceiptVoucherDashboard;
