
import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, RefreshCw, Upload, Cloud, Columns, ChevronDown, Check } from 'lucide-react';
import api from '../api';
import Pagination from './Pagination';
import { useNotification } from '../context/NotificationContext';

const ALL_COL_CONFIG = [
    { key: 'transaction_id', label: 'Trans. Id', shortLabel: 'TX. ID' },
    { key: 'value_date', label: 'Value Date', shortLabel: 'VAL. DT' },
    { key: 'transaction_date', label: 'Trans. Date', shortLabel: 'TX. DT' },
    { key: 'posted_date', label: 'Posted Date', shortLabel: 'POST. DT' },
    { key: 'cheque_ref_no', label: 'Ref. No.', shortLabel: 'REF.' },
    { key: 'description', label: 'Transaction Remark', shortLabel: 'REMARK' },
    { key: 'withdrawal_amount', label: 'Withdrawal', shortLabel: 'WITH.' },
    { key: 'deposit_amount', label: 'Deposit/Income', shortLabel: 'DEP.' },
    { key: 'balance', label: 'Balance', shortLabel: 'BAL.' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    transaction_id: 50,
    value_date: 60,
    transaction_date: 50,
    posted_date: 60,
    cheque_ref_no: 50,
    description: 60,
    withdrawal_amount: 50,
    deposit_amount: 50,
    balance: 50,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    transaction_id: 80,
    value_date: 90,
    transaction_date: 90,
    posted_date: 90,
    cheque_ref_no: 80,
    description: 130,
    withdrawal_amount: 85,
    deposit_amount: 110,
    balance: 80
};

const MAX_COL_WIDTHS: Record<string, number> = {
    description: 350,
    transaction_id: 120,
    value_date: 120,
    transaction_date: 120,
    posted_date: 120,
    withdrawal_amount: 150,
    deposit_amount: 180,
    balance: 150,
    actions: 120
};

interface BankTransaction {
    id: number;
    transaction_date: string;
    description: string;
    customer_name: string;
    amount_received: string;
    status: 'FOR_REVIEW' | 'CATEGORIZED' | 'EXCLUDED';
    source: 'AUTO' | 'MANUAL';
    exclusion_reason?: string;
    // New fields
    transaction_id?: string;
    value_date?: string;
    posted_date?: string;
    cheque_ref_no?: string;
    transaction_remarks?: string;
    withdrawal_amount?: string;
    deposit_amount?: string;
    balance?: string;
}

const BankTransactionsDashboard: React.FC = () => {
    const { showNotification } = useNotification();
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [activeTab, setActiveTab] = useState<'FOR_REVIEW' | 'CATEGORIZED' | 'EXCLUDED'>('FOR_REVIEW');
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        description: '',
        customer_name: '',
        amount: ''
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('bankTransactionsDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        defaults['actions'] = 140;
        return defaults;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('bankTransactionsDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.map(c => c.key);
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    useEffect(() => {
        localStorage.setItem('bankTransactionsDashboard_colWidths', JSON.stringify(colWidths));
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
        localStorage.setItem('bankTransactionsDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const ITEMS_PER_PAGE = 20;
    const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
    const [receiptsForMatching, setReceiptsForMatching] = useState<any[]>([]);
    const [selectedReceipts, setSelectedReceipts] = useState<number[]>([]);
    const [matchingLoading, setMatchingLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [bankType, setBankType] = useState<string>('generic');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const response = await api.get('/finance/bank-transactions/');
            setTransactions(response.data);
        } catch (error) {
            console.error('Error fetching transactions', error);
        }
    };

    const fetchReceiptsForMatching = async () => {
        try {
            let url = '/finance/receipt-vouchers/?status=UNRECONCILED';
            const response = await api.get(url);
            setReceiptsForMatching(response.data);
        } catch (error) {
            console.error('Error fetching receipts', error);
        }
    };

    const handleMatchClick = (transaction: BankTransaction) => {
        setSelectedTransaction(transaction);
        setSelectedReceipts([]);
        fetchReceiptsForMatching();
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const response = await api.post('/finance/bank-transactions/sync/');
            showNotification(`Synced ${response.data.count} transactions successfully`, 'success');
            fetchTransactions();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error syncing transactions', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bank_type', bankType);

        setUploading(true);
        try {
            const response = await api.post('/finance/bank-transactions/upload/', formData);
            showNotification(`Uploaded ${response.data.count} transactions successfully`, 'success');
            fetchTransactions();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error uploading file', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleConfirmMatch = async () => {
        if (!selectedTransaction) return;

        const totalSelected = receiptsForMatching
            .filter(r => selectedReceipts.includes(r.id))
            .reduce((sum, r) => sum + parseFloat(r.amount_received), 0);

        if (totalSelected !== parseFloat(selectedTransaction.amount_received)) {
            const amt = parseFloat(selectedTransaction.amount_received);
            showNotification(`Selected receipts total (${totalSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) must match transaction amount (${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, 'warning');
            return;
        }

        setMatchingLoading(true);
        try {
            await api.post(`/finance/bank-transactions/${selectedTransaction.id}/match/`, {
                receipt_ids: selectedReceipts,
                reconciliation_date: selectedTransaction.transaction_date
            });
            showNotification('Matched successfully', 'success');
            setSelectedTransaction(null);
            fetchTransactions();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error matching transaction', 'error');
        } finally {
            setMatchingLoading(false);
        }
    };

    const handleExclude = async (transaction: BankTransaction) => {
        const reason = prompt('Reason for exclusion:', 'Internal Transfer');
        if (reason === null) return;

        try {
            await api.post(`/finance/bank-transactions/${transaction.id}/exclude/`, { reason });
            fetchTransactions();
        } catch (error) {
            console.error('Error excluding transaction', error);
        }
    };

    const handleUndoExclude = async (transaction: BankTransaction) => {
        try {
            await api.post(`/finance/bank-transactions/${transaction.id}/undo_exclude/`);
            fetchTransactions();
        } catch (error) {
            console.error('Error undoing exclusion', error);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesTab = t.status === activeTab;
        const matchesDescription = (t.description || '').toLowerCase().includes(filters.description.toLowerCase());
        const matchesCustomer = (t.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesAmount = !filters.amount ||
            (t.deposit_amount && t.deposit_amount.includes(filters.amount)) ||
            (t.withdrawal_amount && t.withdrawal_amount.includes(filters.amount)) ||
            (t.amount_received && t.amount_received.includes(filters.amount));

        return matchesTab && matchesDescription && matchesCustomer && matchesAmount;
    });

    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
            />

            {/* Header & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Bank Transactions
                    </h2>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'white',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-primary)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#718096' }}>Format:</label>
                        <select
                            value={bankType}
                            onChange={(e) => setBankType(e.target.value)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                outline: 'none',
                                color: 'var(--text-primary)',
                                background: 'var(--bg-secondary)'
                            }}
                        >
                            <option value="generic">Generic (CSV)</option>
                            <option value="icici">ICICI Bank</option>
                            <option value="idfc">IDFC Bank</option>
                            <option value="bofa">Bank of America</option>
                        </select>
                    </div>

                    <div style={{ width: '1px', height: '20px', background: 'var(--border-primary)' }}></div>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="ae-btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            height: '32px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 700
                        }}
                    >
                        {syncing ? <RefreshCw className="animate-spin" size={16} /> : <Cloud size={16} />}
                        Sync
                    </button>
                    <button
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="ae-btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            height: '32px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 700
                        }}
                    >
                        {uploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                        Upload Statement
                    </button>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-primary)' }}></div>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-primary)',
                                fontWeight: 700,
                                cursor: 'pointer'
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

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '4px',
                background: 'white',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-sm)',
                width: 'fit-content'
            }}>
                {(['FOR_REVIEW', 'CATEGORIZED', 'EXCLUDED'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeTab === tab ? 'var(--theme-primary)' : 'transparent',
                            color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                            boxShadow: activeTab === tab ? 'var(--shadow-md)' : 'none'
                        }}
                    >
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedTransaction ? '1fr 400px' : '1fr', gap: '12px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Main Table */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div className="ae-table-container" style={{ height: 'auto', maxHeight: 'none', overflowY: 'visible', overflowX: 'auto' }}>
                        <table className="ae-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                <col style={{ width: '50px' }} />
                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                                <col style={{ width: `${getColWidth('actions')}px` }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={{ width: '50px', backgroundColor: 'var(--ae-table-header-bg)', top: 0, zIndex: 12, borderBottom: '1px solid var(--border-secondary)', borderRight: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}>#</th>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{
                                            backgroundColor: 'var(--ae-table-header-bg)',
                                            position: 'relative',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            userSelect: 'none',
                                            padding: '4px 20px 4px 6px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)',
                                            zIndex: 12,
                                            top: 0,
                                            color: 'var(--text-secondary)',
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
                                        borderBottom: '1px solid var(--border-secondary)',
                                        padding: '4px 6px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                    }}>Actions</th>
                                </tr>
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}></th>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px 6px' }}>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={(filters as any)[col.key] || ''}
                                                    onChange={e => setFilters({ ...filters, [col.key]: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', background: 'white', border: '1px solid var(--border-primary)', width: '100%', paddingLeft: '8px' }}
                                                />
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ textAlign: 'center', backgroundColor: 'var(--ae-filter-row-bg)', borderBottom: '1px solid var(--border-secondary)', padding: '4px 6px' }}>
                                        <button
                                            onClick={() => setFilters({
                                                description: '', customer_name: '', amount: ''
                                            } as any)}
                                            style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransactions.map((t, idx) => {
                                    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                    return (
                                        <tr key={t.id} style={{ background: selectedTransaction?.id === t.id ? 'var(--bg-secondary)' : 'white' }} onClick={() => setSelectedTransaction(t)}>
                                            <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px 6px', fontSize: '0.75rem' }}>
                                                {startIndex + idx + 1}
                                            </td>
                                            {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => {
                                                const key = col.key;
                                                const cellStyle = {
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.75rem',
                                                    borderRight: '1px solid var(--border-secondary)',
                                                    borderBottom: '1px solid var(--border-secondary)',
                                                    color: 'var(--text-primary)',
                                                    padding: '4px 20px 4px 6px',
                                                    textAlign: (key === 'withdrawal_amount' || key === 'deposit_amount' || key === 'balance') ? 'right' : 'left'
                                                } as React.CSSProperties;

                                                switch (key) {
                                                    case 'transaction_id': return <td key={key} style={cellStyle}>{t.transaction_id || '—'}</td>;
                                                    case 'value_date': return <td key={key} style={cellStyle}>{t.value_date || '—'}</td>;
                                                    case 'transaction_date': return <td key={key} style={{ ...cellStyle, fontWeight: 600 }}>{t.transaction_date}</td>;
                                                    case 'posted_date': return <td key={key} style={cellStyle}>{t.posted_date || '—'}</td>;
                                                    case 'cheque_ref_no': return <td key={key} style={cellStyle}>{t.cheque_ref_no || '—'}</td>;
                                                    case 'description': return <td key={key} style={{ ...cellStyle, fontSize: '0.75rem' }} title={t.transaction_remarks || t.description}>{t.transaction_remarks || t.description}</td>;
                                                    case 'withdrawal_amount': return <td key={key} style={{ ...cellStyle, textAlign: 'right', color: '#E53E3E' }}>{parseFloat(t.withdrawal_amount || '0') > 0 ? `$${parseFloat(t.withdrawal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>;
                                                    case 'deposit_amount': return <td key={key} style={{ ...cellStyle, textAlign: 'right', color: '#38A169', fontWeight: 600 }}>{parseFloat(t.deposit_amount || t.amount_received || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                    case 'balance': return <td key={key} style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }}>{t.balance ? `$${parseFloat(t.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>;
                                                    default: return null;
                                                }
                                            })}
                                            <td style={{ textAlign: 'right', position: 'sticky', right: 0, background: selectedTransaction?.id === t.id ? 'var(--bg-secondary)' : 'white', boxShadow: '-2px 0 5px rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-secondary)', padding: '4px 6px' }}>
                                                {activeTab === 'FOR_REVIEW' && (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '0 8px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMatchClick(t); }}
                                                            className="ae-btn-secondary"
                                                            style={{
                                                                padding: '4px 12px',
                                                                fontSize: '11px',
                                                                borderRadius: '20px',
                                                                background: 'rgba(56, 161, 105, 0.08)',
                                                                color: '#38A169',
                                                                border: '1px solid rgba(56, 161, 105, 0.2)'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#38A169';
                                                                e.currentTarget.style.color = 'white';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'rgba(56, 161, 105, 0.08)';
                                                                e.currentTarget.style.color = '#38A169';
                                                            }}
                                                        >
                                                            Match
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleExclude(t); }}
                                                            className="ae-btn-secondary"
                                                            style={{
                                                                padding: '4px 12px',
                                                                fontSize: '11px',
                                                                borderRadius: '20px',
                                                                background: 'rgba(229, 62, 62, 0.08)',
                                                                color: '#E53E3E',
                                                                border: '1px solid rgba(229, 62, 62, 0.2)'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#E53E3E';
                                                                e.currentTarget.style.color = 'white';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'rgba(229, 62, 62, 0.08)';
                                                                e.currentTarget.style.color = '#E53E3E';
                                                            }}
                                                        >
                                                            Exclude
                                                        </button>
                                                    </div>
                                                )}
                                                {activeTab === 'EXCLUDED' && (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '0 8px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUndoExclude(t); }}
                                                            className="ae-btn-secondary"
                                                            style={{
                                                                padding: '4px 12px',
                                                                fontSize: '11px',
                                                                borderRadius: '20px'
                                                            }}
                                                        >
                                                            Undo
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredTransactions.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                </div>

                {
                    selectedTransaction && (
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid #E0E6ED',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            height: '100%',
                            maxHeight: 'none',
                            position: 'relative',
                            top: 0
                        }}>
                            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Match Transaction</h3>
                                    <button onClick={() => setSelectedTransaction(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <XCircle size={20} color="#718096" />
                                    </button>
                                </div>
                                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount to Match:</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--theme-primary)' }}>
                                                ${parseFloat(selectedTransaction.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Customer:</div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedTransaction.customer_name || '—'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tx Date:</div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTransaction.transaction_date}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>

                                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                                    Select Unreconciled Receipt Voucher:
                                </div>
                                {receiptsForMatching.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#718096', fontSize: '0.85rem' }}>
                                        No unreconciled receipts found.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {receiptsForMatching.map(r => (
                                            <label key={r.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: '1px solid',
                                                borderColor: selectedReceipts.includes(r.id) ? 'var(--theme-primary)' : 'var(--border-primary)',
                                                background: selectedReceipts.includes(r.id) ? 'var(--bg-secondary)' : 'white',
                                                cursor: 'pointer'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedReceipts.includes(r.id)}
                                                    onChange={() => {
                                                        if (selectedReceipts.includes(r.id)) {
                                                            setSelectedReceipts(selectedReceipts.filter(id => id !== r.id));
                                                        } else {
                                                            setSelectedReceipts([...selectedReceipts, r.id]);
                                                        }
                                                    }}
                                                    style={{ accentColor: 'var(--theme-primary)' }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.receipt_no}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#718096', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span>Customer: {r.customer_name}</span>
                                                        <span style={{ fontWeight: 600 }}>Receipt Date: {r.payment_date}</span>
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 800, color: '#2D3748' }}>
                                                    ${parseFloat(r.amount_received).toLocaleString()}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '20px', background: '#F7FAFC', borderTop: '1px solid #E0E6ED' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#718096' }}>Selected Total:</span>
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        color: receiptsForMatching
                                            .filter(r => selectedReceipts.includes(r.id))
                                            .reduce((sum, r) => sum + parseFloat(r.amount_received), 0) === parseFloat(selectedTransaction.amount_received)
                                            ? '#00C853' : '#E53E3E'
                                    }}>
                                        ${receiptsForMatching
                                            .filter(r => selectedReceipts.includes(r.id))
                                            .reduce((sum, r) => sum + parseFloat(r.amount_received), 0)
                                            .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <button
                                    onClick={handleConfirmMatch}
                                    className="ae-btn-primary"
                                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                    disabled={matchingLoading || selectedReceipts.length === 0}
                                >
                                    {matchingLoading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                    Confirm Match
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default BankTransactionsDashboard;
