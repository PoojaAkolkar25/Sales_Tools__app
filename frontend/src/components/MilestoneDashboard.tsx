import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Download,
    Eye,
    Columns,
    ChevronDown,
    FileSpreadsheet,
    FileText,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';

const ALL_COL_CONFIG = [
    { key: 'milestone_no', label: 'Milestone No', shortLabel: 'MLST. NO' },
    { key: 'deal', label: 'Deal', shortLabel: 'DEAL' },
    { key: 'sales_order', label: 'Sales Order', shortLabel: 'S.O.' },
    { key: 'customer', label: 'Customer', shortLabel: 'CUST.' },
    { key: 'description', label: 'Description', shortLabel: 'DESC.' },
    { key: 'due_date', label: 'Due Date', shortLabel: 'DATE' },
    { key: 'amount', label: 'Amount', shortLabel: 'AMT.' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' },
    { key: 'invoice_no', label: 'Invoice No', shortLabel: 'INV. NO' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    milestone_no: 55,
    deal: 50,
    sales_order: 50,
    customer: 55,
    description: 55,
    due_date: 50,
    amount: 45,
    status: 35,
    invoice_no: 55,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    milestone_no: 95,
    deal: 75,
    sales_order: 90,
    customer: 110,
    description: 130,
    due_date: 75,
    amount: 85,
    status: 75,
    invoice_no: 95
};

const MAX_COL_WIDTHS: Record<string, number> = {
    customer: 250,
    description: 350,
    milestone_no: 150,
    deal: 120,
    sales_order: 150,
    due_date: 120,
    amount: 150,
    status: 120,
    invoice_no: 150,
    actions: 120
};

interface MilestoneDashboardProps {
    onView?: (id: number) => void;
    onCreate?: () => void;
}

const MilestoneDashboard: React.FC<MilestoneDashboardProps> = ({ onView }) => {
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
    const [showFilters] = useState(true);

    const [isDownloading, setIsDownloading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('milestoneDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(col => {
            defaults[col.key] = FULL_LABEL_WIDTHS[col.key] || 150;
        });
        defaults['actions'] = 120;
        return defaults;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('milestoneDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.map(col => col.key);
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('milestoneDashboard_colWidths', JSON.stringify(colWidths));
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

    const exportToPDF = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/milestones/export_pdf/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Milestones_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading PDF report:', error);
            showNotification('Failed to download PDF report.', 'error');
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
            const matchesDueDate = (m.due_date ? formatToAppDate(m.due_date) : '').toLowerCase().includes(filters.dueDateSearch.toLowerCase());
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
                overflow: 'visible',
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
                    padding: '12px 16px',
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
                                    cursor: 'pointer',
                                    border: `1px solid ${showExportMenu ? 'rgba(255, 107, 0, 0.5)' : 'var(--border-primary)'}`,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = showExportMenu ? 'rgba(255, 107, 0, 0.5)' : 'var(--border-primary)';
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileText size={16} style={{ color: '#DC2626' }} /> PDF Report
                                    </button>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#2563EB' }} /> Excel Report
                                    </button>
                                </div>
                            )}
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
                                    cursor: 'pointer',
                                    border: `1px solid ${showColumnMenu ? 'rgba(255, 107, 0, 0.5)' : 'var(--border-primary)'}`,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = showColumnMenu ? 'rgba(255, 107, 0, 0.5)' : 'var(--border-primary)';
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
                                            onClick={() => setVisibleColumns(ALL_COL_CONFIG.map(c => c.key))}
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
                                        {ALL_COL_CONFIG.map(col => (
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
                <div style={{ position: 'relative' }}>
                    {/* Left scroll button */}
                    <button
                        onClick={() => tableScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                        style={{
                            position: 'absolute',
                            left: '-18px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 30,
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                        title="Scroll left"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {/* Right scroll button */}
                    <button
                        onClick={() => tableScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                        style={{
                            position: 'absolute',
                            right: '-18px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 30,
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                        title="Scroll right"
                    >
                        <ChevronRight size={18} />
                    </button>

                    <div ref={tableScrollRef} style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '0', border: '1px solid var(--border-primary)' }}>
                        <table className="ae-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                                <col style={{ width: `${getColWidth('actions')}px` }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{
                                            position: 'relative',
                                            backgroundColor: 'var(--ae-table-header-bg)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            userSelect: 'none',
                                            paddingRight: '20px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)',
                                            zIndex: 12,
                                            top: 0,
                                            color: 'var(--text-secondary)',
                                            textAlign: (col.key === 'amount') ? 'right' : (col.key === 'status') ? 'center' : 'left'
                                        }}>
                                            <span title={col.label}>
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
                                        height: '40px',
                                        whiteSpace: 'nowrap',
                                        top: 0,
                                        color: 'var(--text-secondary)',
                                        borderBottom: '1px solid var(--border-secondary)'
                                    }}>Actions</th>
                                </tr>
                                {showFilters && (
                                    <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                        {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                            <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                                <div className="ae-input-group" style={{ margin: 0 }}>
                                                    <Search className="ae-search-icon" size={12} />
                                                    <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={(() => {
                                                            switch (col.key) {
                                                                case 'milestone_no': return filters.milestoneNo;
                                                                case 'deal': return filters.dealId;
                                                                case 'sales_order': return filters.soNumber;
                                                                case 'customer': return filters.customerName;
                                                                case 'description': return filters.description;
                                                                case 'due_date': return filters.dueDateSearch;
                                                                case 'amount': return filters.amountSearch;
                                                                case 'status': return filters.statusSearch;
                                                                case 'invoice_no': return filters.invoiceNo;
                                                                default: return '';
                                                            }
                                                        })()}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            switch (col.key) {
                                                                case 'milestone_no': setFilters({ ...filters, milestoneNo: val }); break;
                                                                case 'deal': setFilters({ ...filters, dealId: val }); break;
                                                                case 'sales_order': setFilters({ ...filters, soNumber: val }); break;
                                                                case 'customer': setFilters({ ...filters, customerName: val }); break;
                                                                case 'description': setFilters({ ...filters, description: val }); break;
                                                                case 'due_date': setFilters({ ...filters, dueDateSearch: val }); break;
                                                                case 'amount': setFilters({ ...filters, amountSearch: val }); break;
                                                                case 'status': setFilters({ ...filters, statusSearch: val }); break;
                                                                case 'invoice_no': setFilters({ ...filters, invoiceNo: val }); break;
                                                            }
                                                        }}
                                                        style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                    />
                                                </div>
                                            </th>
                                        ))}
                                        <th style={{
                                            textAlign: 'center',
                                            backgroundColor: 'var(--ae-filter-row-bg)',
                                            borderBottom: '1px solid var(--border-secondary)'
                                        }}>
                                            <button
                                                onClick={() => setFilters({
                                                    milestoneNo: '', dealId: '', soNumber: '', customerName: '',
                                                    description: '', dueDateSearch: '', amountSearch: '', statusSearch: '',
                                                    invoiceNo: '', status: 'PENDING', period: '', startDate: '', endDate: ''
                                                })}
                                                style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px' }}>
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
                                            {visibleColumns.map(key => {
                                                const cellStyle = {
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.8rem'
                                                } as React.CSSProperties;

                                                switch (key) {
                                                    case 'milestone_no':
                                                        return (
                                                            <td key={key} style={{ ...cellStyle, fontWeight: 700, color: 'var(--theme-primary)', fontFamily: 'monospace' }}>
                                                                <span
                                                                    onClick={() => onView && onView(m.id)}
                                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                >
                                                                    {m.milestone_no}
                                                                </span>
                                                            </td>
                                                        );
                                                    case 'deal':
                                                        return <td key={key} style={cellStyle}>
                                                            {m.sales_order_details?.deal ? (
                                                                <span
                                                                    onClick={() => navigate(`/deal?id=${m.sales_order_details.deal}`)}
                                                                    style={{ fontWeight: 600, color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                                >
                                                                    {m.sales_order_details.deal_id}
                                                                </span>
                                                            ) : '—'}
                                                        </td>;
                                                    case 'sales_order':
                                                        return (
                                                            <td key={key} style={{ ...cellStyle, fontWeight: 700, color: 'var(--ae-blue)', fontSize: '0.8rem' }}>
                                                                {m.sales_order ? (
                                                                    <span
                                                                        onClick={() => navigate(`/sales-order?id=${m.sales_order}`)}
                                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                    >
                                                                        {m.sales_order_details?.so_number}
                                                                    </span>
                                                                ) : (m.sales_order_details?.so_number || '—')}
                                                            </td>
                                                        );
                                                    case 'customer':
                                                        return <td key={key} style={{ ...cellStyle, fontWeight: 500 }}>{m.sales_order_details?.customer_name}</td>;
                                                    case 'description':
                                                        return <td key={key} style={cellStyle} title={m.description || '—'}>{m.description}</td>;
                                                    case 'due_date':
                                                        return <td key={key} style={{ ...cellStyle, fontWeight: 600 }}>{m.due_date ? formatToAppDate(m.due_date) : '---'}</td>;
                                                    case 'amount':
                                                        return <td key={key} style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#1a1f36' }}>${parseFloat(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                    case 'status':
                                                        return <td key={key} style={{ ...cellStyle, textAlign: 'center' }}>
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
                                                        </td>;
                                                    case 'invoice_no':
                                                        return (
                                                            <td key={key} style={{ ...cellStyle, fontWeight: 700, color: '#00C853' }}>
                                                                {m.invoice ? (
                                                                    <span
                                                                        onClick={() => navigate(`/invoice?id=${m.invoice}`)}
                                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                    >
                                                                        {m.invoice_details?.invoice_no}
                                                                    </span>
                                                                ) : (m.invoice_details?.invoice_no || '—')}
                                                            </td>
                                                        );
                                                    default:
                                                        return null;
                                                }
                                            })}
                                            <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => onView && onView(m.id)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        background: 'rgba(255,107,0,0.08)',
                                                        color: 'var(--theme-primary)',
                                                        border: '1px solid rgba(255,107,0,0.25)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
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
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        background: 'rgba(255,107,0,0.08)',
                                                        color: 'var(--theme-primary)',
                                                        border: '1px solid rgba(255,107,0,0.25)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
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
