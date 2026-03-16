import React, { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Eye, Columns, ChevronDown, Check, Download } from 'lucide-react';
import api from '../api';
import Pagination from './Pagination';
import { formatToAppDate } from '../utils/dateUtils';

const ALL_COL_CONFIG = [
    { key: 'receipt_no', label: 'Receipt No', shortLabel: 'RCPT. NO' },
    { key: 'customer_name', label: 'Customer', shortLabel: 'CUST.' },
    { key: 'payment_date', label: 'Receipt Date', shortLabel: 'DATE' },
    { key: 'reconciliation_date', label: 'Reconciliation Date', shortLabel: 'RECON.' },
    { key: 'amount_received', label: 'Amount', shortLabel: 'AMT.' },
    { key: 'reference_number', label: 'Reference', shortLabel: 'REF.' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    receipt_no: 55,
    customer_name: 55,
    payment_date: 50,
    reconciliation_date: 65,
    amount_received: 45,
    reference_number: 55,
    status: 35,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    receipt_no: 90,
    customer_name: 120,
    payment_date: 90,
    reconciliation_date: 130,
    amount_received: 85,
    reference_number: 95,
    status: 75
};

const MAX_COL_WIDTHS: Record<string, number> = {
    customer_name: 250,
    reference_number: 200,
    receipt_no: 150,
    payment_date: 120,
    reconciliation_date: 200,
    amount_received: 150,
    status: 120,
    actions: 120
};
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
    const [filters, setFilters] = useState<Record<string, string>>({
        receipt_no: '',
        customer_name: '',
        payment_date: '',
        reconciliation_date: '',
        amount_received: '',
        reference_number: '',
        status: ''
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('receiptVoucherDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        defaults['actions'] = 120;
        return defaults;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('receiptVoucherDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.filter(c => activeTab === 'RECONCILED' || c.key !== 'reconciliation_date').map(c => c.key);
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    useEffect(() => {
        localStorage.setItem('receiptVoucherDashboard_colWidths', JSON.stringify(colWidths));
    }, [colWidths]);

    const startResize = (e: React.MouseEvent, colKey: string) => {
        e.preventDefault();
        resizingRef.current = {
            colKey,
            startWidth: colWidths[colKey],
            startX: e.clientX
        };

        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const key = resizingRef.current.colKey;
            const delta = ev.clientX - resizingRef.current.startX;
            const minWidth = SHORT_COL_WIDTHS[key] ?? 40;
            const maxWidth = MAX_COL_WIDTHS[key] ?? 500;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const getColWidth = (key: string) => colWidths[key] ?? 150;

    useEffect(() => {
        localStorage.setItem('receiptVoucherDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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

    const handleDownloadReport = async (id: number) => {
        try {
            const response = await api.get(`/finance/receipt-vouchers/${id}/download_pdf/`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ReceiptVoucher_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading receipt voucher report', error);
            alert('Failed to download the PDF report.');
        }
    };

    const filteredVouchers = vouchers.filter(v => {
        const matchesTab = v.status === activeTab;

        const matchesFilters = Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            const itemValue = (v as any)[key];
            if (itemValue === undefined || itemValue === null) return false;

            if (key === 'status') {
                const statusLabel = itemValue === 'UNRECONCILED' ? 'For Review' : 'Reconciled';
                return statusLabel.toLowerCase().includes(value.toLowerCase());
            }

            return String(itemValue).toLowerCase().includes(value.toLowerCase());
        });

        return matchesTab && matchesFilters;
    });

    const paginatedVouchers = filteredVouchers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
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
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    flexWrap: 'wrap',
                    gap: '12px'
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
                            onMouseEnter={(e) => {
                                if (activeTab !== 'UNRECONCILED') {
                                    e.currentTarget.style.background = 'rgba(255, 107, 0, 0.08)';
                                    e.currentTarget.style.color = 'var(--theme-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'UNRECONCILED') {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            For Review
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
                            onMouseEnter={(e) => {
                                if (activeTab !== 'RECONCILED') {
                                    e.currentTarget.style.background = 'rgba(255, 107, 0, 0.08)';
                                    e.currentTarget.style.color = 'var(--theme-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'RECONCILED') {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            Reconciled
                        </button>
                    </div>

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
                            onClick={onCreateNew}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: 'transparent',
                                color: 'var(--text-secondary)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                e.currentTarget.style.color = 'var(--ae-orange)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                        >
                            <Plus size={16} /> Create Receipt
                        </button>
                        <div style={{ position: 'relative', display: 'flex' }} ref={columnMenuRef}>
                            <button
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                    e.currentTarget.style.color = 'var(--ae-orange)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
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
                                            onClick={() => setVisibleColumns(ALL_COL_CONFIG.map(c => c.key))}
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
                                        {ALL_COL_CONFIG.map(col => (
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
                                                <div
                                                    onClick={() => {
                                                        if (visibleColumns.includes(col.key)) {
                                                            setVisibleColumns(visibleColumns.filter(c => c !== col.key));
                                                        } else {
                                                            setVisibleColumns([...visibleColumns, col.key]);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${visibleColumns.includes(col.key) ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: visibleColumns.includes(col.key) ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}>
                                                    {visibleColumns.includes(col.key) && <Check size={12} color="white" strokeWidth={4} />}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="ae-table compact-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            {ALL_COL_CONFIG.filter(col => {
                                if (!visibleColumns.includes(col.key)) return false;
                                if (col.key === 'reconciliation_date' && activeTab !== 'RECONCILED') return false;
                                return true;
                            }).map(col => (
                                <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                            ))}
                            <col style={{ width: `${getColWidth('actions')}px` }} />
                        </colgroup>
                        <thead>
                            <tr>
                                {ALL_COL_CONFIG.filter(col => {
                                    if (!visibleColumns.includes(col.key)) return false;
                                    if (col.key === 'reconciliation_date' && activeTab !== 'RECONCILED') return false;
                                    return true;
                                }).map(col => (
                                    <th key={col.key} style={{
                                        position: 'relative',
                                        backgroundColor: 'var(--ae-table-header-bg)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        userSelect: 'none',
                                        padding: '4px 20px 4px 6px',
                                        borderRight: '1px solid var(--border-secondary)',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        zIndex: 12,
                                        top: 0,
                                        color: 'var(--text-secondary)',
                                        textAlign: (col.key === 'amount_received') ? 'right' : 'left',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                    }}>
                                        <span title={col.label} style={{ textTransform: 'uppercase' }}>
                                            {getColWidth(col.key) < (SHORT_COL_WIDTHS[col.key] + 5)
                                                ? col.shortLabel
                                                : col.label}
                                        </span>
                                        <div
                                            onMouseDown={(e) => startResize(e, col.key)}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                right: 0,
                                                width: '6px',
                                                height: '100%',
                                                cursor: 'col-resize',
                                                background: 'transparent',
                                                zIndex: 20
                                            }}
                                            title="Drag to resize"
                                        />
                                    </th>
                                ))}
                                <th style={{
                                    backgroundColor: 'var(--ae-table-header-bg)',
                                    zIndex: 12,
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    top: 0,
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-secondary)'
                                }}>Actions</th>
                            </tr>
                            <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                {ALL_COL_CONFIG.filter(col => {
                                    if (!visibleColumns.includes(col.key)) return false;
                                    if (col.key === 'reconciliation_date' && activeTab !== 'RECONCILED') return false;
                                    return true;
                                }).map(col => (
                                    <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px 6px' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                className="ae-input"
                                                placeholder="Filter..."
                                                value={filters[col.key] || ''}
                                                onChange={e => setFilters({ ...filters, [col.key]: e.target.value })}
                                                style={{ height: '24px', fontSize: '11px', background: 'white', border: '1px solid var(--border-primary)', width: '100%', paddingLeft: '8px' }}
                                            />
                                        </div>
                                    </th>
                                ))}
                                <th style={{
                                    textAlign: 'center',
                                    backgroundColor: 'var(--ae-filter-row-bg)',
                                    borderBottom: '1px solid var(--border-secondary)',
                                    padding: '4px 6px'
                                }}>
                                    <button
                                        onClick={() => setFilters({
                                            receipt_no: '', customer_name: '', payment_date: '',
                                            reconciliation_date: '', amount_received: '', reference_number: '', status: ''
                                        })}
                                        style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                    >
                                        Clear
                                    </button>
                                </th>
                            </tr>
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
                                        {ALL_COL_CONFIG.filter(col => {
                                            if (!visibleColumns.includes(col.key)) return false;
                                            if (col.key === 'reconciliation_date' && activeTab !== 'RECONCILED') return false;
                                            return true;
                                        }).map(col => {
                                            const cellStyle = {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '0.75rem',
                                                padding: '4px 20px 4px 6px',
                                                verticalAlign: 'middle',
                                                borderBottom: '1px solid var(--border-secondary)'
                                            } as React.CSSProperties;

                                            switch (col.key) {
                                                case 'receipt_no':
                                                    return <td key={col.key} style={{ ...cellStyle, fontWeight: 700, color: 'var(--theme-primary)', fontFamily: 'monospace' }}>{v.receipt_no}</td>;
                                                case 'customer_name':
                                                    return <td key={col.key} style={{ ...cellStyle, fontWeight: 600 }}>{v.customer_name}</td>;
                                                case 'payment_date':
                                                    return <td key={col.key} style={{ ...cellStyle, fontWeight: 600 }}>{formatToAppDate(v.payment_date)}</td>;
                                                case 'reconciliation_date':
                                                    return <td key={col.key} style={{ ...cellStyle, color: '#00C853', fontWeight: 600 }}>{formatToAppDate(v.reconciliation_date)}</td>;
                                                case 'amount_received':
                                                    return <td key={col.key} style={{ ...cellStyle, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>${parseFloat(v.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                case 'reference_number':
                                                    return <td key={col.key} style={{ ...cellStyle, color: 'var(--text-secondary)' }}>{v.reference_number || '—'}</td>;
                                                case 'status':
                                                    return <td key={col.key} style={cellStyle}>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            background: v.status === 'RECONCILED' ? 'rgba(0, 200, 83, 0.08)' : 'rgba(255, 107, 0, 0.08)',
                                                            color: v.status === 'RECONCILED' ? '#00C853' : 'var(--theme-primary)',
                                                            border: v.status === 'RECONCILED' ? '1px solid rgba(0, 200, 83, 0.2)' : '1px solid rgba(255, 107, 0, 0.2)'
                                                        }}>
                                                            {v.status === 'UNRECONCILED' ? 'For Review' : 'Reconciled'}
                                                        </span>
                                                    </td>;
                                                default:
                                                    return null;
                                            }
                                        })}
                                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px 6px' }}>
                                            <button
                                                onClick={() => onView(v.id)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '28px',
                                                    height: '28px',
                                                    background: 'rgba(255,107,0,0.08)',
                                                    color: 'var(--theme-primary)',
                                                    border: '1px solid rgba(255,107,0,0.25)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    flexShrink: 0
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'var(--theme-primary)';
                                                    e.currentTarget.style.color = 'white';
                                                    e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,107,0,0.08)';
                                                    e.currentTarget.style.color = 'var(--theme-primary)';
                                                    e.currentTarget.style.borderColor = 'rgba(255,107,0,0.25)';
                                                }}
                                                title="View Receipt"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadReport(v.id)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '28px',
                                                    height: '28px',
                                                    background: 'rgba(255,107,0,0.08)',
                                                    color: 'var(--theme-primary)',
                                                    border: '1px solid rgba(255,107,0,0.25)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    flexShrink: 0,
                                                    marginLeft: '4px'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'var(--theme-primary)';
                                                    e.currentTarget.style.color = 'white';
                                                    e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,107,0,0.08)';
                                                    e.currentTarget.style.color = 'var(--theme-primary)';
                                                    e.currentTarget.style.borderColor = 'rgba(255,107,0,0.25)';
                                                }}
                                                title="Download PDF"
                                            >
                                                <Download size={16} />
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
