import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, XCircle, RefreshCw, Upload, Cloud } from 'lucide-react';
import api from '../api';

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
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'FOR_REVIEW' | 'CATEGORIZED' | 'EXCLUDED'>('FOR_REVIEW');
    const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
    const [receiptsForMatching, setReceiptsForMatching] = useState<any[]>([]);
    const [selectedReceipts, setSelectedReceipts] = useState<number[]>([]);
    const [matchingLoading, setMatchingLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    useEffect(() => {
        if (selectedTransaction) {
            // This useEffect is now only for reacting to selectedTransaction changes,
            // but fetchReceiptsForMatching is called directly in handleMatchClick
            // because reconciliationDate is no longer a filter for fetching receipts.
            // If we wanted to refetch receipts when selectedTransaction changes,
            // this useEffect would be `useEffect(() => { if (selectedTransaction) { fetchReceiptsForMatching(); } }, [selectedTransaction]);`
            // However, the instruction implies removing the dependency on date and the manual call in handleMatchClick handles the initial fetch.
            // So, this useEffect can be simplified or removed if its only purpose was to react to filterDate.
            // For now, keeping it as per instruction's implied change.
        }
    }, []); // No dependency on date anymore

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

    // ... (handleSync, handleUploadClick, handleFileChange) ...

    const fetchReceiptsForMatching = async () => {
        try {
            let url = '/finance/receipt-vouchers/?status=UNRECONCILED';
            // No filtering by date
            const response = await api.get(url);
            setReceiptsForMatching(response.data);
        } catch (error) {
            console.error('Error fetching receipts', error);
        }
    };

    const handleMatchClick = (transaction: BankTransaction) => {
        setSelectedTransaction(transaction);
        setSelectedReceipts([]);
        // fitler logic handled by manual call below
        // fetchReceiptsForMatching called by useEffect because selectedTransaction changes (actually useEffect above only watches filterDate, I should adding selectedTransaction to it or manual call)
        // Better: Manual call in handleMatchClick is fine, but if I want useEffect to trigger on filterDate change, I need logic.
        // Let's rely on the manual call here for initial load, and useEffect for filter updates.
        // Wait, handleMatchClick sets selectedTransaction. If I put `fetchReceiptsForMatching` in useEffect([selectedTransaction, filterDate]), it handles both.
        // Let's do that.
        fetchReceiptsForMatching();
    };

    // Actually, to avoid complexity with previous edits, I'll keep it simple:
    // 1. Add filterDate state.
    // 2. Update fetchReceiptsForMatching.
    // 3. Add useEffect([filterDate]) to refetch if selectedTransaction is active.

    // In handleMatchClick, I call fetchReceiptsForMatching(), which uses the *current* filterDate state.
    // But setFilterDate('') is async. So calling fetchReceiptsForMatching immediately after might use old date.
    // Better to use useEffect for all fetching logic related to matching?
    // Let's change handleMatchClick to just set transaction and reset date.
    // And add another useEffect.

    /* 
    useEffect(() => {
        if (selectedTransaction) {
            fetchReceiptsForMatching();
        }
    }, [selectedTransaction, filterDate]);
    */
    // I will implement this logic.

    const handleSync = async () => {
        setSyncing(true);
        try {
            const response = await api.post('/finance/bank-transactions/sync/');
            alert(`Synced ${response.data.count} transactions successfully`);
            fetchTransactions();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error syncing transactions');
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

        setUploading(true);
        try {
            const response = await api.post('/finance/bank-transactions/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`Uploaded ${response.data.count} transactions successfully`);
            fetchTransactions();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error uploading file');
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
            alert(`Selected receipts total (${totalSelected}) must match transaction amount (${selectedTransaction.amount_received})`);
            return;
        }

        setMatchingLoading(true);
        try {
            await api.post(`/finance/bank-transactions/${selectedTransaction.id}/match/`, {
                receipt_ids: selectedReceipts,
                reconciliation_date: selectedTransaction.transaction_date
            });
            alert('Matched successfully');
            setSelectedTransaction(null);
            fetchTransactions();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error matching transaction');
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

    const filteredTransactions = transactions.filter(t => t.status === activeTab);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
            />

            {/* Header */}
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
                            <CreditCard size={24} color="#FF6B00" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FF6B00', margin: 0 }}>
                                Bank Transactions
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                Review and reconcile bank entries
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="ae-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                            {syncing ? <RefreshCw className="animate-spin" size={18} /> : <Cloud size={18} />}
                            Sync Bank Feed
                        </button>
                        <button
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="ae-btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {uploading ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                            Upload Statement
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'white',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                width: 'fit-content'
            }}>
                {(['FOR_REVIEW', 'CATEGORIZED', 'EXCLUDED'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            background: activeTab === tab ? '#FF6B00' : 'transparent',
                            color: activeTab === tab ? 'white' : '#718096',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedTransaction ? '1fr 400px' : '1fr', gap: '20px' }}>
                {/* Main Table */}
                <div style={{ overflowX: 'auto', border: '1px solid #E0E6ED', borderRadius: '12px' }}>
                    <table className="ae-table" style={{ minWidth: '1500px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>S.N.</th>
                                <th>Tran. Id</th>
                                <th>Value Date</th>
                                <th>Transaction Date</th>
                                <th>Transaction Posted Date</th>
                                <th>Cheque. No./Ref. No.</th>
                                <th>Transaction Remarks</th>
                                <th>Withdrawal Amt (INR)</th>
                                <th>Deposit Amt (INR)</th>
                                <th>Balance (INR)</th>
                                <th style={{ textAlign: 'right', position: 'sticky', right: 0, background: '#F7FAFC', zIndex: 1 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={11} style={{ textAlign: 'center', padding: '100px' }}>
                                        <RefreshCw className="animate-spin" style={{ margin: '0 auto' }} />
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={11} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>
                                        No transactions found in this category.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t, index) => (
                                    <tr key={t.id} style={{
                                        background: selectedTransaction?.id === t.id ? '#FFF8F2' : 'transparent',
                                        transition: 'background 0.2s'
                                    }}>
                                        <td style={{ color: '#718096', fontSize: '0.8rem' }}>{index + 1}</td>
                                        <td>{t.transaction_id || '—'}</td>
                                        <td>{t.value_date || '—'}</td>
                                        <td style={{ fontWeight: 600 }}>{t.transaction_date}</td>
                                        <td>{t.posted_date || '—'}</td>
                                        <td>{t.cheque_ref_no || '—'}</td>
                                        <td style={{ fontSize: '0.85rem', color: '#4A5568', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.transaction_remarks || t.description}>
                                            {t.transaction_remarks || t.description}
                                        </td>
                                        <td style={{ color: '#E53E3E' }}>
                                            {parseFloat(t.withdrawal_amount || '0') > 0 ?
                                                `$${parseFloat(t.withdrawal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                        </td>
                                        <td style={{ color: '#38A169', fontWeight: 600 }}>
                                            {parseFloat(t.deposit_amount || t.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>
                                            {t.balance ? `$${parseFloat(t.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', position: 'sticky', right: 0, background: selectedTransaction?.id === t.id ? '#FFF8F2' : 'white', boxShadow: '-2px 0 5px rgba(0,0,0,0.05)' }}>
                                            {activeTab === 'FOR_REVIEW' && (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleMatchClick(t)}
                                                        className="ae-btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '11px' }}
                                                    >
                                                        Match
                                                    </button>
                                                    <button
                                                        onClick={() => handleExclude(t)}
                                                        style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer' }}
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

                {/* Matching Panel */}
                {selectedTransaction && (
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid #E0E6ED',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        height: 'fit-content',
                        position: 'sticky',
                        top: '20px'
                    }}>
                        <div style={{ padding: '20px', background: '#F7FAFC', borderBottom: '1px solid #E0E6ED' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D3748' }}>Match Transaction</h3>
                                <button onClick={() => setSelectedTransaction(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <XCircle size={20} color="#718096" />
                                </button>
                            </div>
                            <div style={{ background: '#FFF8F2', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,107,0,0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>Amount to Match:</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FF6B00' }}>
                                            ${parseFloat(selectedTransaction.amount_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>Tx Date:</div>
                                        <div style={{ fontWeight: 700, color: '#2D3748' }}>{selectedTransaction.transaction_date}</div>
                                        {selectedTransaction.value_date && selectedTransaction.value_date !== selectedTransaction.transaction_date && (
                                            <>
                                                <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '4px' }}>Value Date:</div>
                                                <div style={{ fontWeight: 700, color: '#2D3748' }}>{selectedTransaction.value_date}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px', flex: 1, maxHeight: '400px', overflowY: 'auto' }}>

                            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: '#4A5568' }}>
                                Select Unreconciled Receipts:
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
                                            borderColor: selectedReceipts.includes(r.id) ? '#FF6B00' : '#E0E6ED',
                                            background: selectedReceipts.includes(r.id) ? '#FFF8F2' : 'white',
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
                                                style={{ accentColor: '#FF6B00' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.receipt_no}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#718096', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span>Customer: {r.customer_name}</span>
                                                    <span style={{ fontWeight: 600, color: '#4A5568' }}>Receipt Date: {r.payment_date}</span>
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
