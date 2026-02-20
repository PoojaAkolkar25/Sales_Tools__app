import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Eye, Search, Columns, ChevronDown } from 'lucide-react';
import api from '../api';
import Pagination from './Pagination';
import { formatToAppDate } from '../utils/dateUtils';

const ALL_COLUMNS = [
    { key: 'receipt_no', label: 'Receipt No' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'payment_date', label: 'Receipt Date' },
    { key: 'reconciliation_date', label: 'Reconciliation Date' },
    { key: 'amount_received', label: 'Amount' },
    { key: 'reference_number', label: 'Reference' },
    { key: 'status', label: 'Status' }
];
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
    const [showFilters] = useState(true);
    const [filters, setFilters] = useState({
        receipt_no: '',
        customer_name: '',
        reference_number: ''
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('receiptVoucherDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.filter(c => activeTab === 'RECONCILED' || c.key !== 'reconciliation_date').map(c => c.key);
    });

    useEffect(() => {
        localStorage.setItem('receiptVoucherDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

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
                        background: 'var(--bg-primary)',
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
                                background: activeTab === 'RECONCILED' ? 'var(--theme-primary)' : 'var(--bg-primary)',
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
                        background: 'var(--bg-primary)',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 18px',
                                        borderRadius: '10px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        border: '1px solid var(--border-primary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    <Columns size={16} /> Columns <ChevronDown size={14} />
                                </button>
                                {showColumnMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        background: 'var(--bg-primary)',
                                        borderRadius: '12px',
                                        boxShadow: 'var(--shadow-lg)',
                                        border: '1px solid var(--border-primary)',
                                        zIndex: 100,
                                        minWidth: '220px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'var(--bg-secondary)'
                                        }}>
                                            <button
                                                onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))}
                                                style={{ background: 'none', border: 'none', color: 'var(--ae-blue)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                onClick={() => setVisibleColumns([])}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {ALL_COLUMNS.map(col => (
                                                <label key={col.key} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '10px 16px',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                    borderBottom: '1px solid var(--border-primary)'
                                                }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns.includes(col.key)}
                                                        onChange={() => {
                                                            if (visibleColumns.includes(col.key)) {
                                                                setVisibleColumns(visibleColumns.filter(c => c !== col.key));
                                                            } else {
                                                                setVisibleColumns([...visibleColumns, col.key]);
                                                            }
                                                        }}
                                                        style={{ cursor: 'pointer', accentColor: 'var(--theme-primary)' }}
                                                    />
                                                    <span style={{ fontWeight: 600 }}>{col.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                {visibleColumns.map(key => {
                                    const col = ALL_COLUMNS.find(c => c.key === key);
                                    if (!col) return null;
                                    // Skip reconciliation_date if not in RECONCILED tab
                                    if (key === 'reconciliation_date' && activeTab !== 'RECONCILED') return null;
                                    return (
                                        <th key={key} style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-secondary)',
                                            textAlign: (key === 'amount_received') ? 'right' : 'left'
                                        }}>
                                            {col.label}
                                        </th>
                                    );
                                })}
                                <th style={{ width: '130px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    {visibleColumns.map(key => {
                                        const col = ALL_COLUMNS.find(c => c.key === key);
                                        if (!col) return null;
                                        if (key === 'reconciliation_date' && activeTab !== 'RECONCILED') return null;

                                        const renderFilter = () => {
                                            switch (key) {
                                                case 'receipt_no':
                                                    return <div className="ae-input-group">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input
                                                            className="ae-input"
                                                            placeholder="Filter..."
                                                            value={filters.receipt_no}
                                                            onChange={e => setFilters({ ...filters, receipt_no: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                        />
                                                    </div>;
                                                case 'customer_name':
                                                    return <div className="ae-input-group">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input
                                                            className="ae-input"
                                                            placeholder="Filter..."
                                                            value={filters.customer_name}
                                                            onChange={e => setFilters({ ...filters, customer_name: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                        />
                                                    </div>;
                                                case 'reference_number':
                                                    return <div className="ae-input-group">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input
                                                            className="ae-input"
                                                            placeholder="Filter..."
                                                            value={filters.reference_number}
                                                            onChange={e => setFilters({ ...filters, reference_number: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                        />
                                                    </div>;
                                                default:
                                                    return null;
                                            }
                                        };

                                        return (
                                            <th key={key} style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                                {renderFilter()}
                                            </th>
                                        );
                                    })}
                                    <th style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                                        <button
                                            onClick={() => setFilters({
                                                receipt_no: '', customer_name: '', reference_number: ''
                                            })}
                                            style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={visibleColumns.filter(c => activeTab === 'RECONCILED' || c !== 'reconciliation_date').length + 1} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : paginatedVouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.filter(c => activeTab === 'RECONCILED' || c !== 'reconciliation_date').length + 1} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <div style={{ opacity: 0.3, fontSize: '3rem', marginBottom: '12px' }}>📄</div>
                                        <div style={{ fontWeight: 600 }}>No vouchers found.</div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedVouchers.map(v => (
                                    <tr key={v.id}>
                                        {visibleColumns.map(key => {
                                            switch (key) {
                                                case 'receipt_no':
                                                    return <td key={key} style={{ fontWeight: 700, color: 'var(--theme-primary)', fontFamily: 'monospace' }}>{v.receipt_no}</td>;
                                                case 'customer_name':
                                                    return <td key={key} style={{ fontWeight: 600 }}>{v.customer_name}</td>;
                                                case 'payment_date':
                                                    return <td key={key} style={{ fontWeight: 600 }}>{formatToAppDate(v.payment_date)}</td>;
                                                case 'reconciliation_date':
                                                    if (activeTab !== 'RECONCILED') return null;
                                                    return <td key={key} style={{ color: '#00C853', fontWeight: 600 }}>{formatToAppDate(v.reconciliation_date)}</td>;
                                                case 'amount_received':
                                                    return <td key={key} style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>${parseFloat(v.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                case 'reference_number':
                                                    return <td key={key} style={{ color: 'var(--text-secondary)' }}>{v.reference_number || '—'}</td>;
                                                case 'status':
                                                    return <td key={key}>
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
                                                    </td>;
                                                default:
                                                    return null;
                                            }
                                        })}
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
