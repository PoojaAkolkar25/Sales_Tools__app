import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    RefreshCcw,
    Lock,
    CheckCircle,
    Plus,
    BarChart3,
    AlertCircle,
    Search,
    TrendingUp,
    Calculator
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface RevenueScheduleTableProps {
    contractId: number;
    onBack: () => void;
}

interface ScheduleEntry {
    id: number;
    period_month: string;
    amount: string;
    amount_inr?: number;
    is_posted: boolean;
    gl_entry_reference: string;
}

interface ContractDetails {
    id: number;
    contract_id: string;
    revenue_type: string;
    revenue_type_display: string;
    customer_name: string;
    deal_no: string;
    total_amount: string;
    total_amount_inr?: number;
    currency: string;
}

const RevenueScheduleTable: React.FC<RevenueScheduleTableProps> = ({ contractId, onBack }) => {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
    const [contract, setContract] = useState<ContractDetails | null>(null);
    const [showInputModal, setShowInputModal] = useState(false);
    const [inputType, setInputType] = useState<'consumption' | 'progress' | null>(null);

    // Input fields for modals
    const [inputValue, setInputValue] = useState('');
    const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);

    const [showFilters] = useState(true);
    const [filters, setFilters] = useState({
        period_month: '',
        amount: '',
        status: '',
        gl_reference: ''
    });

    useEffect(() => {
        fetchSchedules();
        fetchContractDetails();
    }, [contractId]);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/revenue/schedules/?contract=${contractId}`);
            setSchedules(response.data);
        } catch (error) {
            showNotification('Error fetching schedules', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchContractDetails = async () => {
        try {
            const response = await api.get(`/revenue/contracts/${contractId}/`);
            setContract(response.data);
        } catch (error) {
            console.error('Error fetching contract', error);
        }
    };

    const postToGL = async (scheduleId: number) => {
        try {
            showNotification('Posting to General Ledger...', 'info');
            await api.post(`/revenue/schedules/${scheduleId}/post_to_gl/`);
            showNotification('Successfully posted to GL', 'success');
            fetchSchedules();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error posting to GL', 'error');
        }
    };

    const handleInputSubmit = async () => {
        if (!inputValue || !inputDate) return;

        try {
            if (inputType === 'consumption') {
                await api.post('/revenue/consumption/', {
                    contract: contractId,
                    consumption_date: inputDate,
                    billed_amount: inputValue
                });
                showNotification('Consumption record added', 'success');
            } else {
                await api.post('/revenue/progress/', {
                    contract: contractId,
                    progress_date: inputDate,
                    completion_percentage: inputValue
                });
                showNotification('Progress record added', 'success');
            }
            setShowInputModal(false);
            setInputValue('');
            // Trigger re-computation of schedule
            showNotification('Recomputing schedule based on new data...', 'info');
            await api.post(`/revenue/contracts/${contractId}/compute_schedule/`);
            fetchSchedules();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error saving input', 'error');
        }
    };

    const totalRecognized = useMemo(() => {
        return schedules.reduce((sum: number, s: ScheduleEntry) => sum + Number(s.amount || 0), 0);
    }, [schedules]);

    const totalRecognizedINR = useMemo(() => {
        return schedules.reduce((sum: number, s: ScheduleEntry) => sum + Number(s.amount_inr || 0), 0);
    }, [schedules]);

    return (
        <div style={{ background: 'var(--bg-primary)', padding: '0', margin: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 40, background: 'var(--bg-primary)', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={onBack} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Revenue Schedule</h2>
                        {contract && (
                            <p style={{ color: 'var(--text-secondary)', fontWeight: 500, margin: 0, fontSize: '0.875rem' }}>{contract.contract_id} • {contract.customer_name}</p>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {contract?.revenue_type === 'LICENSE_CONSUMPTION' && (
                        <button
                            onClick={() => { setInputType('consumption'); setShowInputModal(true); }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"
                        >
                            <Plus size={18} /> Record Consumption
                        </button>
                    )}
                    {contract?.revenue_type === 'PS_FIXED_BID' && (
                        <button
                            onClick={() => { setInputType('progress'); setShowInputModal(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
                        >
                            <BarChart3 size={18} /> Update Progress %
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Card */}
            {/* Summary Card */}
            <div className="ae-grid-4" style={{ padding: '0 32px' }}>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Total Contract Value</div>
                            <div className="ae-card-value">{contract ? `${Number(contract.total_amount).toLocaleString()} ${contract.currency}` : '---'}</div>
                            {contract?.total_amount_inr && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 600 }}>₹{parseFloat(contract.total_amount_inr.toString()).toLocaleString()}</div>
                            )}
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(0, 102, 204, 0.05)', color: 'var(--ae-blue)' }}><BarChart3 size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Total Recognized to Date</div>
                            <div className="ae-card-value" style={{ color: 'var(--theme-accent)' }}>{contract ? `${totalRecognized.toLocaleString()} ${contract.currency}` : '---'}</div>
                            {totalRecognizedINR > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 600 }}>₹{totalRecognizedINR.toLocaleString()}</div>
                            )}
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(0, 200, 83, 0.05)', color: 'var(--ae-green)' }}><TrendingUp size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Pending Recognition</div>
                            <div className="ae-card-value" style={{ color: 'var(--theme-primary)' }}>{contract ? `${(Number(contract.total_amount) - totalRecognized).toLocaleString()} ${contract.currency}` : '---'}</div>
                            {contract?.total_amount_inr && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 600 }}>₹{(Number(contract.total_amount_inr) - totalRecognizedINR).toLocaleString()}</div>
                            )}
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(187, 77, 0, 0.05)', color: 'var(--ae-orange)' }}><Calculator size={16} /></div>
                    </div>
                </div>
            </div>

            {/* Schedule Table */}
            <div style={{ padding: '0 32px 32px 32px' }}>
                <div className="ae-table-wrapper" style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                    <table className="ae-table compact-table" style={{ tableLayout: 'auto', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '12px 16px' }}>Period (Month)</th>
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', textAlign: 'right', padding: '12px 16px' }}>Recognized Amount</th>
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', textAlign: 'right', padding: '12px 16px' }}>Amount (INR)</th>
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', textAlign: 'center', padding: '12px 16px' }}>GL Status</th>
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '12px 16px' }}>GL Reference</th>
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-secondary)', textAlign: 'center', padding: '12px 16px' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px' }}>
                                        <div className="ae-input-group" style={{ margin: 0 }}>
                                            <Search className="ae-search-icon" size={12} />
                                            <input className="ae-input" placeholder="Filter..." value={filters.period_month} onChange={e => setFilters({ ...filters, period_month: e.target.value })} style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }} />
                                        </div>
                                    </th>
                                    <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px' }}>
                                        <div className="ae-input-group" style={{ margin: 0 }}>
                                            <Search className="ae-search-icon" size={12} />
                                            <input className="ae-input" placeholder="Filter..." value={filters.amount} onChange={e => setFilters({ ...filters, amount: e.target.value })} style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }} />
                                        </div>
                                    </th>
                                    <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px' }}></th>
                                    <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px' }}>
                                        <div className="ae-input-group" style={{ margin: 0 }}>
                                            <Search className="ae-search-icon" size={12} />
                                            <input className="ae-input" placeholder="Filter..." value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }} />
                                        </div>
                                    </th>
                                    <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', padding: '4px' }}>
                                        <div className="ae-input-group" style={{ margin: 0 }}>
                                            <Search className="ae-search-icon" size={12} />
                                            <input className="ae-input" placeholder="Filter..." value={filters.gl_reference} onChange={e => setFilters({ ...filters, gl_reference: e.target.value })} style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }} />
                                        </div>
                                    </th>
                                    <th style={{ textAlign: 'center', backgroundColor: 'var(--ae-filter-row-bg)', borderBottom: '1px solid var(--border-secondary)', padding: '4px' }}>
                                        <button
                                            onClick={() => setFilters({ period_month: '', amount: '', status: '', gl_reference: '' })}
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
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '100px' }}><RefreshCcw className="animate-spin text-orange-500" style={{ margin: '0 auto' }} /></td></tr>
                            ) : schedules.filter((entry: ScheduleEntry) => {
                                const periodMonthStr = entry.period_month ? new Date(entry.period_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';
                                const amountStr = Number(entry.amount || 0).toLocaleString();
                                const statusStr = entry.is_posted ? 'Posted' : 'Pending';
                                const refStr = entry.gl_entry_reference || 'NR-PENDING';

                                return periodMonthStr.toLowerCase().includes(filters.period_month.toLowerCase()) &&
                                    amountStr.toLowerCase().includes(filters.amount.toLowerCase()) &&
                                    statusStr.toLowerCase().includes(filters.status.toLowerCase()) &&
                                    refStr.toLowerCase().includes(filters.gl_reference.toLowerCase());
                            }).length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>No recognized revenue entries match the filters.</td></tr>
                            ) : (
                                schedules.filter((entry: ScheduleEntry) => {
                                    const periodMonthStr = entry.period_month ? new Date(entry.period_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';
                                    const amountStr = Number(entry.amount || 0).toLocaleString();
                                    const statusStr = entry.is_posted ? 'Posted' : 'Pending';
                                    const refStr = entry.gl_entry_reference || 'NR-PENDING';

                                    return periodMonthStr.toLowerCase().includes(filters.period_month.toLowerCase()) &&
                                        amountStr.toLowerCase().includes(filters.amount.toLowerCase()) &&
                                        statusStr.toLowerCase().includes(filters.status.toLowerCase()) &&
                                        refStr.toLowerCase().includes(filters.gl_reference.toLowerCase());
                                }).map((entry: ScheduleEntry) => (
                                    <tr key={entry.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {new Date(entry.period_month || '').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                            {Number(entry.amount || 0).toLocaleString()} {contract?.currency}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--theme-primary)' }}>
                                            ₹{parseFloat(entry.amount_inr?.toString() || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {entry.is_posted ? (
                                                <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: '#E6F7ED', color: '#38A169', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle size={14} /> Posted
                                                </span>
                                            ) : (
                                                <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: '#FFF4E5', color: '#DD6B20', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <AlertCircle size={14} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {entry.gl_entry_reference || 'NR-PENDING'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {!entry.is_posted ? (
                                                <button
                                                    onClick={() => postToGL(entry.id)}
                                                    className="ae-btn-primary"
                                                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                                >
                                                    Post to GL
                                                </button>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }} title="Period Locked">
                                                    <Lock size={16} />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Input Modal */}
            {showInputModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '450px', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ padding: '32px' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px', margin: 0 }}>
                                {inputType === 'consumption' ? 'Record Usage' : 'Update Project Progress'}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '24px', fontSize: '0.875rem' }}>
                                {inputType === 'consumption'
                                    ? 'Enter the billed amount for the specific consumption period.'
                                    : 'Enter the cumulative completion percentage for this project.'}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Reference Date</label>
                                    <input
                                        type="date"
                                        value={inputDate}
                                        onChange={(e) => setInputDate(e.target.value)}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-secondary)', outline: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        {inputType === 'consumption' ? 'Billed Amount' : 'Cumulative Progress (%)'}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        {inputType === 'consumption' && (
                                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                                {contract?.currency}
                                            </div>
                                        )}
                                        <input
                                            type="number"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', paddingLeft: inputType === 'consumption' ? '56px' : '16px', borderRadius: '12px', border: '1px solid var(--border-secondary)', outline: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'inherit' }}
                                            placeholder={inputType === 'consumption' ? '0.00' : '0-100'}
                                        />
                                        {inputType === 'progress' && (
                                            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 700 }}>%</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                <button
                                    onClick={() => setShowInputModal(false)}
                                    style={{ flex: 1, padding: '12px 24px', borderRadius: '12px', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-accent)', border: 'none', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInputSubmit}
                                    style={{ flex: 1, padding: '12px 24px', borderRadius: '12px', fontWeight: 700, color: 'white', background: 'var(--theme-primary)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                                >
                                    Save Entry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevenueScheduleTable;
