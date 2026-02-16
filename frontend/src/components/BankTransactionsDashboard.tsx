
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, Upload, Cloud, Filter, Search } from 'lucide-react';
import api from '../api';
import Pagination from './Pagination';
import { useNotification } from '../context/NotificationContext';

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
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'FOR_REVIEW' | 'CATEGORIZED' | 'EXCLUDED'>('FOR_REVIEW');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        description: '',
        customer_name: '',
        amount: ''
    });
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
        setLoading(true);
        try {
            const response = await api.get('/finance/bank-transactions/');
            setTransactions(response.data);
        } catch (error) {
            console.error('Error fetching transactions', error);
        } finally {
            setLoading(false);
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
            const response = await api.post('/finance/bank-transactions/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
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
                            cursor: syncing ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)'
                        }}
                        onMouseEnter={(e) => {
                            if (!syncing) {
                                e.currentTarget.style.background = 'var(--theme-primary)';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!syncing) {
                                e.currentTarget.style.background = 'var(--bg-secondary)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        }}
                    >
                        {syncing ? <RefreshCw className="animate-spin" size={16} /> : <Cloud size={16} />}
                        Sync
                    </button>
                    <button
                        onClick={handleUploadClick}
                        disabled={uploading}
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
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)'
                        }}
                        onMouseEnter={(e) => {
                            if (!uploading) {
                                e.currentTarget.style.background = 'var(--theme-primary)';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!uploading) {
                                e.currentTarget.style.background = 'var(--bg-secondary)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        }}
                    >
                        {uploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                        Upload Statement
                    </button>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-primary)' }}></div>
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
                    <div className="ae-table-container" style={{ height: 'auto', maxHeight: 'none', overflowY: 'visible' }}>
                        <table className="ae-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>#</th>
                                    <th>Trans. Id</th>
                                    <th>Value Date</th>
                                    <th>Trans. Date</th>
                                    <th>Posted Date</th>
                                    <th>Ref. No.</th>
                                    <th>Transaction Remark</th>
                                    <th style={{ textAlign: 'right' }}>Withdrawal</th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}>Balance</th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>Actions</th>
                                </tr>
                                {showFilters && (
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                        <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.description}
                                                    onChange={e => setFilters({ ...filters, description: e.target.value })}
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
                                        <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.amount}
                                                    onChange={e => setFilters({ ...filters, amount: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                        <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                        <th style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                                            <button
                                                onClick={() => setFilters({
                                                    description: '', customer_name: '', amount: ''
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
                                    <tr>
                                        <td colSpan={11} style={{ textAlign: 'center', padding: '100px' }}>
                                            <RefreshCw className="animate-spin" style={{ margin: '0 auto' }} />
                                        </td>
                                    </tr>
                                ) : paginatedTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-tertiary)' }}>
                                            No transactions found in this category.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedTransactions.map((t, index) => (
                                        <tr key={t.id} style={{
                                            background: 'var(--bg-secondary)',
                                            transition: 'background 0.2s'
                                        }}>
                                            <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                            <td>{t.transaction_id || '—'}</td>
                                            <td>{t.value_date || '—'}</td>
                                            <td style={{ fontWeight: 600 }}>{t.transaction_date}</td>
                                            <td>{t.posted_date || '—'}</td>
                                            <td>{t.cheque_ref_no || '—'}</td>
                                            <td style={{ fontSize: '0.75rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.transaction_remarks || t.description}>
                                                {t.transaction_remarks || t.description}
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#E53E3E' }}>
                                                {parseFloat(t.withdrawal_amount || '0') > 0 ?
                                                    `$${parseFloat(t.withdrawal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#38A169', fontWeight: 600 }}>
                                                {parseFloat(t.deposit_amount || t.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {t.balance ? `$${parseFloat(t.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td style={{ textAlign: 'right', position: 'sticky', right: 0, background: selectedTransaction?.id === t.id ? '#FFF8F2' : 'white', boxShadow: '-2px 0 5px rgba(0,0,0,0.05)' }}>
                                                {activeTab === 'FOR_REVIEW' && (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => handleMatchClick(t)}
                                                            className="ae-btn-secondary"
                                                            style={{
                                                                padding: '6px 12px',
                                                                fontSize: '11px',
                                                                background: 'transparent',
                                                                border: '1px solid #718096',
                                                                color: '#718096',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'black';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.borderColor = 'black';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'transparent';
                                                                e.currentTarget.style.color = '#718096';
                                                                e.currentTarget.style.borderColor = '#718096';
                                                            }}
                                                        >
                                                            Match
                                                        </button>
                                                        <button
                                                            onClick={() => handleExclude(t)}
                                                            style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                                                        >
                                                            Exclude
                                                        </button>
                                                    </div>
                                                )}
                                                {activeTab === 'EXCLUDED' && (
                                                    <button
                                                        onClick={() => handleUndoExclude(t)}
                                                        className="ae-btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '11px' }}
                                                    >
                                                        Undo
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
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

                {selectedTransaction && (
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
                )}
            </div>
        </div>
    );
};

export default BankTransactionsDashboard;
