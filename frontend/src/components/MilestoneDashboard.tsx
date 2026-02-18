import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Download,
    Eye,
    Columns,
    ChevronDown,
    FileSpreadsheet,
    Filter
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import Pagination from './Pagination';

const ALL_COLUMNS = [
    { key: 'milestone_no', label: 'Milestone No' },
    { key: 'deal', label: 'Deal' },
    { key: 'sales_order', label: 'Sales Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'description', label: 'Description' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'invoice_no', label: 'Invoice No' }
];

interface MilestoneDashboardProps {
    onView?: (id: number) => void;
    onCreate?: () => void;
}

const MilestoneDashboard: React.FC<MilestoneDashboardProps> = ({ onView, onCreate }) => {
    const navigate = useNavigate();
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Filter States
    const [filters, setFilters] = useState({
        milestoneNo: '',
        dealId: '',
        soNumber: '',
        customerName: '',
        description: '',
        dueDateSearch: '',
        amountSearch: '',
        statusSearch: '',
        invoiceNo: '',
        status: 'PENDING',
        period: '',
        startDate: '',
        endDate: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const [isDownloading, setIsDownloading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('milestoneDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(col => col.key);
    });

    const columnMenuRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('milestoneDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchMilestones();
    }, []);

    const fetchMilestones = async () => {
        setLoading(true);
        try {
            const response = await api.get('/milestones/');
            setMilestones(response.data);
        } catch (error) {
            showNotification('Error fetching milestones', 'error');
        } finally {
            setLoading(false);
        }
    };


    const getExportQueryParams = () => {
        const params = new URLSearchParams();
        params.append('period', filters.period);
        if (filters.period === 'custom') {
            params.append('start_date', filters.startDate);
            params.append('end_date', filters.endDate);
        }
        if (filters.milestoneNo) params.append('milestone_no', filters.milestoneNo);
        if (filters.soNumber) params.append('so_number', filters.soNumber);
        if (filters.customerName) params.append('customer_name', filters.customerName);
        if (filters.status) params.append('status', filters.status);
        return params.toString();
    };

    const exportToCSV = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/milestones/export_report/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Milestones_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading CSV report:', error);
            showNotification('Failed to download CSV report.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const exportToExcel = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/milestones/export_excel/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Milestones_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading Excel report:', error);
            showNotification('Failed to download Excel report.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const filteredMilestones = useMemo(() => {
        return milestones.filter(m => {
            const matchesMilestone = (m.milestone_no || '').toLowerCase().includes(filters.milestoneNo.toLowerCase());
            const matchesDeal = (m.sales_order_details?.deal_id || '').toLowerCase().includes(filters.dealId.toLowerCase());
            const matchesSO = (m.sales_order_details?.so_number || '').toLowerCase().includes(filters.soNumber.toLowerCase());
            const matchesCustomer = (m.sales_order_details?.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesDescription = (m.description || '').toLowerCase().includes(filters.description.toLowerCase());
            const matchesDueDate = (new Date(m.due_date).toLocaleDateString() || '').toLowerCase().includes(filters.dueDateSearch.toLowerCase());
            const matchesAmount = (m.amount?.toString() || '').includes(filters.amountSearch);
            const matchesStatusSearch = (m.status || '').toLowerCase().includes(filters.statusSearch.toLowerCase());
            const matchesInvoice = (m.invoice_details?.invoice_no || '').toLowerCase().includes(filters.invoiceNo.toLowerCase());
            const matchesStatus = filters.status === '' || m.status === filters.status;

            // Date filtering
            let matchesDate = true;
            if (filters.period) {
                const milestoneDate = new Date(m.due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (filters.period === 'last_month') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                    matchesDate = milestoneDate >= firstOfLastMonth && milestoneDate <= lastOfLastMonth;
                } else if (filters.period === 'last_3_months') {
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                    matchesDate = milestoneDate >= threeMonthsAgo;
                } else if (filters.period === 'last_6_months') {
                    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                    matchesDate = milestoneDate >= sixMonthsAgo;
                } else if (filters.period === 'last_year') {
                    const startOfYear = new Date(today.getFullYear() - 1, 0, 1);
                    const endOfYear = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59);
                    matchesDate = milestoneDate >= startOfYear && milestoneDate <= endOfYear;
                } else if (filters.period === 'last_financial_year') {
                    let startYear = today.getFullYear();
                    if (today.getMonth() < 3) startYear -= 1;
                    startYear -= 1;
                    const startOfFY = new Date(startYear, 3, 1);
                    const endOfFY = new Date(startYear + 1, 2, 31, 23, 59, 59);
                    matchesDate = milestoneDate >= startOfFY && milestoneDate <= endOfFY;
                } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                    const start = new Date(filters.startDate);
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesDate = milestoneDate >= start && milestoneDate <= end;
                }
            }

            return matchesMilestone && matchesDeal && matchesSO && matchesCustomer &&
                matchesDescription && matchesDueDate && matchesAmount &&
                matchesStatusSearch && matchesInvoice && matchesStatus && matchesDate;
        }).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
    }, [milestones, filters]);

    const paginatedMilestones = useMemo(() => {
        return filteredMilestones.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredMilestones, currentPage]);

    const counts = useMemo(() => ({
        all: milestones.length,
        pending: milestones.filter(m => m.status === 'PENDING').length,
        invoiced: milestones.filter(m => m.status === 'INVOICED').length
    }), [milestones]);

    const statusFlow = [
        { label: `Pending(${counts.pending})`, value: 'PENDING', color: 'var(--theme-primary)' },
        { label: `Invoiced(${counts.invoiced})`, value: 'INVOICED', color: '#00C853' },
        { label: `All(${counts.all})`, value: '', color: 'var(--text-secondary)' }
    ];

    return (
        <div className="space-y-6">
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: 'none',
                overflowY: 'visible'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '20px',
                    borderBottom: '1px solid var(--border-primary)'
                }}>
                    {/* Status Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        {statusFlow.map((flow) => (
                            <button
                                key={flow.value}
                                onClick={() => setFilters({ ...filters, status: flow.value })}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: filters.status === flow.value ? 'var(--theme-primary)' : 'transparent',
                                    color: filters.status === flow.value ? 'white' : 'var(--text-secondary)',
                                    boxShadow: filters.status === flow.value ? '0 2px 8px rgba(187, 77, 0, 0.2)' : 'none'
                                }}
                            >
                                {flow.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Period:</span>
                            <select
                                className="ae-input"
                                value={filters.period}
                                onChange={e => setFilters({ ...filters, period: e.target.value })}
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 12px' }}
                            >
                                <option value="">All Time</option>
                                <option value="last_month">Last Month</option>
                                <option value="last_3_months">3 Months</option>
                                <option value="last_year">Last Year</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        {filters.period === 'custom' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="date" className="ae-input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px', padding: '0 8px' }} />
                                <input type="date" className="ae-input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px', padding: '0 8px' }} />
                            </div>
                        )}

                        <div style={{ position: 'relative' }} ref={exportMenuRef}>
                            <button
                                className="ae-btn-secondary"
                                disabled={isDownloading}
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#059669' }} /> CSV Report
                                    </button>
                                    <button
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#2563EB' }} /> Excel Report
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ position: 'relative' }}>
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

                        <div style={{ position: 'relative' }} ref={columnMenuRef}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: 'var(--text-secondary)',
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
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                    border: '1px solid #E2E8F0',
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
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--ae-blue)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setVisibleColumns([])}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-tertiary)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                                                userSelect: 'none',
                                                transition: 'background 0.2s',
                                                borderBottom: '1px solid var(--border-primary)'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
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
                                                    style={{
                                                        cursor: 'pointer',
                                                        width: '16px',
                                                        height: '16px',
                                                        accentColor: 'var(--theme-primary)'
                                                    }}
                                                />
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
                    <table className="ae-table">
                        <thead>
                            <tr>
                                {visibleColumns.includes('milestone_no') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Milestone No</th>}
                                {visibleColumns.includes('deal') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Deal</th>}
                                {visibleColumns.includes('sales_order') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Sales Order</th>}
                                {visibleColumns.includes('customer') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Customer</th>}
                                {visibleColumns.includes('description') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Description</th>}
                                {visibleColumns.includes('due_date') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Due Date</th>}
                                {visibleColumns.includes('amount') && <th style={{ height: '40px', textAlign: 'right', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Amount</th>}
                                {visibleColumns.includes('status') && <th style={{ height: '40px', textAlign: 'center', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Status</th>}
                                {visibleColumns.includes('invoice_no') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)' }}>Invoice No</th>}
                                <th style={{ height: '40px', textAlign: 'center', top: 0, whiteSpace: 'nowrap', zIndex: 12, width: '130px', backgroundColor: 'var(--bg-secondary)' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    {visibleColumns.includes('milestone_no') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.milestoneNo}
                                                    onChange={e => setFilters({ ...filters, milestoneNo: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('deal') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.dealId}
                                                    onChange={e => setFilters({ ...filters, dealId: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('sales_order') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.soNumber}
                                                    onChange={e => setFilters({ ...filters, soNumber: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('customer') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.customerName}
                                                    onChange={e => setFilters({ ...filters, customerName: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('description') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
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
                                    )}
                                    {visibleColumns.includes('due_date') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.dueDateSearch}
                                                    onChange={e => setFilters({ ...filters, dueDateSearch: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('amount') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.amountSearch}
                                                    onChange={e => setFilters({ ...filters, amountSearch: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('status') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.statusSearch}
                                                    onChange={e => setFilters({ ...filters, statusSearch: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.includes('invoice_no') && (
                                        <th style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.invoiceNo}
                                                    onChange={e => setFilters({ ...filters, invoiceNo: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    <th style={{ textAlign: 'center', top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                        <button
                                            onClick={() => setFilters({
                                                milestoneNo: '',
                                                dealId: '',
                                                soNumber: '',
                                                customerName: '',
                                                description: '',
                                                dueDateSearch: '',
                                                amountSearch: '',
                                                statusSearch: '',
                                                invoiceNo: '',
                                                status: 'PENDING',
                                                period: '',
                                                startDate: '',
                                                endDate: ''
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
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}>Loading...</td></tr>
                            ) : paginatedMilestones.length === 0 ? (
                                <tr><td colSpan={visibleColumns.length + 1} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>No milestones found.</td></tr>
                            ) : (
                                paginatedMilestones.map((m) => (
                                    <tr key={m.id}>
                                        {visibleColumns.includes('milestone_no') && <td style={{ fontWeight: 700, color: 'var(--theme-primary)', fontFamily: 'monospace' }}>{m.milestone_no}</td>}
                                        {visibleColumns.includes('deal') && (
                                            <td>
                                                {m.sales_order_details?.deal ? (
                                                    <span
                                                        onClick={() => navigate(`/deal?id=${m.sales_order_details.deal}`)}
                                                        style={{ fontWeight: 600, color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        {m.sales_order_details.deal_id}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        )}
                                        {visibleColumns.includes('sales_order') && <td style={{ fontWeight: 700, color: 'var(--ae-blue)', fontSize: '0.8rem' }}>{m.sales_order_details?.so_number}</td>}
                                        {visibleColumns.includes('customer') && <td style={{ fontWeight: 500 }}>{m.sales_order_details?.customer_name}</td>}
                                        {visibleColumns.includes('description') && <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.description || '—'}>{m.description}</td>}
                                        {visibleColumns.includes('due_date') && <td style={{ fontWeight: 600 }}>{new Date(m.due_date).toLocaleDateString()}</td>}
                                        {visibleColumns.includes('amount') && <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a1f36' }}>${parseFloat(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                        {visibleColumns.includes('status') && <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                background: m.status === 'INVOICED' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(187, 77, 0, 0.1)',
                                                color: m.status === 'INVOICED' ? '#00C853' : 'var(--theme-primary)'
                                            }}>
                                                {m.status}
                                            </span>
                                        </td>}
                                        {visibleColumns.includes('invoice_no') && <td style={{ fontWeight: 700, color: '#00C853' }}>{m.invoice_details?.invoice_no || '—'}</td>}
                                        <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                            <button
                                                onClick={() => onView && onView(m.id)}
                                                style={{ padding: '6px', color: 'var(--ae-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                title="View Milestone"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const response = await api.get(`/milestones/${m.id}/download_pdf/`, {
                                                            responseType: 'blob'
                                                        });
                                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.setAttribute('download', `milestone_${m.milestone_no}.pdf`);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        link.parentNode?.removeChild(link);
                                                        window.URL.revokeObjectURL(url);
                                                    } catch (error) {
                                                        console.error('Error downloading PDF', error);
                                                        showNotification('Error downloading PDF', 'error');
                                                    }
                                                }}
                                                style={{ padding: '6px', color: 'var(--ae-orange)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                title="Download Milestone PDF"
                                            >
                                                <Download size={18} />
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
                    totalItems={filteredMilestones.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default MilestoneDashboard;
